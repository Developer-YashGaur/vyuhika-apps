import type { CoverLetterGap } from "@/lib/cover-letter/schema";

// Small pure helpers for the Cover Letter Writer result view (no React in here, so they are easy to test).

// A range of characters in the letter. `end` is just after the closing bracket (like setSelectionRange).
export type Range = { start: number; end: number };

export function countWords(text: string): number {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

// Every [placeholder] in the letter, in order. A placeholder is text in square brackets on one line.
// "[Your name]" counts too: a letter signed with it still needs filling in.
export function findPlaceholders(text: string): Range[] {
  return [...text.matchAll(/\[[^[\]\n]+\]/g)].map((match) => ({
    start: match.index,
    end: match.index + match[0].length,
  }));
}

// The first placeholder that starts at or after `from` (usually the end of the current selection),
// or the first one in the letter when there is none after it. Null when the letter has no placeholders.
export function nextPlaceholderRange(text: string, from: number): Range | null {
  const all = findPlaceholders(text);
  return all.find((range) => range.start >= from) ?? all[0] ?? null;
}

// "2 blanks still to fill", or "All blanks filled" when none are left.
export function blanksLabel(count: number): string {
  if (count === 0) return "All blanks filled";
  return `${count} ${count === 1 ? "blank" : "blanks"} still to fill`;
}

// Where a gap's blank sits in the letter now. Null when the person has deleted or rewritten it.
export function gapRange(letter: string, gap: CoverLetterGap): Range | null {
  const start = letter.indexOf(gap.placeholder);
  return start === -1 ? null : { start, end: start + gap.placeholder.length };
}

export function isGapFilled(letter: string, gap: CoverLetterGap): boolean {
  return gapRange(letter, gap) === null;
}

// "cover-letter-nimbus-cloud.txt" from the company name, or "cover-letter.txt" when there is nothing usable.
export function downloadFilename(companyName: string | undefined): string {
  const slug = (companyName ?? "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // accents: é → e
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/, "");
  return slug ? `cover-letter-${slug}.txt` : "cover-letter.txt";
}

// Regenerate asks "Replace your edits?" only when the letter differs from what the AI wrote.
export function needsReplaceConfirm(current: string, original: string): boolean {
  return current !== original;
}

const HIGHLIGHT_NOTE =
  "Your resume doesn't show what you wanted to highlight, so we left it out. Add it to your resume, or write it in yourself.";
const LENGTH_NOTE = "This letter is a bit shorter or longer than you picked. You can edit it freely.";
const POLISH_NOTE = "A few lines may need a quick polish. Read it through once before you send it.";

// The style checks that share one friendly message.
const POLISH_CHECKS = ["placement", "opening", "cliche", "resume-mention", "placeholder-wording"];

// Turns the server's `notes` (check names) into friendly messages. The check names are never shown,
// and names we don't know are ignored.
export function noteMessages(notes: string[]): string[] {
  const messages: string[] = [];
  if (notes.includes("highlight-not-addressed")) messages.push(HIGHLIGHT_NOTE);
  if (notes.includes("length")) messages.push(LENGTH_NOTE);
  if (notes.some((note) => POLISH_CHECKS.includes(note))) messages.push(POLISH_NOTE);
  return messages;
}
