import { describe, expect, it, vi } from "vitest";
import { boostMessage, startBoost } from "@/lib/dwaar/boost";
import { createRazorpayOrder, razorpayKeys, RazorpayError } from "@/lib/dwaar/razorpay";

const KEYS = { keyId: "rzp_test_abc123", keySecret: "s".repeat(24) };
const SECRET = "x".repeat(40);

describe("razorpayKeys", () => {
  it("accepts test and live looking keys", () => {
    expect(razorpayKeys({ RAZORPAY_KEY_ID: "rzp_test_abc123", RAZORPAY_KEY_SECRET: "s".repeat(24) })).toEqual(KEYS);
    expect(razorpayKeys({ RAZORPAY_KEY_ID: "rzp_live_abc123", RAZORPAY_KEY_SECRET: "s".repeat(24) })?.keyId).toBe("rzp_live_abc123");
  });
  it("returns null for missing, odd or short values", () => {
    expect(razorpayKeys({})).toBeNull();
    expect(razorpayKeys({ RAZORPAY_KEY_ID: "abc", RAZORPAY_KEY_SECRET: "s".repeat(24) })).toBeNull();
    expect(razorpayKeys({ RAZORPAY_KEY_ID: "rzp_test_abc123", RAZORPAY_KEY_SECRET: "short" })).toBeNull();
  });
});

