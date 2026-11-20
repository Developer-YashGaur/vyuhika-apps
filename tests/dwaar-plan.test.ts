import { createHmac } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { buildCheckoutOptions } from "@/lib/dwaar/checkout";
import { planPaymentsEnabled } from "@/lib/dwaar/features";
import { FREE_DAILY_CHECKS, PLAN_DESCRIPTION, daysLeft, confirmPlanPayment, getMyPlan, planMessage, startPlan } from "@/lib/dwaar/plan";

const KEYS = { keyId: "rzp_test_abc123", keySecret: "s".repeat(24) };
const SECRET = "x".repeat(40);

function fakeDb(replies: Record<string, { data: unknown; error: { code?: string } | null }>) {
  const calls: { name: string; args: unknown }[] = [];
  return { calls, db: { rpc: async (name: string, args: unknown) => (calls.push({ name, args }), replies[name]) } as never };
}
const order = (id = "order_ABC123") => vi.fn(async () => new Response(JSON.stringify({ id }), { status: 200 })) as unknown as typeof fetch;
const pass = { out_pass_id: "11111111-2222-3333-4444-555555555555", out_amount_paise: 29900, out_currency: "INR", out_gateway_order_id: null };

describe("planPaymentsEnabled", () => {
  it("is off unless DWAAR_PLAN_ENABLED is true", () => {
    expect(planPaymentsEnabled({})).toBe(false);
    expect(planPaymentsEnabled({ DWAAR_PLAN_ENABLED: "1" })).toBe(false);
    expect(planPaymentsEnabled({ DWAAR_PLAN_ENABLED: "True" })).toBe(true);
  });
});

describe("getMyPlan", () => {
  it("reads the pass", async () => {
    const { db } = fakeDb({ dwaar_my_plan: { data: [{ out_active: true, out_ends_at: "2026-12-01T00:00:00Z", out_daily_checks: 20 }], error: null } });
    expect(await getMyPlan(db)).toEqual({ active: true, endsAt: "2026-12-01T00:00:00Z", dailyChecks: 20 });
  });
  it("falls back to the free limit on any problem", async () => {
    const { db } = fakeDb({ dwaar_my_plan: { data: null, error: { code: "x" } } });
    expect(await getMyPlan(db)).toEqual({ active: false, endsAt: null, dailyChecks: FREE_DAILY_CHECKS });
  });
});

describe("startPlan", () => {
  it("is unavailable without the secret or keys, and does not touch the database", async () => {
    const { db, calls } = fakeDb({});
    expect(await startPlan({ supabase: db, secret: null, keys: KEYS })).toEqual({ kind: "unavailable" });
    expect(await startPlan({ supabase: db, secret: SECRET, keys: null })).toEqual({ kind: "unavailable" });
    expect(calls).toHaveLength(0);
  });
  it("creates a Razorpay order at the database price and links it", async () => {
    const { db, calls } = fakeDb({ dwaar_start_plan: { data: [pass], error: null }, dwaar_attach_plan_order: { data: true, error: null } });
    const fetchFn = order();
    expect(await startPlan({ supabase: db, secret: SECRET, keys: KEYS, fetchFn })).toEqual({
      kind: "ready", passId: pass.out_pass_id, gatewayOrderId: "order_ABC123", amountPaise: 29900,
    });
    const body = JSON.parse(((fetchFn as unknown as { mock: { calls: [string, RequestInit][] } }).mock.calls[0][1].body as string));
    expect(body.amount).toBe(29900);
    expect(calls[1].args).toEqual({ p_pass_id: pass.out_pass_id, p_gateway_order_id: "order_ABC123", p_secret: SECRET });
  });
  it("reuses an order that already exists", async () => {
    const { db } = fakeDb({ dwaar_start_plan: { data: [{ ...pass, out_gateway_order_id: "order_OLD1" }], error: null } });
    const fetchFn = order();
    const result = await startPlan({ supabase: db, secret: SECRET, keys: KEYS, fetchFn });
    expect(result.kind === "ready" && result.gatewayOrderId).toBe("order_OLD1");
    expect(fetchFn).not.toHaveBeenCalled();
  });
  it("asks for a profile when the database says so", async () => {
    const { db } = fakeDb({ dwaar_start_plan: { data: null, error: { code: "42501" } } });
    expect(await startPlan({ supabase: db, secret: SECRET, keys: KEYS })).toEqual({ kind: "no-profile" });
  });
  it("fails safely when the gateway fails", async () => {
    const { db } = fakeDb({ dwaar_start_plan: { data: [pass], error: null } });
    const bad = vi.fn(async () => new Response("no", { status: 500 })) as unknown as typeof fetch;
    expect(await startPlan({ supabase: db, secret: SECRET, keys: KEYS, fetchFn: bad })).toEqual({ kind: "failed" });
  });
});

describe("confirmPlanPayment", () => {
  const sign = (o: string, p: string) => createHmac("sha256", KEYS.keySecret).update(`${o}|${p}`).digest("hex");
  it("marks the pass paid only for a valid signature", async () => {
    const { db, calls } = fakeDb({ dwaar_mark_plan_paid: { data: true, error: null } });
    const ok = await confirmPlanPayment({ supabase: db, secret: SECRET, keys: KEYS }, { orderId: "order_A1", paymentId: "pay_B2", signature: sign("order_A1", "pay_B2") });
    expect(ok).toEqual({ kind: "paid" });
    expect(calls[0].args).toEqual({ p_gateway_order_id: "order_A1", p_gateway_payment_id: "pay_B2", p_secret: SECRET });
  });
  it("refuses a bad signature without calling the database", async () => {
    const { db, calls } = fakeDb({});
    const out = await confirmPlanPayment({ supabase: db, secret: SECRET, keys: KEYS }, { orderId: "order_A1", paymentId: "pay_B2", signature: "nope" });
    expect(out).toEqual({ kind: "invalid" });
    expect(calls).toHaveLength(0);
  });
  it("reports a database refusal as failed", async () => {
    const { db } = fakeDb({ dwaar_mark_plan_paid: { data: false, error: null } });
    const out = await confirmPlanPayment({ supabase: db, secret: SECRET, keys: KEYS }, { orderId: "order_A1", paymentId: "pay_B2", signature: sign("order_A1", "pay_B2") });
    expect(out).toEqual({ kind: "failed" });
  });
});

describe("messages and checkout text", () => {
  it("has a plain message for each failure", () => {
    expect(planMessage("no-profile")).toContain("profile");
    expect(planMessage("unavailable")).toContain("not available");
    expect(planMessage("failed")).toContain("Nothing was charged");
  });
  it("shows the plan description in the checkout window", () => {
    const o = buildCheckoutOptions({ keyId: KEYS.keyId, gatewayOrderId: "order_A1", amountPaise: 29900 }, { onPaid: () => {}, onDismiss: () => {} }, PLAN_DESCRIPTION);
    expect(o.description).toBe(PLAN_DESCRIPTION);
    expect(o.amount).toBe(29900);
  });
});

describe("daysLeft", () => {
  it("rounds up and never goes below zero", () => {
    const now = Date.parse("2026-11-20T00:00:00Z");
    expect(daysLeft("2026-11-22T12:00:00Z", now)).toBe(3);
    expect(daysLeft("2026-11-19T00:00:00Z", now)).toBe(0);
    expect(daysLeft(null, now)).toBeNull();
  });
});
