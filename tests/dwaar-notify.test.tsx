import { describe, expect, it, vi } from "vitest";
import { render } from "@react-email/components";
import NewRequestEmail from "@/components/emails/NewRequestEmail";
import { notifyProviders } from "@/lib/dwaar/notify";
import type { EmailMessage } from "@/lib/feedback/deliver";
import { NEW_REQUEST_SUBJECT, inboxUrl, newRequestText } from "@/lib/dwaar/request-email-text";

const settings = { from: "Vyuhika Apps <no_reply@vyuhika.com>", feedbackTo: "x@y.com", assetBaseUrl: "https://apps.vyuhika.com" };

function fakeDb(reply: { data: unknown; error: { code: string } | null }) {
  const calls: { name: string; args: Record<string, unknown> }[] = [];
  return { calls, supabase: { rpc: async (name: string, args: Record<string, unknown>) => (calls.push({ name, args }), reply) } as never };
}

const rows = [
  { out_work_email: "a@acme.com", out_name: "A", out_job_title: "Backend Engineer", out_company_name: "Acme" },
  { out_work_email: "b@acme.com", out_name: "B", out_job_title: "Backend Engineer", out_company_name: "Acme" },
];

describe("notifyProviders", () => {
  it("emails exactly the addresses the database hands back, with the secret", async () => {
    const { supabase, calls } = fakeDb({ data: rows, error: null });
    const send = vi.fn(async (email: EmailMessage) => email.to.length > 0);
    const out = await notifyProviders(supabase, { secret: "s", send, settings }, "req1");
    expect(out).toEqual({ sent: 2, failed: 0 });
    expect(calls[0].args).toEqual({ p_request_id: "req1", p_secret: "s" });
    const to = send.mock.calls.map((c) => c[0].to).sort();
    expect(to).toEqual(["a@acme.com", "b@acme.com"]);
    const first = send.mock.calls[0][0];
    expect(first.subject).toBe(NEW_REQUEST_SUBJECT);
    expect(first.html).toContain("Backend Engineer");
    expect(first.html).toContain("https://apps.vyuhika.com/apps/dwaar/inbox");
  });
  it("asks for the next wave with the other database call", async () => {
    const { supabase, calls } = fakeDb({ data: rows, error: null });
    const send = vi.fn(async (email: EmailMessage) => email.to.length > 0);
    const out = await notifyProviders(supabase, { secret: "s", send, settings }, "req1", "next");
    expect(out).toEqual({ sent: 2, failed: 0 });
    expect(calls[0].name).toBe("dwaar_offer_next_wave");
  });
  it("sends nothing when the database hands back nobody", async () => {
    const { supabase } = fakeDb({ data: [], error: null });
    const send = vi.fn(async (email: EmailMessage) => email.to.length > 0);
    expect(await notifyProviders(supabase, { secret: "s", send, settings }, "r")).toEqual({ sent: 0, failed: 0 });
    expect(send).not.toHaveBeenCalled();
  });
  it("never throws, even when the database or the email service fails", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const bad = fakeDb({ data: null, error: { code: "42501" } });
    expect(await notifyProviders(bad.supabase, { secret: "s", send: async () => true, settings }, "r")).toEqual({ sent: 0, failed: 0 });
    const ok = fakeDb({ data: rows, error: null });
    const out = await notifyProviders(ok.supabase, { secret: "s", send: async () => { throw new Error("down"); }, settings }, "r");
    spy.mockRestore();
    expect(out).toEqual({ sent: 0, failed: 2 });
  });
});

describe("the email", () => {
  it("says the role and company but nothing about the candidate, in HTML and text", async () => {
    const html = await render(<NewRequestEmail jobTitle="Data <b>Analyst</b>" company="Acme" assetBaseUrl="https://apps.vyuhika.com" />);
    expect(html).toContain("Open your employee desk");
    expect(html).not.toContain("<b>Analyst</b>");
    const text = newRequestText("Data Analyst", "Acme", "https://apps.vyuhika.com/");
    expect(text).toContain("Role: Data Analyst");
    expect(text).toContain("https://apps.vyuhika.com/apps/dwaar/inbox");
    expect(inboxUrl("https://x.com//")).toBe("https://x.com/apps/dwaar/inbox");
  });
});
