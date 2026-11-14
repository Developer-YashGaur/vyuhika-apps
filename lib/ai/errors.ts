// Everything that can go wrong when an app asks the AI for an answer, with a friendly message for each.
// Shared by the API routes (server) and the pages (browser), so this file must never hold secrets.

export type AiErrorCode = "invalid-input" | "rate-limited" | "timeout" | "ai-failed" | "offline";

// The default messages (written for the Resume Matcher, the first app).
export const AI_ERROR_MESSAGES: Record<AiErrorCode, string> = {
  "invalid-input": "Please check your resume and job description, then try again.",
  "rate-limited": "You've made a lot of requests in a short time. Please wait a minute and try again.",
  timeout: "The analysis took too long. Please try again in a moment.",
  "ai-failed": "Our AI couldn't analyze this right now. Please try again in a moment.",
  offline: "You seem to be offline. Check your internet connection and try again.",
};

export class AiError extends Error {
  code: AiErrorCode;

  constructor(code: AiErrorCode, message = AI_ERROR_MESSAGES[code]) {
    super(message);
    this.name = "AiError";
    this.code = code;
  }
}
