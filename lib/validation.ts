import { MAX_CHARS, MIN_CHARS, countChars } from "@/lib/text-rules";

// Input rules for the Resume Matcher. The shared length rules live in lib/text-rules.ts.

export function isLongEnough(text: string): boolean {
  return countChars(text) >= MIN_CHARS;
}

export function isTooLong(text: string): boolean {
  return countChars(text) > MAX_CHARS;
}

// Between the minimum and maximum length (inclusive).
export function isValidLength(text: string): boolean {
  return isLongEnough(text) && !isTooLong(text);
}

// The Analyze button is enabled only when both boxes have a valid length.
export function canAnalyze(resume: string, jobDescription: string): boolean {
  return isValidLength(resume) && isValidLength(jobDescription);
}

// A short label for the score gauge.
export function scoreLabel(score: number): string {
  if (score >= 75) return "Strong match";
  if (score >= 50) return "Fair match";
  return "Weak match";
}
