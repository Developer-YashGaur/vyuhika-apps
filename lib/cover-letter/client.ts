import { AI_ERROR_MESSAGES, AiError } from "@/lib/ai/errors";
import { postJson } from "@/lib/api/post-json";
import { COVER_LETTER_ERROR_MESSAGES } from "@/lib/cover-letter/errors";
import type { CoverLetterInput, CoverLetterResult } from "@/lib/cover-letter/schema";

// Runs in the browser: asks our /api/cover-letter route to write a letter.
// Like the Resume Matcher's client, every failure becomes a friendly AiError, here in the letter app's words.

// What the route sends back: the AI's answer plus `notes` (names of style checks the letter still fails).
export type CoverLetterResponse = CoverLetterResult & { notes: string[] };

function looksRight(data: unknown): boolean {
  const answer = data as Partial<CoverLetterResponse> | null;
  return typeof answer?.letter === "string" && answer.letter.length > 0 && Array.isArray(answer.gaps);
}

export async function requestCoverLetter(
  input: CoverLetterInput,
  fetchFn: typeof fetch = fetch,
): Promise<CoverLetterResponse> {
  // Only the fields the server accepts (its schema is strict), and blank optional fields are left out.
  const body = {
    resume: input.resume,
    jobDescription: input.jobDescription,
    companyName: input.companyName?.trim() || undefined,
    roleTitle: input.roleTitle?.trim() || undefined,
    highlight: input.highlight?.trim() || undefined,
    tone: input.tone,
    length: input.length,
  };

  try {
    return await postJson<CoverLetterResponse>("/api/cover-letter", body, looksRight, fetchFn);
  } catch (error) {
    // The route already words its own errors. Only messages that postJson filled in
    // with the Resume Matcher's default wording are swapped for the letter app's wording.
    if (error instanceof AiError && error.message === AI_ERROR_MESSAGES[error.code]) {
      throw new AiError(error.code, COVER_LETTER_ERROR_MESSAGES[error.code]);
    }
    throw error;
  }
}
