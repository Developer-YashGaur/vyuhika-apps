import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { createRazorpayOrder, verifyPaymentSignature, type RazorpayKeys } from "@/lib/dwaar/razorpay";

// Starting a Boost: the database decides the price and whether this request can be boosted; we only create the
// matching Razorpay order and link it. The browser later opens Razorpay checkout with the order id returned here.

type Db = SupabaseClient<Database>;

export type BoostStart =
  | { kind: "ready"; orderId: string; gatewayOrderId: string; amountPaise: number; currency: string }
  | { kind: "already" } // this request already has a paid Boost
  | { kind: "no-resume" } // nothing to boost (no resume, or not your request)
  | { kind: "unavailable" } // payments are not switched on on this server
  | { kind: "failed" };

type Deps = { supabase: Db; secret: string | null; keys: RazorpayKeys | null; fetchFn?: typeof fetch };

export async function startBoost({ supabase, secret, keys, fetchFn }: Deps, requestId: string): Promise<BoostStart> {
  if (!secret || !keys) return { kind: "unavailable" };

  const started = await supabase.rpc("dwaar_start_boost", { p_request_id: requestId });
  if (started.error) {
    if (started.error.code === "DW030") return { kind: "already" };
    if (started.error.code === "DW031") return { kind: "no-resume" };
    console.error("[dwaar] starting a boost failed:", started.error.code);
    return { kind: "failed" };
  }
  const order = started.data?.[0];
  if (!order) return { kind: "failed" };

  // Same order clicked twice: reuse the Razorpay order we already made.
  if (order.out_gateway_order_id) {
    return { kind: "ready", orderId: order.out_order_id, gatewayOrderId: order.out_gateway_order_id, amountPaise: order.out_amount_paise, currency: order.out_currency };
  }

  try {
    const created = await createRazorpayOrder(
      { keys, amountPaise: order.out_amount_paise, receipt: `bo_${order.out_order_id.replace(/-/g, "")}` },
      fetchFn,
    );
    const linked = await supabase.rpc("dwaar_attach_gateway_order", {
      p_order_id: order.out_order_id,
      p_gateway_order_id: created.id,
      p_secret: secret,
    });
    if (linked.error || linked.data !== true) {
      console.error("[dwaar] linking the gateway order failed", { code: linked.error?.code });
      return { kind: "failed" };
    }
    return { kind: "ready", orderId: order.out_order_id, gatewayOrderId: created.id, amountPaise: order.out_amount_paise, currency: order.out_currency };
  } catch (error) {
    console.error("[dwaar] creating the gateway order failed:", (error as Error)?.name);
    return { kind: "failed" };
  }
}

export function boostMessage(kind: Exclude<BoostStart["kind"], "ready">): string {
  switch (kind) {
    case "already":
      return "This request already has a Boost.";
    case "no-resume":
      return "Boost needs a resume on this request. It may have been deleted.";
    case "unavailable":
      return "Boost is not available yet. Please try again later.";
    default:
      return "We could not start the payment. Nothing was charged. Please try again.";
  }
}

// My Boosts by request. "paid" = a Boost is waiting for the resume to be chosen (it comes first, it is the one to finish); "delivered" = the latest
// finished one. "count" is how many finished Boosts the request has had. RLS returns only my own orders.
export type MyBoost = { orderId: string; status: "paid" | "delivered"; count: number };

export async function listMyBoosts(supabase: Db): Promise<Map<string, MyBoost>> {
  const { data, error } = await supabase
    .from("dwaar_boost_orders")
    .select("id, request_id, status, created_at")
    .in("status", ["paid", "delivered"])
    .order("created_at", { ascending: false });
  if (error) throw new Error("Could not load your Boost orders.");
  const boosts = new Map<string, MyBoost>();
  for (const row of data ?? []) {
    const done = row.status === "delivered" ? 1 : 0;
    const old = boosts.get(row.request_id);
    if (!old) boosts.set(row.request_id, { orderId: row.id, status: row.status === "delivered" ? "delivered" : "paid", count: done });
    else {
      old.count += done;
      if (row.status === "paid") {
        old.orderId = row.id;
        old.status = "paid";
      }
    }
  }
  return boosts;
}

export type PaymentReceipt = { orderId: string; paymentId: string; signature: string };
export type ConfirmOutcome = { kind: "paid" } | { kind: "invalid" } | { kind: "unavailable" } | { kind: "failed" };

// The payment is real only if the signature checks out. The database then marks the order paid for this signed-in person.
export async function confirmBoostPayment({ supabase, secret, keys }: Deps, receipt: PaymentReceipt): Promise<ConfirmOutcome> {
  if (!secret || !keys) return { kind: "unavailable" };
  const valid = verifyPaymentSignature({ ...receipt, keySecret: keys.keySecret });
  if (!valid) {
    console.error("[dwaar] a payment receipt had a bad signature");
    return { kind: "invalid" };
  }
  const marked = await supabase.rpc("dwaar_mark_boost_paid", {
    p_gateway_order_id: receipt.orderId,
    p_gateway_payment_id: receipt.paymentId,
    p_secret: secret,
  });
  if (marked.error || marked.data !== true) {
    console.error("[dwaar] marking a boost paid failed", { code: marked.error?.code });
    return { kind: "failed" };
  }
  return { kind: "paid" };
}
