import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

// What an employee may see about a candidate: LinkedIn link, other links and skills. Never the phone number.
// The database decides who may see which candidate; this only fetches and tidies.

type Db = SupabaseClient<Database>;

export type CandidateExtras = { linkedinUrl: string | null; otherLinks: string[]; skills: string[] };

// Only plain https links are ever turned into clickable links.
export function safeHttps(url: unknown): string | null {
  return typeof url === "string" && /^https:\/\/[^\s]{4,300}$/.test(url) ? url : null;
}

export async function getCandidateExtras(supabase: Db, requestIds: string[]): Promise<Map<string, CandidateExtras>> {
  const map = new Map<string, CandidateExtras>();
  if (requestIds.length === 0) return map;
  const { data, error } = await supabase.rpc("dwaar_candidate_extras", { p_request_ids: requestIds.slice(0, 100) });
  if (error) {
    // Details are a bonus. The page still works without them.
    console.error("[dwaar] could not load candidate details", { code: error.code });
    return map;
  }
  for (const row of data ?? []) {
    map.set(row.out_request_id, {
      linkedinUrl: safeHttps(row.out_linkedin_url),
      otherLinks: (row.out_other_links ?? []).flatMap((l) => (safeHttps(l) ? [l] : [])),
      skills: row.out_skills ?? [],
    });
  }
  return map;
}
