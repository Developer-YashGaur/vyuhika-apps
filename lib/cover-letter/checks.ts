import { containsDelimiter } from "@/lib/ai/delimiters";
import { BANNED_CLICHES } from "@/lib/cover-letter/cliches";
import { TARGET_WORDS } from "@/lib/cover-letter/prompt";
import type { CoverLetterInput, CoverLetterResult, LetterLength } from "@/lib/cover-letter/schema";

// A safety net on top of the prompt: checks the AI's letter before it reaches the person.
// Each check returns plain-English problems; they are sent back to the AI with its one retry.

// Allowed word counts (placeholders not counted). Wider than what the prompt asks for, on purpose.
export const WORD_LIMITS: Record<LetterLength, { min: number; max: number }> = {
  short: { min: 120, max: 240 },
  medium: { min: 210, max: 420 },
};

// Text in square brackets, like [add a real example of X here].
const PLACEHOLDER = /\[[^[\]\n]+\]/g;

// A number like 4, 2022, 20,000, 1000 or 4.5, optionally followed by "%", "percent" or "per cent".
const NUMBER = /(\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?)(\s*(?:%|percent\b|per cent\b))?/gi;

// ---------- helpers ----------

function withoutPlaceholders(text: string): string {
  return text.replace(PLACEHOLDER, " ");
}

// "[Add  a real Example here]" and "add a real example here" both become "add a real example here".
function placeholderKey(text: string): string {
  return text.replace(/^\[|\]$/g, "").replace(/\s+/g, " ").trim().toLowerCase();
}

const isYourName = (placeholder: string) => placeholderKey(placeholder) === "your name";

type FoundNumber = { raw: string; value: string; percent: boolean };

// Every number in the text, written the same way: "1,000" and "1000" both have the value "1000",
// and "20%", "20 %" and "20 percent" are all 20 percent.
export function findNumbers(text: string): FoundNumber[] {
  return [...text.matchAll(NUMBER)].map((match) => ({
    raw: match[0].trim(),
    value: String(Number(match[1].replace(/,/g, ""))),
    percent: Boolean(match[2]),
  }));
}

// Word count, not counting placeholders. A "word" is anything with a letter or digit in it.
export function countWords(letter: string): number {
  return withoutPlaceholders(letter)
    .split(/\s+/)
    .filter((word) => /[a-z0-9]/i.test(word)).length;
}

// ---------- the checks ----------

// (a) Every number in the letter must come from what the person gave us.
// A percentage must be a percentage there too; a plain number may match either.
export function checkNumbers(letter: string, input: CoverLetterInput): string[] {
  const sources = [input.resume, input.jobDescription, input.companyName, input.roleTitle, input.highlight]
    .filter(Boolean)
    .join("\n");
  const known = findNumbers(sources);
  const problems: string[] = [];

  for (const found of findNumbers(withoutPlaceholders(letter))) {
    const ok = known.some((k) => k.value === found.value && (k.percent || !found.percent));
    const message = `The number "${found.raw}" is not in the resume or the other details. Remove it, or use a placeholder instead.`;
    if (!ok && !problems.includes(message)) problems.push(message);
  }
  return problems;
}

// (b) No banned clichés, ignoring case and curly apostrophes, as whole words.
export function checkCliches(letter: string): string[] {
  const text = letter.replace(/[\u2018\u2019]/g, "'").replace(/\s+/g, " ");
  return BANNED_CLICHES.filter((cliche) => {
    const escaped = cliche.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/ /g, "\\s+");
    return new RegExp(`(?<![a-z])${escaped}(?![a-z])`, "i").test(text);
  }).map((cliche) => `The letter uses the cliché "${cliche}". Rewrite that sentence without it.`);
}

// (c) Placeholders and gaps must match one to one. [Your name] is always allowed and needs no gap.
export function checkPlaceholders(result: CoverLetterResult): string[] {
  const inLetter = [...result.letter.matchAll(PLACEHOLDER)].map((m) => m[0]).filter((p) => !isYourName(p));
  const letterKeys = new Set(inLetter.map(placeholderKey));
  const gapKeys = new Set(result.gaps.map((gap) => placeholderKey(gap.placeholder)));
  const problems: string[] = [];

  for (const placeholder of new Set(inLetter)) {
    if (!gapKeys.has(placeholderKey(placeholder))) {
      problems.push(`The placeholder "${placeholder}" is in the letter but not listed in gaps.`);
    }
  }
  for (const gap of result.gaps) {
    if (isYourName(gap.placeholder)) continue;
    if (!letterKeys.has(placeholderKey(gap.placeholder))) {
      problems.push(`The gap placeholder "${gap.placeholder}" does not appear in the letter, word for word.`);
    }
  }
  return problems;
}

// (d) The word count fits the chosen length, with slack.
export function checkLength(letter: string, length: LetterLength): string[] {
  const words = countWords(letter);
  const { min, max } = WORD_LIMITS[length];
  if (words >= min && words <= max) return [];
  return [
    `The letter has ${words} words, not counting placeholders. It must have ${min} to ${max} (aim for ${TARGET_WORDS[length]}).`,
  ];
}

// (e) None of our delimiter markers may leak into the letter or the gaps.
export function checkDelimiters(result: CoverLetterResult): string[] {
  const texts = [result.letter, ...result.gaps.flatMap((gap) => [gap.need, gap.placeholder])];
  return texts.some(containsDelimiter)
    ? ["The answer contains a delimiter marker like <<<..._START>>>. Remove every marker."]
    : [];
}

// All checks together. An empty list means the letter is fine.
export function findProblems(result: CoverLetterResult, input: CoverLetterInput): string[] {
  return [
    ...checkNumbers(result.letter, input),
    ...checkCliches(result.letter),
    ...checkPlaceholders(result),
    ...checkLength(result.letter, input.length),
    ...checkDelimiters(result),
  ];
}
