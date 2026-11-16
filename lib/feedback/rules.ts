import type { HighlightHandling, LetterLength, Tone } from "@/lib/cover-letter/schema";
import type { MatchResult } from "@/lib/types";

// Feedback rules shared by the browser (form) and the server (API route).

export const FEEDBACK_TYPES = [
  { value: "bug", label: "Bug" },
  { value: "wrong-result", label: "Wrong result" },
  { value: "idea", label: "Idea" },
  { value: "other", label: "Other" },
] as const;

export type FeedbackType = (typeof FEEDBACK_TYPES)[number]["value"];

export const MESSAGE_MIN = 10;
export const MESSAGE_MAX = 2000;
export const EMAIL_MAX = 254;

// The only page where results can be attached to a "Wrong result" report.
export const MATCHER_PATH = "/apps/resume-matcher";

// The Cover Letter Writer's page. Its reports may attach counts and settings only (see LetterFeedbackDebug).
export const COVER_LETTER_PATH = "/apps/cover-letter-writer";

// The parts of a result that may be attached to feedback. Never the resume or job text.
export type FeedbackDebug = Pick<MatchResult, "score" | "summary" | "matchedKeywords" | "missingKeywords">;

// Copies only the allowed fields, so nothing else on the result object can slip through.
export function pickDebugInfo(result: FeedbackDebug): FeedbackDebug {
  return {
    score: result.score,
    summary: result.summary,
    matchedKeywords: [...result.matchedKeywords],
    missingKeywords: [...result.missingKeywords],
  };
}

// What a "Wrong result" report from the Cover Letter Writer may attach: settings, counts and yes/no answers.
// Never the letter, resume, job text, company, role, highlight, highlightEvidence or gap labels.
export type LetterFeedbackDebug = {
  tone: Tone;
  length: LetterLength;
  wordCount: number;
  blanks: number; // blanks still in the letter when the report is sent
  companyFilled: boolean;
  roleFilled: boolean;
  highlightFilled: boolean;
  highlightHandling: HighlightHandling;
  notes: string[]; // names of the server's style notes, for example ["length"]
};

// A simple check (something@something.something), good enough to catch typos.
export function isValidEmail(email: string): boolean {
  return email.length <= EMAIL_MAX && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Removes HTML tags and invisible control characters (keeps line breaks and tabs).
export function stripHtml(text: string): string {
  return text
    .replace(/<[^>]*>?/g, "")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
    .trim();
}

// A short, human summary like "Chrome on macOS, 1440×900 window".
export function describeBrowser(userAgent: string, width: number, height: number): string {
  const browser = /Edg\//.test(userAgent)
    ? "Edge"
    : /OPR\/|Opera/.test(userAgent)
      ? "Opera"
      : /Firefox\//.test(userAgent)
        ? "Firefox"
        : /Chrome\//.test(userAgent)
          ? "Chrome"
          : /Safari\//.test(userAgent)
            ? "Safari"
            : "Unknown browser";
  const os = /iPhone|iPad|iPod/.test(userAgent)
    ? "iOS"
    : /Android/.test(userAgent)
      ? "Android"
      : /Windows/.test(userAgent)
        ? "Windows"
        : /Mac OS X|Macintosh/.test(userAgent)
          ? "macOS"
          : /Linux/.test(userAgent)
            ? "Linux"
            : "unknown OS";
  return `${browser} on ${os}, ${Math.round(width)}×${Math.round(height)} window`;
}
