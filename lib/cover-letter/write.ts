import { AI_TIMEOUT_MS, generateJson, type GenerateFn } from "@/lib/ai/generate-json";
import { countWords, findProblems, styleNotes, type CheckName } from "@/lib/cover-letter/checks";
import { COVER_LETTER_ERROR_MESSAGES } from "@/lib/cover-letter/errors";
import { SYSTEM_INSTRUCTION, buildUserPrompt } from "@/lib/cover-letter/prompt";
import { coverLetterResultSchema, type CoverLetterInput, type CoverLetterResult } from "@/lib/cover-letter/schema";

// Asks the AI for a cover letter and runs our safety checks on it (see lib/cover-letter/checks.ts).
// If the answer is broken or fails a check, the AI gets one retry that says what was wrong.
// After that: a failed must-pass check means a friendly error; failed style checks come back as `notes`.

export type CoverLetter = CoverLetterResult & { notes: CheckName[] };

export async function writeCoverLetter(
  input: CoverLetterInput,
  generate: GenerateFn,
  timeoutMs = AI_TIMEOUT_MS,
): Promise<CoverLetter> {
  const result = await generateJson({
    systemInstruction: SYSTEM_INSTRUCTION,
    prompt: buildUserPrompt(input),
    schema: coverLetterResultSchema,
    generate,
    logLabel: "cover-letter",
    timeoutMs,
    check: (answer) => findProblems(answer, input),
    logNumbers: (answer) => ({ words: countWords(answer.letter) }),
    messages: COVER_LETTER_ERROR_MESSAGES,
  });
  return { ...result, notes: styleNotes(result, input) };
}
