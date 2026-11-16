import { COMPANY_MAX, HIGHLIGHT_MAX, ROLE_MAX, type LetterLength, type Tone } from "@/lib/cover-letter/schema";
import { MAX_CHARS, MIN_CHARS, countChars } from "@/lib/text-rules";

// Small pure helpers for the Cover Letter Writer form (no React in here, so they are easy to test).

// The limits of the optional fields come from the schema the server uses, so they can never drift apart.
export const FIELD_LIMITS = { company: COMPANY_MAX, role: ROLE_MAX, highlight: HIGHLIGHT_MAX } as const;

// A resume shorter than this (about one page) gives the AI little to work with.
export const SHORT_RESUME_CHARS = 1200;

export const TONE_OPTIONS: { value: Tone; label: string; hint: string }[] = [
  { value: "professional", label: "Professional", hint: "Formal and measured" },
  { value: "friendly", label: "Friendly", hint: "Warm and conversational" },
  { value: "confident", label: "Confident", hint: "Direct and results-first" },
];

export const LENGTH_OPTIONS: { value: LetterLength; label: string; hint: string }[] = [
  { value: "short", label: "Short", hint: "About 150 to 200 words" },
  { value: "medium", label: "Medium", hint: "About 260 to 340 words" },
];

export const DEFAULT_TONE: Tone = "professional";
export const DEFAULT_LENGTH: LetterLength = "short";

function isValidLength(text: string): boolean {
  const count = countChars(text);
  return count >= MIN_CHARS && count <= MAX_CHARS;
}

// The "Write my cover letter" button is enabled only when both long boxes have a valid length.
export function canWrite(resume: string, jobDescription: string): boolean {
  return isValidLength(resume) && isValidLength(jobDescription);
}

// The line under the button. Same wording style as the Resume Matcher.
export function writeHint(resume: string, jobDescription: string): string {
  if (canWrite(resume, jobDescription)) return "Ready when you are.";
  if (countChars(resume) > MAX_CHARS || countChars(jobDescription) > MAX_CHARS) {
    return `Each box can hold up to ${MAX_CHARS.toLocaleString("en-US")} characters. Please shorten the text.`;
  }
  return `Add at least ${MIN_CHARS} characters to each box to continue.`;
}

// True when the resume has some text but is short enough that a Short letter usually reads better.
// An empty box is not "short", it is just not filled in yet.
export function suggestShort(resume: string): boolean {
  const count = countChars(resume);
  return count > 0 && count < SHORT_RESUME_CHARS;
}

// Short is picked for the person only at the moment the resume becomes short
// (for example after loading a short file). After that they can still choose Medium.
export function shouldPreselectShort(oldResume: string, newResume: string): boolean {
  return !suggestShort(oldResume) && suggestShort(newResume);
}
