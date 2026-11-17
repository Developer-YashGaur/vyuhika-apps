import { describe, expect, it } from "vitest";
import { ANSWER_NOTES, friendlyRespondError, mailtoLink, respondToRequest } from "@/lib/dwaar/inbox";

const fakeDb = (reply: { data: unknown; error: { code: string } | null }) => {
  const calls: { name: string; args: Record<string, unknown> }[] = [];
  return {
    calls,
    supabase: { rpc: async (name: string, args: Record<string, unknown>) => (calls.push({ name, args }), reply) } as never,
  };
};

describe("respondToRequest", () => {
  it("passes the decision to the database and returns its answer", async () => {
    for (const answer of ["accepted", "dismissed", "unavailable"] as const) {
      const { supabase, calls } = fakeDb({ data: answer, error: null });
      expect(await respondToRequest(supabase, "r1", answer === "accepted")).toEqual({ ok: true, answer });
      expect(calls[0].args).toEqual({ p_request_id: "r1", p_accept: answer === "accepted" });
    }
  });
  it("explains the not-confirmed error", async () => {
    const { supabase } = fakeDb({ data: null, error: { code: "DW020" } });
    const r = await respondToRequest(supabase, "r1", true);
    expect(!r.ok && r.message).toMatch(/Confirm your work email/);
  });
  it("does not trust an unexpected answer", async () => {
    const { supabase } = fakeDb({ data: "hacked", error: null });
    expect((await respondToRequest(supabase, "r1", true)).ok).toBe(false);
  });
});

describe("messages and links", () => {
  it("has a note for every answer and a generic error", () => {
    expect(Object.keys(ANSWER_NOTES).sort()).toEqual(["accepted", "dismissed", "unavailable"]);
    expect(friendlyRespondError("???")).toMatch(/Something went wrong/);
  });
  it("builds a mailto link only for a real address, with the subject encoded", () => {
    const link = mailtoLink("a@b.com", "Dev & Ops", "Acme");
    expect(link).toBe("mailto:a@b.com?subject=Referral%20for%20Dev%20%26%20Ops%20at%20Acme");
    expect(mailtoLink("not an email", "Dev", "Acme")).toBeNull();
    expect(mailtoLink("a@b.com?cc=x@y.com", "Dev", "Acme")).toBeNull();
    expect(mailtoLink("a@b.com?bcc=evil", "Dev", "Acme")).toBeNull();
    expect(mailtoLink("a@b.com,c@d.com", "Dev", "Acme")).toBeNull();
  });
});
