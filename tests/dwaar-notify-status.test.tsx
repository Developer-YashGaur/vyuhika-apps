import { describe, expect, it, vi } from "vitest";
import { render } from "@react-email/components";
import StatusEmail from "@/components/emails/StatusEmail";
import { sendStatusEmails } from "@/lib/dwaar/notify-status";
import { chatUrl, cleanName, statusEmailContent, type StatusData } from "@/lib/dwaar/status-email-text";
import { newRequestText } from "@/lib/dwaar/request-email-text";
import type { EmailMessage } from "@/lib/feedback/deliver";

const settings = { from: "Vyuhika Apps <no_reply@vyuhika.com>", feedbackTo: "x@y.com", assetBaseUrl: "https://apps.vyuhika.com" };
const REQ = "11111111-2222-3333-4444-555555555555";
const base: StatusData = { kind: "accepted", requestId: REQ, toName: "Cand", otherName: "Ravi Kumar", company: "Acme", jobTitle: "Backend Engineer" };

function fakeDb(reply: { data: unknown; error: { code: string } | null }) {
  const calls: { name: string; args: Record<string, unknown> }[] = [];
  return { calls, supabase: { rpc: async (name: string, args: Record<string, unknown>) => (calls.push({ name, args }), reply) } as never };
}
const row = (kind: string, to: string) => ({
  out_kind: kind, out_request_id: REQ, out_to_email: to, out_to_name: "N", out_other_name: "Ravi Kumar", out_company_name: "Acme", out_job_title: "Backend Engineer",
});

describe("statusEmailContent", () => {
  it("tells the candidate who accepted and links to the chat", () => {
    const c = statusEmailContent(base, settings.assetBaseUrl);
    expect(c.subject).toBe("Ravi Kumar accepted your referral request at Acme");
    expect(c.link).toBe(`https://apps.vyuhika.com/apps/dwaar/requests/${REQ}/chat`);
    expect(c.buttonLabel).toBe("Open the chat");
    expect(c.text).toContain(c.link);
    expect(c.text).toContain("Backend Engineer");
  });
  it("words a new message for the employee and a reply for the candidate", () => {
    expect(statusEmailContent({ ...base, kind: "message" }, settings.assetBaseUrl).subject).toBe("Ravi Kumar sent you a message on Dwaar");
    expect(statusEmailContent({ ...base, kind: "reply" }, settings.assetBaseUrl).subject).toBe("Ravi Kumar replied to you on Dwaar");
  });
  it("words the contact request emails for the right person", () => {
    const asked = statusEmailContent({ ...base, kind: "contact_asked" }, settings.assetBaseUrl);
    expect(asked.subject).toBe("Ravi Kumar asked for your contact details on Dwaar");
    expect(asked.text).not.toMatch(/\+\d|@/);
    expect(statusEmailContent({ ...base, kind: "contact_answered" }, settings.assetBaseUrl).subject).toBe("Ravi Kumar answered your contact request on Dwaar");
  });
  it("keeps names to one short plain line (no header tricks)", () => {
    expect(cleanName("Ravi\r\nBcc: x@y.com <b>")).not.toMatch(/[\r\n<>]/);
    expect(cleanName("x".repeat(200)).length).toBe(60);
    expect(cleanName("   ")).toBe("Someone");
  });
  it("builds the chat link without a double slash", () => {
    expect(chatUrl("https://apps.vyuhika.com/", REQ)).toBe(`https://apps.vyuhika.com/apps/dwaar/requests/${REQ}/chat`);
  });
  it("never promises that email addresses are shared", () => {
    for (const kind of ["accepted", "message", "reply", "contact_asked", "contact_answered"] as const) {
      const c = statusEmailContent({ ...base, kind }, settings.assetBaseUrl);
      expect(c.text).not.toMatch(/email is shared|share your email/i);
      expect(c.note).toMatch(/never shared|private/i);
    }
    expect(newRequestText("Dev", "Acme", settings.assetBaseUrl)).not.toMatch(/email is shared with you/i);
  });
});

