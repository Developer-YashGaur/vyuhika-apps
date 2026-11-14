import { AI_TIMEOUT_MS, generateJson, parseJsonAnswer, type GenerateFn } from "@/lib/ai/generate-json";
import { SYSTEM_INSTRUCTION, buildUserPrompt } from "@/lib/analyze/prompt";
import { enforceHonesty, matchResultSchema } from "@/lib/analyze/schema";
import type { MatchResult } from "@/lib/types";

// Asks the AI for a match (with one retry, see lib/ai/generate-json.ts), then applies our honesty checks.

export type { GenerateFn } from "@/lib/ai/generate-json";

// Parses and checks the AI's answer. Returns null if it isn't valid JSON in the right shape.
export function parseAiResponse(text: string | undefined): MatchResult | null {
  return parseJsonAnswer(text, matchResultSchema);
}

export async function analyzeMatch(
  resume: string,
  jobDescription: string,
  generate: GenerateFn,
  timeoutMs = AI_TIMEOUT_MS,
): Promise<MatchResult> {
  const result = await generateJson({
    systemInstruction: SYSTEM_INSTRUCTION,
    prompt: buildUserPrompt(resume, jobDescription),
    schema: matchResultSchema,
    generate,
    logLabel: "analyze",
    timeoutMs,
  });
  return enforceHonesty(result, resume, jobDescription);
}
