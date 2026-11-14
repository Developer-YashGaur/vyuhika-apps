import type { AiErrorCode } from "@/lib/ai/errors";

// The Cover Letter Writer's own friendly message for each error.
// Shared by the server and the page, so this file must never hold secrets.

export const COVER_LETTER_ERROR_MESSAGES: Record<AiErrorCode, string> = {
  "invalid-input": "Please check your resume and job description, then try again.",
  "rate-limited": "You've written a lot of letters in a short time. Please wait a minute and try again.",
  timeout: "Writing your letter took too long. Please try again in a moment.",
  "ai-failed": "Our AI couldn't write this letter right now. Please try again in a moment.",
  offline: "You seem to be offline. Check your internet connection and try again.",
};
