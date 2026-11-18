import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { createRazorpayOrder, verifyPaymentSignature, type RazorpayKeys } from "@/lib/dwaar/razorpay";

// The Plus pass: 30 days of more resume checks, plus a few credits. A one-time payment, never an automatic renewal.
// The database decides the price and the benefits; this code creates the matching Razorpay order and checks the
// signed receipt. The numbers below are only for showing on the page: keep them in step with private.dwaar_config.

type Db = SupabaseClient<Database>;

export const PLAN_PRICE_RUPEES = 199;
export const PLAN_DAYS = 30;
export const PLAN_CREDITS = 50;
export const PLAN_DAILY_CHECKS = 20;
export const FREE_DAILY_CHECKS = 5;
export const PLAN_DESCRIPTION = "Dwaar Plus: 30 days of more resume checks, plus 50 credits";

export type MyPlan = { active: boolean; endsAt: string | null; dailyChecks: number };

// If the plan cannot be read, treat the person as having no pass (the normal free limits).
export async function getMyPlan(supabase: Db): Promise<MyPlan> {
  const { data, error } = await supabase.rpc("dwaar_my_plan");
  const row = Array.isArray(data) ? data[0] : undefined;
  if (error || !row) return { active: false, endsAt: null, dailyChecks: FREE_DAILY_CHECKS };
  return { active: row.out_active, endsAt: row.out_ends_at, dailyChecks: row.out_daily_checks };
}

export type PlanStart =
  | { kind: "ready"; passId: string; gatewayOrderId: string; amountPaise: number }
  | { kind: "no-profile" }
  | { kind: "unavailable" } // payments are not switched on on this server
  | { kind: "failed" };

type Deps = { supabase: Db; secret: string | null; keys: RazorpayKeys | null; fetchFn?: typeof fetch };

export async function startPlan({ supabase, secret, keys, fetchFn }: Deps): Promise<PlanStart> {
  if (!secret || !keys) return { kind: "unavailable" };

  const started = await supabase.rpc("dwaar_start_plan");
  if (started.error) {
    if (started.error.code === "42501") return { kind: "no-profile" };
    console.error("[dwaar] starting a plan failed:", started.error.code);
    return { kind: "failed" };
  }
  const pass = started.data?.[0];
  if (!pass) return { kind: "failed" };

  // Same pass clicked twice: reuse the Razorpay order we already made.
  if (pass.out_gateway_order_id) {
    return { kind: "ready", passId: pass.out_pass_id, gatewayOrderId: pass.out_gateway_order_id, amountPaise: pass.out_amount_paise };
  }

  try {
    const created = await createRazorpayOrder(
      { keys, amountPaise: pass.out_amount_paise, receipt: `pl_${pass.out_pass_id.replace(/-/g, "")}` },
      fetchFn,
    );
    const linked = await supabase.rpc("dwaar_attach_plan_order", {
      p_pass_id: pass.out_pass_id,
      p_gateway_order_id: created.id,
      p_secret: secret,
    });
    if (linked.error || linked.data !== true) {
      console.error("[dwaar] linking the plan order failed", { code: linked.error?.code });
      return { kind: "failed" };
    }
    return { kind: "ready", passId: pass.out_pass_id, gatewayOrderId: created.id, amountPaise: pass.out_amount_paise };
  } catch (error) {
    console.error("[dwaar] creating the plan order failed:", (error as Error)?.name);
    return { kind: "failed" };
  }
}

export function planMessage(kind: Exclude<PlanStart["kind"], "ready">): string {
  switch (kind) {
    case "no-profile":
      return "Please create your Dwaar profile first.";
    case "unavailable":
      return "Dwaar Plus is not available yet. Please try again later.";
    default:
      return "We could not start the payment. Nothing was charged. Please try again.";
  }
}

export type PaymentReceipt = { orderId: string; paymentId: string; signature: string };
export type PlanConfirm = { kind: "paid" } | { kind: "invalid" } | { kind: "unavailable" } | { kind: "failed" };

// The payment is real only if the signature checks out. The database then marks the pass paid for this signed-in person.
export async function confirmPlanPayment({ supabase, secret, keys }: Deps, receipt: PaymentReceipt): Promise<PlanConfirm> {
  if (!secret || !keys) return { kind: "unavailable" };
  if (!verifyPaymentSignature({ ...receipt, keySecret: keys.keySecret })) {
    console.error("[dwaar] a plan receipt had a bad signature");
    return { kind: "invalid" };
  }
  const marked = await supabase.rpc("dwaar_mark_plan_paid", {
    p_gateway_order_id: receipt.orderId,
    p_gateway_payment_id: receipt.paymentId,
    p_secret: secret,
  });
  if (marked.error || marked.data !== true) {
    console.error("[dwaar] marking a plan paid failed", { code: marked.error?.code });
    return { kind: "failed" };
  }
  return { kind: "paid" };
}
