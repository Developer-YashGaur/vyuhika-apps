import { postJson } from "@/lib/api/post-json";
import type { MatchResult } from "@/lib/types";

// Runs in the browser: asks our /api/analyze route for a match.
// Network problems and server errors become friendly AiErrors (see lib/api/post-json.ts).

export function requestAnalysis(
  resume: string,
  jobDescription: string,
  fetchFn: typeof fetch = fetch,
): Promise<MatchResult> {
  return postJson<MatchResult>(
    "/api/analyze",
    { resume, jobDescription },
    (data) => typeof (data as MatchResult | null)?.score === "number",
    fetchFn,
  );
}
