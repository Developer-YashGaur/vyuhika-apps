import { AnalyzeError } from "@/lib/analyze/errors";
import { SYSTEM_INSTRUCTION, buildUserPrompt } from "@/lib/analyze/prompt";
import { enforceHonesty, matchResultJsonSchema, matchResultSchema } from "@/lib/analyze/schema";
import type { MatchResult } from "@/lib/types";

// Asks the AI for a match, checks the answer, and retries once if the answer is broken.

// One call to the AI. Passed in as a parameter so tests can use a fake instead of Gemini.
export type GenerateFn = (request: {
  systemInstruction: string;
  prompt: string;
  jsonSchema: Record<string, unknown>;
  signal: AbortSignal;
}) => Promise<string | undefined>;

// The whole analysis (including the retry) must finish within this time.
export const ANALYZE_TIMEOUT_MS = 30_000;

const MAX_ATTEMPTS = 2; // the first try, plus one retry if the answer is invalid

// Parses and checks the AI's answer. Returns null if it isn't valid JSON in the right shape.
export function parseAiResponse(text: string | undefined): MatchResult | null {
  if (!text) return null;
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return null;
  }
  const checked = matchResultSchema.safeParse(json);
  return checked.success ? checked.data : null;
}

export async function analyzeMatch(
  resume: string,
  jobDescription: string,
  generate: GenerateFn,
  timeoutMs = ANALYZE_TIMEOUT_MS,
): Promise<MatchResult> {
  const signal = AbortSignal.timeout(timeoutMs);
  const request = {
    systemInstruction: SYSTEM_INSTRUCTION,
    prompt: buildUserPrompt(resume, jobDescription),
    jsonSchema: matchResultJsonSchema(),
    signal,
  };

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    let text: string | undefined;
    try {
      text = await generate(request);
    } catch (error) {
      throw toAnalyzeError(error, signal);
    }

    const result = parseAiResponse(text);
    if (result) return enforceHonesty(result, resume, jobDescription);

    // Log only the fact that it failed, never the resume, job description or AI answer.
    console.warn(`[analyze] AI answer failed validation (attempt ${attempt} of ${MAX_ATTEMPTS})`);
  }

  throw new AnalyzeError("ai-failed");
}

// Turns any error from the AI call into one of our safe, friendly errors.
function toAnalyzeError(error: unknown, signal: AbortSignal): AnalyzeError {
  if (signal.aborted) return new AnalyzeError("timeout");

  const status = (error as { status?: unknown })?.status;
  // Log only the error type and HTTP status; the message could echo request details.
  console.error("[analyze] AI request failed", { name: (error as Error)?.name, status });

  if (status === 429) {
    return new AnalyzeError("rate-limited", "Our AI service is busy right now. Please try again in a minute.");
  }
  return new AnalyzeError("ai-failed");
}
