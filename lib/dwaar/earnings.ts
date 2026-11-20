import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

// Referrers earn Dwaar credits (never cash): +5 for accepting a request, +20 when the candidate reports an interview, +50 for an offer.
// The database holds the amounts, the daily and monthly limits, and checks who may report. These are only for showing the numbers.
export const EARN_ACCEPT = 5;
export const EARN_INTERVIEW = 20;
export const EARN_OFFER = 50;

type Db = SupabaseClient<Database>;

export type Earnings = { acceptCredits: number; outcomeCredits: number; accepted: number; interviews: number; offers: number };

export async function getMyEarnings(supabase: Db): Promise<Earnings | null> {
  const { data, error } = await supabase.rpc("dwaar_my_earnings");
  const row = Array.isArray(data) ? data[0] : undefined;
  if (error || !row) return null;
  return { acceptCredits: row.out_accept_credits, outcomeCredits: row.out_outcome_credits, accepted: row.out_accepted, interviews: row.out_interviews, offers: row.out_offers };
}

export type Outcome = "" | "interview" | "offer";

export async function getOutcome(supabase: Db, requestId: string): Promise<Outcome> {
  const { data, error } = await supabase.rpc("dwaar_request_outcome", { p_request_id: requestId });
  if (error) return "";
  return data === "interview" || data === "offer" ? data : "";
}

export const OUTCOME_MESSAGES = {
  done: "Thank you. The employee who helped you earned credits.",
  same: "That is already recorded.",
  failed: "We could not save that right now. Please try again.",
} as const;

export async function reportOutcome(supabase: Db, requestId: string, outcome: string): Promise<keyof typeof OUTCOME_MESSAGES> {
  if (outcome !== "interview" && outcome !== "offer") return "failed";
  const { data, error } = await supabase.rpc("dwaar_report_outcome", { p_request_id: requestId, p_outcome: outcome });
  if (error) {
    console.error("[dwaar] could not report the outcome", { code: error.code });
    return "failed";
  }
  return data ? "done" : "same";
}