describe("createRazorpayOrder", () => {
  const ok = (body: unknown, status = 200) => vi.fn(async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;

  it("sends the amount in paise with basic auth and returns the order id", async () => {
    const fetchFn = ok({ id: "order_ABC123" });
    expect(await createRazorpayOrder({ keys: KEYS, amountPaise: 9900, receipt: "bo_1" }, fetchFn)).toEqual({ id: "order_ABC123" });
    const [url, init] = (fetchFn as unknown as { mock: { calls: [string, RequestInit][] } }).mock.calls[0];
    expect(url).toBe("https://api.razorpay.com/v1/orders");
    expect(JSON.parse(init.body as string)).toEqual({ amount: 9900, currency: "INR", receipt: "bo_1" });
    expect((init.headers as Record<string, string>).Authorization).toBe("Basic " + Buffer.from("rzp_test_abc123:" + "s".repeat(24)).toString("base64"));
  });
  it("fails with a plain error that does not contain the secret or the response", async () => {
    const error = await createRazorpayOrder({ keys: KEYS, amountPaise: 9900, receipt: "r" }, ok({ error: { description: KEYS.keySecret } }, 400)).catch((e) => e);
    expect(error).toBeInstanceOf(RazorpayError);
    expect(String(error.message)).not.toContain(KEYS.keySecret);
  });
  it("rejects an odd order id, a bad amount and a network failure", async () => {
    await expect(createRazorpayOrder({ keys: KEYS, amountPaise: 9900, receipt: "r" }, ok({ id: "evil id" }))).rejects.toBeInstanceOf(RazorpayError);
    await expect(createRazorpayOrder({ keys: KEYS, amountPaise: 0, receipt: "r" }, ok({ id: "order_A" }))).rejects.toBeInstanceOf(RazorpayError);
    const boom = vi.fn(async () => { throw new Error("secret leak"); }) as unknown as typeof fetch;
    await expect(createRazorpayOrder({ keys: KEYS, amountPaise: 9900, receipt: "r" }, boom)).rejects.toBeInstanceOf(RazorpayError);
  });
});

// A fake database client with only the two functions Boost uses.
function fakeDb(opts: { start?: { data: unknown; error: { code: string } | null }; attach?: { data: unknown; error: { code: string } | null } } = {}) {
  const calls: string[] = [];
  const order = { out_order_id: "11111111-2222-3333-4444-555555555555", out_amount_paise: 9900, out_currency: "INR", out_status: "created", out_gateway_order_id: null };
  const supabase = {
    rpc: async (name: string, args: Record<string, unknown>) => {
      calls.push(`${name} ${JSON.stringify(args)}`);
      if (name === "dwaar_start_boost") return opts.start ?? { data: [order], error: null };
      return opts.attach ?? { data: true, error: null };
    },
  };
  return { supabase: supabase as never, calls, order };
}
const okFetch = (() => vi.fn(async () => new Response(JSON.stringify({ id: "order_NEW1" }), { status: 200 })) as unknown as typeof fetch);

describe("startBoost", () => {
  it("is unavailable without the server secret or the keys, and does not touch the database", async () => {
    const a = fakeDb();
    expect(await startBoost({ supabase: a.supabase, secret: null, keys: KEYS }, "r")).toEqual({ kind: "unavailable" });
    expect(await startBoost({ supabase: a.supabase, secret: SECRET, keys: null }, "r")).toEqual({ kind: "unavailable" });
    expect(a.calls).toHaveLength(0);
  });
  it("uses the database price, creates the gateway order and links it", async () => {
    const { supabase, calls } = fakeDb();
    const fetchFn = okFetch();
    const result = await startBoost({ supabase, secret: SECRET, keys: KEYS, fetchFn }, "req");
    expect(result).toEqual({ kind: "ready", orderId: "11111111-2222-3333-4444-555555555555", gatewayOrderId: "order_NEW1", amountPaise: 9900, currency: "INR" });
    const body = JSON.parse(((fetchFn as unknown as { mock: { calls: [string, RequestInit][] } }).mock.calls[0][1].body) as string);
    expect(body.amount).toBe(9900);
    expect(body.receipt).toBe("bo_11111111222233334444555555555555");
    expect(calls[1]).toContain("dwaar_attach_gateway_order");
  });
  it("reuses an existing gateway order without calling Razorpay again", async () => {
    const f = fakeDb();
    const { supabase } = fakeDb({ start: { data: [{ ...f.order, out_gateway_order_id: "order_OLD1" }], error: null } });
    const fetchFn = okFetch();
    const result = await startBoost({ supabase, secret: SECRET, keys: KEYS, fetchFn }, "req");
    expect(result).toMatchObject({ kind: "ready", gatewayOrderId: "order_OLD1" });
    expect(fetchFn).not.toHaveBeenCalled();
  });
  it("maps the database error codes", async () => {
    expect(await startBoost({ supabase: fakeDb({ start: { data: null, error: { code: "DW030" } } }).supabase, secret: SECRET, keys: KEYS }, "r")).toEqual({ kind: "already" });
    expect(await startBoost({ supabase: fakeDb({ start: { data: null, error: { code: "DW031" } } }).supabase, secret: SECRET, keys: KEYS }, "r")).toEqual({ kind: "no-resume" });
    expect(await startBoost({ supabase: fakeDb({ start: { data: null, error: { code: "XX000" } } }).supabase, secret: SECRET, keys: KEYS }, "r")).toEqual({ kind: "failed" });
  });
  it("fails safely when Razorpay or the link step fails", async () => {
    const bad = vi.fn(async () => new Response("{}", { status: 500 })) as unknown as typeof fetch;
    expect(await startBoost({ supabase: fakeDb().supabase, secret: SECRET, keys: KEYS, fetchFn: bad }, "r")).toEqual({ kind: "failed" });
    expect(await startBoost({ supabase: fakeDb({ attach: { data: false, error: null } }).supabase, secret: SECRET, keys: KEYS, fetchFn: okFetch() }, "r")).toEqual({ kind: "failed" });
  });
});

describe("boostMessage", () => {
  it("never mentions secrets or internal details", () => {
    for (const kind of ["already", "no-resume", "unavailable", "failed"] as const) expect(boostMessage(kind)).not.toMatch(/razorpay|secret|key/i);
  });
});

import { createHmac } from "node:crypto";
import { confirmBoostPayment } from "@/lib/dwaar/boost";
import { verifyPaymentSignature } from "@/lib/dwaar/razorpay";

const sign = (orderId: string, paymentId: string, secret = KEYS.keySecret) => createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");

describe("verifyPaymentSignature", () => {
  const base = { orderId: "order_AAA111", paymentId: "pay_BBB222", keySecret: KEYS.keySecret };
  it("accepts the signature made with our key secret", () => {
    expect(verifyPaymentSignature({ ...base, signature: sign("order_AAA111", "pay_BBB222") })).toBe(true);
  });
  it("rejects a signature made with another secret, another payment, or in a bad shape", () => {
    expect(verifyPaymentSignature({ ...base, signature: sign("order_AAA111", "pay_BBB222", "z".repeat(24)) })).toBe(false);
    expect(verifyPaymentSignature({ ...base, signature: sign("order_AAA111", "pay_OTHER9") })).toBe(false);
    expect(verifyPaymentSignature({ ...base, signature: "abc" })).toBe(false);
    expect(verifyPaymentSignature({ ...base, orderId: "bad id", signature: sign("order_AAA111", "pay_BBB222") })).toBe(false);
  });
});

describe("confirmBoostPayment", () => {
  const receipt = { orderId: "order_AAA111", paymentId: "pay_BBB222", signature: sign("order_AAA111", "pay_BBB222") };
  it("marks the order paid only after the signature checks out", async () => {
    const { supabase, calls } = fakeDb({ attach: { data: true, error: null } });
    expect(await confirmBoostPayment({ supabase, secret: SECRET, keys: KEYS }, receipt)).toEqual({ kind: "paid" });
    expect(calls[0]).toContain("dwaar_mark_boost_paid");
  });
  it("does not touch the database when the signature is wrong", async () => {
    const { supabase, calls } = fakeDb();
    expect(await confirmBoostPayment({ supabase, secret: SECRET, keys: KEYS }, { ...receipt, signature: sign("order_AAA111", "pay_FAKE99") })).toEqual({ kind: "invalid" });
    expect(calls).toHaveLength(0);
  });
  it("is unavailable without keys, and fails safely if the database refuses", async () => {
    expect(await confirmBoostPayment({ supabase: fakeDb().supabase, secret: SECRET, keys: null }, receipt)).toEqual({ kind: "unavailable" });
    expect(await confirmBoostPayment({ supabase: fakeDb({ attach: { data: false, error: null } }).supabase, secret: SECRET, keys: KEYS }, receipt)).toEqual({ kind: "failed" });
  });
});
