import { describe, expect, it } from "vitest";
import { OUTCOME_MESSAGES, getMyEarnings, getOutcome, reportOutcome } from "@/lib/dwaar/earnings";

const db = (data: unknown, code: string | null = null) => ({ rpc: async () => ({ data, error: code ? { code, message: "x" } : null }) }) as never;

describe("referrer earnings", () => {
  it("reads the totals", async () => {
    const e = await getMyEarnings(db([{ out_accept_credits: 10, out_outcome_credits: 70, out_accepted: 2, out_interviews: 1, out_offers: 1 }]));
    expect(e).toEqual({ acceptCredits: 10, outcomeCredits: 70, accepted: 2, interviews: 1, offers: 1 });
  });
  it("shows nothing when the totals cannot be read", async () => {
    expect(await getMyEarnings(db(null, "XX000"))).toBeNull();
  });
  it("reports an outcome and tells apart new, repeated and failed", async () => {
    expect(await reportOutcome(db(true), "r1", "interview")).toBe("done");
    expect(await reportOutcome(db(false), "r1", "interview")).toBe("same");
    expect(await reportOutcome(db(null, "XX000"), "r1", "interview")).toBe("failed");
    expect(await reportOutcome(db(true), "r1", "hired")).toBe("failed");
    expect(OUTCOME_MESSAGES.done.length > 0).toBe(true);
  });
  it("reads what was already said", async () => {
    expect(await getOutcome(db("offer"), "r1")).toBe("offer");
    expect(await getOutcome(db(""), "r1")).toBe("");
    expect(await getOutcome(db("weird"), "r1")).toBe("");
  });
});
