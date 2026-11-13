// Input rules for the Resume Matcher.

export const MIN_CHARS = 200;
// About 6-8 pages of text. Longer input is almost always a paste mistake, and it costs more to analyze.
export const MAX_CHARS = 15000;

// Removes spaces and blank lines at the start and end.
export function cleanText(text: string): string {
  return text.trim();
}

// How many real characters the text has (ignoring outer whitespace).
export function countChars(text: string): number {
  return cleanText(text).length;
}

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
