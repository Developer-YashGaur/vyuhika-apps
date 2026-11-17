import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { analyzeMatch, type GenerateFn } from "@/lib/analyze/analyze";
import { finalizeMatchResult, prepareUntrustedText } from "@/lib/dwaar/resume-safety";

// Gives a new request its free resume match score: checks the daily limit, cleans the texts, asks the AI,
// cleans the answer and saves it. Never throws: a failed score must not undo the referral request.
// The AI function is passed in, so tests can use a fake one.

type Db = SupabaseClient<Database>;

export type ScoreOutcome =
  | { kind: "done"; score: number }
  | { kind: "limit" } // today's 5 checks are used up
  | { kind: "failed" } // the AI could not check it; the request is still sent
  | { kind: "unavailable" }; // scoring is not switched on on this server

type Deps = { supabase: Db; secret: string | null; generate: GenerateFn | null; model: string };

const DAILY_LIMIT = 5;
const FAILED_SUMMARY = "We could not check this resume right now.";

export async function scoreRequest(
  { supabase, secret, generate, model }: Deps,
  args: { requestId: string; resumeText: string; jobDescription: string },
): Promise<ScoreOutcome> {
  if (!secret || !generate) return { kind: "unavailable" };

  const used = await supabase.rpc("dwaar_analyses_used_today");
  if (used.error || typeof used.data !== "number") return { kind: "failed" };
  if (used.data >= DAILY_LIMIT) return { kind: "limit" };

  const resume = prepareUntrustedText(args.resumeText);
  const job = prepareUntrustedText(args.jobDescription);

  const save = async (status: "done" | "failed", score: number | null, summary: string, strengths: string[], gaps: string[]) =>
    supabase.rpc("dwaar_save_analysis", {
      p_request_id: args.requestId,
      p_secret: secret,
      p_status: status,
      p_score: score ?? 0, // ignored by the database unless the status is "done"
      p_summary: summary,
      p_strengths: strengths,
      p_gaps: gaps,
      p_model: model,
    });

  try {
    const raw = await analyzeMatch(resume.text, job.text, generate);
    const result = finalizeMatchResult(raw, resume.flagged || job.flagged);
    const saved = await save("done", result.score, result.summary, result.matchedKeywords.slice(0, 10), result.missingKeywords.slice(0, 10));
    if (saved.error) {
      console.error("[dwaar] saving the score failed:", saved.error.code);
      return saved.error.code === "DW015" ? { kind: "limit" } : { kind: "failed" };
    }
    return { kind: "done", score: result.score };
  } catch (error) {
    // Log the kind of failure only, never the resume or job text.
    console.error("[dwaar] scoring failed:", (error as Error)?.name);
    await save("failed", null, FAILED_SUMMARY, [], []);
    return { kind: "failed" };
  }
}
