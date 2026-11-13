import { ANALYZE_ERROR_MESSAGES, AnalyzeError, type AnalyzeErrorCode } from "@/lib/analyze/errors";
import type { MatchResult } from "@/lib/types";

// Runs in the browser: sends the text to our own API route (never to Google directly)
// and turns every kind of failure into a friendly AnalyzeError.

// A bit longer than the server's own 30-second limit, so the server can answer first.
const CLIENT_TIMEOUT_MS = 40_000;

const KNOWN_CODES = Object.keys(ANALYZE_ERROR_MESSAGES) as AnalyzeErrorCode[];

export async function requestAnalysis(
  resume: string,
  jobDescription: string,
  fetchFn: typeof fetch = fetch,
): Promise<MatchResult> {
  if (typeof navigator !== "undefined" && navigator.onLine === false) throw new AnalyzeError("offline");

  let response: Response;
  try {
    response = await fetchFn("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resume, jobDescription }),
      signal: AbortSignal.timeout(CLIENT_TIMEOUT_MS),
    });
  } catch (error) {
    if ((error as Error)?.name === "TimeoutError") throw new AnalyzeError("timeout");
    // fetch throws a TypeError when the network is down.
    throw new AnalyzeError("offline");
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const code = data?.error?.code;
    const message = data?.error?.message;
    if (KNOWN_CODES.includes(code)) throw new AnalyzeError(code, typeof message === "string" ? message : undefined);
    throw new AnalyzeError(response.status === 429 ? "rate-limited" : "ai-failed");
  }

  if (!data || typeof data.score !== "number") throw new AnalyzeError("ai-failed");
  return data as MatchResult;
}
