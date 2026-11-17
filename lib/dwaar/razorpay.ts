import { createHmac, timingSafeEqual } from "node:crypto";

// Talks to Razorpay from the server. The key secret is passed in by the caller (read from .env.local) and is
// never logged, never returned and never sent to the browser. No SDK: one small request, so there is less to trust.

export class RazorpayError extends Error {
  constructor() {
    super("razorpay request failed"); // no details on purpose: a response could echo something private
    this.name = "RazorpayError";
  }
}

export type RazorpayKeys = { keyId: string; keySecret: string };

// Keys must look like Razorpay keys. A missing or odd value means "not set up", never a half-working state.
export function razorpayKeys(env: Record<string, string | undefined> = process.env): RazorpayKeys | null {
  const keyId = env.RAZORPAY_KEY_ID?.trim();
  const keySecret = env.RAZORPAY_KEY_SECRET?.trim();
  if (!keyId || !keySecret) return null;
  if (!/^rzp_(test|live)_[A-Za-z0-9]+$/.test(keyId)) return null;
  if (keySecret.length < 16) return null;
  return { keyId, keySecret };
}

export async function createRazorpayOrder(
  args: { keys: RazorpayKeys; amountPaise: number; receipt: string },
  fetchFn: typeof fetch = fetch,
): Promise<{ id: string }> {
  if (!Number.isInteger(args.amountPaise) || args.amountPaise <= 0) throw new RazorpayError();
  try {
    const response = await fetchFn("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Basic " + Buffer.from(`${args.keys.keyId}:${args.keys.keySecret}`).toString("base64"),
      },
      body: JSON.stringify({ amount: args.amountPaise, currency: "INR", receipt: args.receipt }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new RazorpayError();
    const body = (await response.json()) as { id?: unknown };
    if (typeof body.id !== "string" || !/^order_[A-Za-z0-9]{1,40}$/.test(body.id)) throw new RazorpayError();
    return { id: body.id };
  } catch {
    throw new RazorpayError();
  }
}

// After checkout, Razorpay gives the browser an order id, a payment id and a signature. The signature is an HMAC of
// "order_id|payment_id" made with the key secret, so only Razorpay (and we) can make a valid one. We recompute it and compare.
export function verifyPaymentSignature(args: { orderId: string; paymentId: string; signature: string; keySecret: string }): boolean {
  if (!/^order_[A-Za-z0-9]{1,40}$/.test(args.orderId) || !/^pay_[A-Za-z0-9]{1,40}$/.test(args.paymentId)) return false;
  if (!/^[0-9a-f]{64}$/.test(args.signature)) return false;
  const expected = createHmac("sha256", args.keySecret).update(`${args.orderId}|${args.paymentId}`).digest();
  return timingSafeEqual(expected, Buffer.from(args.signature, "hex"));
}
