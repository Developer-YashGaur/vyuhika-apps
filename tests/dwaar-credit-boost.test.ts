import { describe, expect, it } from "vitest";
import { BOOST_CREDIT_COST, getCreditBalance, spendCreditsOnBoost, spendMessage } from "@/lib/dwaar/credit-boost";

function fakeDb(reply: { data: unknown; error: { code?: string } | null }) {
  const calls: { name: string; args: unknown }[] = [];
  return { calls, db: { rpc: async (name: string, args: unknown) => (calls.push({ name, args }), reply) } as never };
}

describe("spendCreditsOnBoost", () => {
  it("returns the order id when the database accepts", async () => {
    const { db, calls } = fakeDb({ data: "order-1", error: null });
    expect(await spendCreditsOnBoost(db, "r1")).toEqual({ kind: "paid", orderId: "order-1" });
    expect(calls[0]).toEqual({ name: "dwaar_spend_credits_on_boost", args: { p_request_id: "r1" } });
  });
  it("maps each database error code", async () => {
    expect(await spendCreditsOnBoost(fakeDb({ data: null, error: { code: "DW030" } }).db, "r1")).toEqual({ kind: "already" });
    expect(await spendCreditsOnBoost(fakeDb({ data: null, error: { code: "DW031" } }).db, "r1")).toEqual({ kind: "no-resume" });
    expect(await spendCreditsOnBoost(fakeDb({ data: null, error: { code: "DW034" } }).db, "r1")).toEqual({ kind: "not-enough" });
    expect(await spendCreditsOnBoost(fakeDb({ data: null, error: { code: "XX000" } }).db, "r1")).toEqual({ kind: "failed" });
  });
  it("fails safely on an odd answer", async () => {
    expect(await spendCreditsOnBoost(fakeDb({ data: null, error: null }).db, "r1")).toEqual({ kind: "failed" });
  });
});

describe("spendMessage", () => {
  it("names the cost when credits are short", () => {
    expect(spendMessage("not-enough")).toContain(String(BOOST_CREDIT_COST));
  });
  it("tells the person no credits were taken on a failure", () => {
    expect(spendMessage("failed")).toContain("No credits were taken");
  });
});

describe("getCreditBalance", () => {
  it("returns the balance, or 0 when it cannot be read", async () => {
    expect(await getCreditBalance(fakeDb({ data: 5, error: null }).db)).toBe(5);
    expect(await getCreditBalance(fakeDb({ data: null, error: { code: "x" } }).db)).toBe(0);
  });
});
