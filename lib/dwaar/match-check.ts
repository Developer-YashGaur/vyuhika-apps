import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { analyzeMatch, type GenerateFn } from "@/lib/analyze/analyze";
import { toStringList } from "@/lib/dwaar/requests";
import { finalizeMatchResult, prepareUntrustedText } from "@/lib/dwaar/resume-safety";

// The resume match check, done BEFORE a request is sent. It cleans the texts, asks the AI (or reuses the answer from the
// last 2 hours for the same resume and job), records it for the daily limit, and says whether the score is high enough.
// The check never throws. The AI function is passed in, so tests can use a fake one.

type Db = SupabaseClient<Database>;

// The lowest score that may send a request. Raise it later, when there is real data on how scores and referrals relate.
export const MIN_SCORE = 60;

export type Tip = { title: string; detail: string };
export type CheckResult = { hash: string; score: number; summary: string; strengths: string[]; gaps: string[]; tips: Tip[]; model: string };

export type CheckOutcome =
  | { kind: "done"; result: CheckResult }
  | { kind: "limit" } // today's 5 checks are used up
  | { kind: "failed" } // the AI could not check it
  | { kind: "unavailable" }; // checking is not switched on on this server

// What the page shows.
export type CheckView = { score: number; passed: boolean; minScore: number; summary: string; strengths: string[]; gaps: string[]; tips: Tip[] };

type Deps = { supabase: Db; secret: string | null; generate: GenerateFn | null; model: string };

const DAILY_LIMIT = 5;

export function toView(result: CheckResult): CheckView {
  return {
    score: result.score,
    passed: result.score >= MIN_SCORE,
    minScore: MIN_SCORE,
    summary: result.summary,
    strengths: result.strengths,
    gaps: result.gaps,
    tips: result.tips,
  };
}

export function toTips(value: unknown): Tip[] {
  if (!Array.isArray(value)) return [];
  const tips: Tip[] = [];
  for (const item of value) {
    if (item && typeof item === "object" && typeof (item as Tip).title === "string" && typeof (item as Tip).detail === "string") {
      tips.push({ title: (item as Tip).title, detail: (item as Tip).detail });
    }
  }
  return tips.slice(0, 5);
}

// Same resume + same job text = same fingerprint (SHA-256), so a "check" and the "send" that follows share one AI call.
export async function fingerprint(resume: string, job: string): Promise<string> {
  const bytes = new TextEncoder().encode(`${resume}\n-----\n${job}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function runCheck({ supabase, secret, generate, model }: Deps, args: { resumeText: string; jobDescription: string }): Promise<CheckOutcome> {
  if (!secret || !generate) return { kind: "unavailable" };

  const resume = prepareUntrustedText(args.resumeText);
  const job = prepareUntrustedText(args.jobDescription);
  const hash = await fingerprint(resume.text, job.text);

  // Already checked in the last 2 hours? Use that answer: no AI call, no extra use of today's limit.
  const found = await supabase.rpc("dwaar_find_check", { p_secret: secret, p_hash: hash });
  if (found.error) return { kind: "failed" };
  const row = found.data?.[0];
  if (row && typeof row.out_score === "number") {
    return {
      kind: "done",
      result: {
        hash,
        score: row.out_score,
        summary: row.out_summary ?? "",
        strengths: toStringList(row.out_strengths),
        gaps: toStringList(row.out_gaps),
        tips: toTips(row.out_tips),
        model: row.out_model ?? model,
      },
    };
  }

  const used = await supabase.rpc("dwaar_analyses_used_today");
  if (used.error || typeof used.data !== "number") return { kind: "failed" };
  if (used.data >= DAILY_LIMIT) return { kind: "limit" };

  try {
    const raw = await analyzeMatch(resume.text, job.text, generate);
    const clean = finalizeMatchResult(raw, resume.flagged || job.flagged);
    const result: CheckResult = {
      hash,
      score: clean.score,
      summary: clean.summary,
      strengths: clean.matchedKeywords.slice(0, 10),
      gaps: clean.missingKeywords.slice(0, 10),
      tips: clean.suggestions.slice(0, 3),
      model,
    };
    const saved = await supabase.rpc("dwaar_record_check", {
      p_secret: secret,
      p_hash: hash,
      p_score: result.score,
      p_summary: result.summary,
      p_strengths: result.strengths,
      p_gaps: result.gaps,
      p_tips: result.tips,
      p_model: model,
    });
    if (saved.error) {
      console.error("[dwaar] recording the check failed:", saved.error.code);
      return saved.error.code === "DW015" ? { kind: "limit" } : { kind: "failed" };
    }
    return { kind: "done", result };
  } catch (error) {
    // Log the kind of failure only, never the resume or job text.
    console.error("[dwaar] the check failed:", (error as Error)?.name);
    return { kind: "failed" };
  }
}

// After the request exists: keep the score with it, so the candidate sees it on "My requests".
export async function saveCheckedScore(supabase: Db, secret: string, requestId: string, result: CheckResult): Promise<boolean> {
  const saved = await supabase.rpc("dwaar_save_analysis", {
    p_request_id: requestId,
    p_secret: secret,
    p_status: "done",
    p_score: result.score,
    p_summary: result.summary,
    p_strengths: result.strengths,
    p_gaps: result.gaps,
    p_model: result.model,
  });
  if (saved.error) console.error("[dwaar] saving the score failed:", saved.error.code);
  return !saved.error;
}

export const CHECK_MESSAGES = {
  limit: "You have used today's 5 resume checks. Please try again tomorrow.",
  failed: "We could not check your resume right now. Please try again in a moment.",
  unavailable: "Resume checking is not available right now. Please try again later.",
  below: (score: number, min: number) =>
    `Your match score is ${score}. It needs to be ${min} or more to send a request. Use the tips below to improve your resume, then check again.`,
} as const;
