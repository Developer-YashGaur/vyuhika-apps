import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

// Paying for a Boost with credits. The database checks everything (your request, a resume, no earlier Boost, enough
// credits) and takes the credits in one step. This is not a payment, so no payment gateway is involved.

type Db = SupabaseClient<Database>;

// Keep in step with 'boost_credit_cost' in private.dwaar_config (the database uses its own copy).
export const BOOST_CREDIT_COST = 20;

export type SpendResult =
  | { kind: "paid"; orderId: string }
  | { kind: "already" }
  | { kind: "no-resume" }
  | { kind: "not-enough" }
  | { kind: "failed" };

export async function spendCreditsOnBoost(supabase: Db, requestId: string): Promise<SpendResult> {
  const { data, error } = await supabase.rpc("dwaar_spend_credits_on_boost", { p_request_id: requestId });
  if (error) {
    if (error.code === "DW030") return { kind: "already" };
    if (error.code === "DW031") return { kind: "no-resume" };
    if (error.code === "DW034") return { kind: "not-enough" };
    console.error("[dwaar] spending credits on a boost failed:", error.code);
    return { kind: "failed" };
  }
  return typeof data === "string" ? { kind: "paid", orderId: data } : { kind: "failed" };
}

export function spendMessage(kind: Exclude<SpendResult["kind"], "paid">): string {
  switch (kind) {
    case "already":
      return "This request already has a Boost.";
    case "no-resume":
      return "Boost needs a resume on this request. It may have been deleted.";
    case "not-enough":
      return `You need ${BOOST_CREDIT_COST} credits for a Boost.`;
    default:
      return "Something went wrong. No credits were taken. Please try again.";
  }
}

// 0 if the balance cannot be read (the page then simply hides the credit button).
export async function getCreditBalance(supabase: Db): Promise<number> {
  const { data, error } = await supabase.rpc("dwaar_credit_balance");
  return error || typeof data !== "number" ? 0 : data;
}
