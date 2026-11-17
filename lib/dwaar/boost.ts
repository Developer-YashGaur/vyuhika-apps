import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { createRazorpayOrder, type RazorpayKeys } from "@/lib/dwaar/razorpay";

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
