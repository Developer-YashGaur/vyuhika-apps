// Everything that can go wrong when analyzing a match, with a friendly message for each.
// Shared by the API route (server) and the page (browser), so this file must never hold secrets.

export type AnalyzeErrorCode = "invalid-input" | "rate-limited" | "timeout" | "ai-failed" | "offline";

export const ANALYZE_ERROR_MESSAGES: Record<AnalyzeErrorCode, string> = {
  "invalid-input": "Please check your resume and job description, then try again.",
  "rate-limited": "You've made a lot of requests in a short time. Please wait a minute and try again.",
  timeout: "The analysis took too long. Please try again in a moment.",
  "ai-failed": "Our AI couldn't analyze this right now. Please try again in a moment.",
  offline: "You seem to be offline. Check your internet connection and try again.",
};

export class AnalyzeError extends Error {
  code: AnalyzeErrorCode;

  constructor(code: AnalyzeErrorCode, message = ANALYZE_ERROR_MESSAGES[code]) {
    super(message);
    this.name = "AnalyzeError";
    this.code = code;
  }
}
