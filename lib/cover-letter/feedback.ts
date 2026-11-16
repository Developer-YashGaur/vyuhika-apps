import { countWords, findPlaceholders } from "@/lib/cover-letter/result";
import type { HighlightHandling, LetterLength, Tone } from "@/lib/cover-letter/schema";
import type { LetterFeedbackDebug } from "@/lib/feedback/rules";

// What a "Wrong result" report may attach from the Cover Letter Writer: settings and counts only.
// Nothing in here ever holds text from the person's inputs or from the letter.

// The server's style notes (names only). Anything else is dropped, so no free text can slip in.
// tests/cover-letter-feedback.test.ts keeps this list in step with SEVERITY in checks.ts.
export const NOTE_NAMES = [
  "length",
  "cliche",
  "opening",
  "resume-mention",
  "placeholder-wording",
  "placement",
  "highlight-not-addressed",
] as const;

export type SummaryInput = {
  tone: Tone;
  length: LetterLength;
  letter: string; // only counted, never stored
  filled: { company: boolean; role: boolean; highlight: boolean };
  highlightHandling: HighlightHandling;
  notes: string[];
};

// Builds the summary at the moment a letter arrives. The letter text is only counted here.
export function buildLetterFeedbackDebug(input: SummaryInput): LetterFeedbackDebug {
  return {
    tone: input.tone,
    length: input.length,
    wordCount: countWords(input.letter),
    blanks: findPlaceholders(input.letter).length,
    companyFilled: input.filled.company,
    roleFilled: input.filled.role,
    highlightFilled: input.filled.highlight,
    highlightHandling: input.highlightHandling,
    notes: NOTE_NAMES.filter((name) => input.notes.includes(name)),
  };
}

// Copies only the allowed fields, so nothing else on the object can slip through.
export function pickLetterDebugInfo(info: LetterFeedbackDebug): LetterFeedbackDebug {
  return {
    tone: info.tone,
    length: info.length,
    wordCount: info.wordCount,
    blanks: info.blanks,
    companyFilled: info.companyFilled,
    roleFilled: info.roleFilled,
    highlightFilled: info.highlightFilled,
    highlightHandling: info.highlightHandling,
    notes: [...info.notes],
  };
}