describe("StatusEmail template", () => {
  it("renders the heading, role, company, button and note", async () => {
    const content = statusEmailContent(base, settings.assetBaseUrl);
    const html = await render(<StatusEmail content={content} assetBaseUrl={settings.assetBaseUrl} />);
    expect(html).toContain("Your request was accepted");
    expect(html).toContain("Backend Engineer");
    expect(html).toContain("Acme");
    expect(html).toContain(content.link);
    expect(html).toContain("Open the chat");
  });
  it("escapes a name written as HTML", async () => {
    const content = statusEmailContent({ ...base, otherName: "<script>x</script>" }, settings.assetBaseUrl);
    const html = await render(<StatusEmail content={content} assetBaseUrl={settings.assetBaseUrl} />);
    expect(html).not.toContain("<script>x</script>");
  });
});

describe("sendStatusEmails", () => {
  it("sends one email per note, to the address the database gave, using the secret", async () => {
    const { supabase, calls } = fakeDb({ data: [row("accepted", "cand@example.com"), row("message", "e@acme.com")], error: null });
    const send = vi.fn(async (email: EmailMessage) => email.to.length > 0);
    expect(await sendStatusEmails(supabase, { secret: "s", send, settings })).toEqual({ sent: 2, failed: 0 });
    expect(calls[0]).toEqual({ name: "dwaar_claim_email_events", args: { p_secret: "s" } });
    // The emails are built at the same time, so which one is handed over first can vary.
    expect(send.mock.calls.map((c) => c[0].to).sort()).toEqual(["cand@example.com", "e@acme.com"]);
    const accepted = send.mock.calls.map((c) => c[0]).find((m) => m.to === "cand@example.com");
    expect(accepted?.from).toBe(settings.from);
    expect(accepted?.html).toContain("Your request was accepted");
  });
  it("counts failures and does not throw", async () => {
    const { supabase } = fakeDb({ data: [row("reply", "cand@example.com")], error: null });
    const send = vi.fn(async () => false);
    expect(await sendStatusEmails(supabase, { secret: "s", send, settings })).toEqual({ sent: 0, failed: 1 });
  });
  it("sends nothing when the database refuses or returns an unknown kind", async () => {
    const send = vi.fn(async () => true);
    expect(await sendStatusEmails(fakeDb({ data: null, error: { code: "42501" } }).supabase, { secret: "s", send, settings })).toEqual({ sent: 0, failed: 0 });
    expect(await sendStatusEmails(fakeDb({ data: [row("weird", "a@b.co")], error: null }).supabase, { secret: "s", send, settings })).toEqual({ sent: 0, failed: 0 });
    expect(send).not.toHaveBeenCalled();
  });
});

import { sendRequestSentEmail } from "@/lib/dwaar/notify-status";

describe("the 'your request was sent' email", () => {
  const info = { to: "asha@example.com", name: "Asha", company: "Acme", jobTitle: "Backend Engineer", requestId: REQ };
  it("confirms the job and company and links to My requests", () => {
    const c = statusEmailContent({ kind: "sent", requestId: REQ, toName: "Asha", otherName: "", company: "Acme", jobTitle: "Backend Engineer" }, settings.assetBaseUrl);
    expect(c.subject).toBe("Your referral request was sent: Backend Engineer at Acme");
    expect(c.link).toBe("https://apps.vyuhika.com/apps/dwaar/requests");
    expect(c.text).toContain("Hi Asha");
    expect(c.text).not.toMatch(/\bscore\b/i);
  });
  it("sends one email to the candidate", async () => {
    const send = vi.fn(async (_m: EmailMessage) => true);
    expect(await sendRequestSentEmail({ send, settings }, info)).toBe(true);
    expect(send.mock.calls).toHaveLength(1);
    expect(send.mock.calls[0][0].to).toBe("asha@example.com");
  });
  it("does nothing without an address, and never throws when sending fails", async () => {
    const send = vi.fn(async (_m: EmailMessage) => true);
    expect(await sendRequestSentEmail({ send, settings }, { ...info, to: null })).toBe(false);
    expect(send).not.toHaveBeenCalled();
    const failing = vi.fn(async (_m: EmailMessage): Promise<boolean> => { throw new Error("down"); });
    expect(await sendRequestSentEmail({ send: failing, settings }, info)).toBe(false);
  });
});
