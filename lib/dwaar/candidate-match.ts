import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { toStringList } from "@/lib/dwaar/requests";

// What an employee may see about how well a candidate fits the job: the AI match score, one sentence, and the skills that
// matched or are missing. Never the resume. The database decides who may see which request (only the employee it was
// offered to, or who accepted it, and only for requests made after candidates were told about this).

type Db = SupabaseClient<Database>;

export type CandidateMatch = { score: number; summary: string; matched: string[]; missing: string[] };

export function matchBand(score: number): { label: string; tone: "good" | "info" | "warn" } {
  if (score >= 75) return { label: "Strong match", tone: "good" };
  if (score >= 60) return { label: "Good match", tone: "info" };
  return { label: "Partial match", tone: "warn" };
}

export async function getCandidateMatches(supabase: Db, requestIds: string[]): Promise<Map<string, CandidateMatch>> {
  const map = new Map<string, CandidateMatch>();
  if (requestIds.length === 0) return map;
  const { data, error } = await supabase.rpc("dwaar_candidate_matches", { p_request_ids: requestIds.slice(0, 100) });
  if (error) {
    // The score is a bonus. The page still works without it.
    console.error("[dwaar] could not load match scores", { code: error.code });
    return map;
  }
  for (const row of data ?? []) {
    if (typeof row.out_score !== "number") continue;
    map.set(row.out_request_id, {
      score: row.out_score,
      summary: row.out_summary ?? "",
      matched: toStringList(row.out_strengths).slice(0, 8),
      missing: toStringList(row.out_gaps).slice(0, 8),
    });
  }
  return map;
}
