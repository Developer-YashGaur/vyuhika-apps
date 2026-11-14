import { AI_TIMEOUT_MS, generateJson, type GenerateFn } from "@/lib/ai/generate-json";
import { findProblems } from "@/lib/cover-letter/checks";
import { COVER_LETTER_ERROR_MESSAGES } from "@/lib/cover-letter/errors";
import { SYSTEM_INSTRUCTION, buildUserPrompt } from "@/lib/cover-letter/prompt";
import { coverLetterResultSchema, type CoverLetterInput, type CoverLetterResult } from "@/lib/cover-letter/schema";

// Asks the AI for a cover letter and runs our safety checks on it (see lib/cover-letter/checks.ts).
// If the answer is broken or fails a check, the AI gets one retry that says what was wrong;
// after that, the person sees a friendly error (see lib/ai/generate-json.ts).

export async function writeCoverLetter(
  input: CoverLetterInput,
  generate: GenerateFn,
  timeoutMs = AI_TIMEOUT_MS,
): Promise<CoverLetterResult> {
  return generateJson({
    systemInstruction: SYSTEM_INSTRUCTION,
    prompt: buildUserPrompt(input),
    schema: coverLetterResultSchema,
    generate,
    logLabel: "cover-letter",
    timeoutMs,
    check: (result) => findProblems(result, input),
    messages: COVER_LETTER_ERROR_MESSAGES,
  });
}
