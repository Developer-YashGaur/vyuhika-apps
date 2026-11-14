import { containsDelimiter } from "@/lib/ai/delimiters";
import type { CheckProblem } from "@/lib/ai/generate-json";
import { BANNED_CLICHES, BANNED_OPENINGS, PLACEHOLDER_HEDGES, RESUME_MENTIONS } from "@/lib/cover-letter/cliches";
import { LENGTH_GUIDE, MAX_GAPS } from "@/lib/cover-letter/prompt";
import type { CoverLetterInput, CoverLetterResult, LetterLength } from "@/lib/cover-letter/schema";

// A safety net on top of the prompt: checks the AI's letter before it reaches the person.
// Each check returns plain-English problems; they are sent back to the AI with its one retry.
//
// Two kinds of checks (see SEVERITY at the bottom):
// - must-pass (honesty and safety): if one still fails after the retry, the person gets a friendly error;
// - should-pass (style): if one still fails after the retry, the letter is returned anyway, and the
//   failed check names are listed in `notes` so the page can point them out.

// Allowed word counts (placeholders not counted). Wider than what the prompt asks for, on purpose.
export const WORD_LIMITS: Record<LetterLength, { min: number; max: number }> = {
  short: { min: 120, max: 240 },
  medium: { min: 210, max: 420 },
};

// Text in square brackets, like [add a real example of X here].
const PLACEHOLDER = /\[[^[\]\n]+\]/g;

// A number like 4, 2022, 20,000, 1000 or 4.5, optionally followed by "%", "percent" or "per cent".
const NUMBER = /(\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?)(\s*(?:%|percent\b|per cent\b))?/gi;

// Numbers written as words: zero to twenty, the tens, hundred and thousand.
const WORD_VALUES: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17,
  eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70,
  eighty: 80, ninety: 90, hundred: 100, thousand: 1000,
};
const NUMBER_WORD = `(?:${Object.keys(WORD_VALUES).join("|")})`;
// One or more number words in a row, like "four", "twenty-five" or "two hundred".
const WORD_RUN = `\\b${NUMBER_WORD}(?:[\\s-]+${NUMBER_WORD})*\\b`;
// The words that make a number word count as a claim, like "four years" or "twelve clients".
const UNIT = `(?:(?:years?|months?|weeks?|teams?|people|persons?|projects?|clients?|customers?|employees?|percent)\\b|%)`;
// In the letter: a number-word run directly followed by a unit ("one of" and "the first" never match).
const WORD_NUMBER_WITH_UNIT = new RegExp(`(${WORD_RUN})([\\s-]+${UNIT})`, "gi");
// In the inputs: any number-word run, with or without a unit.
const ANY_WORD_NUMBER = new RegExp(`(${WORD_RUN})(\\s*(?:percent\\b|%))?`, "gi");

// Leadership words, in families. If the letter uses one of the "inLetter" words, the resume must
// contain some word of the same family ("managed" in the letter is fine if the resume says "manager").
const LEADERSHIP_FAMILIES: { inLetter: string[]; inResume: string[] }[] = [
  { inLetter: ["lead", "leads", "led", "leading", "leadership"], inResume: ["lead", "leads", "led", "leading", "leadership", "leader", "leaders"] },
  { inLetter: ["manage", "manages", "managed", "managing", "management"], inResume: ["manage", "manages", "managed", "managing", "management", "manager", "managers"] },
  { inLetter: ["mentor", "mentors", "mentored", "mentoring"], inResume: ["mentor", "mentors", "mentored", "mentoring", "mentorship"] },
  { inLetter: ["supervised", "supervising"], inResume: ["supervise", "supervises", "supervised", "supervising", "supervisor", "supervision"] },
  { inLetter: ["headed"], inResume: ["head", "headed", "heading", "heads"] },
  { inLetter: ["directed"], inResume: ["directed", "directing", "director"] },
  { inLetter: ["oversaw", "oversee", "oversees", "overseeing"], inResume: ["oversaw", "oversee", "oversees", "overseeing", "overseen"] },
];

// Small words that say nothing about what a highlight is about.
const STOP_WORDS = new Set(
  "a an and are as at be been by for from had has have i in into is it its me my of on or our over so that the their them they this through to was we were with what when where which who will year years first".split(" "),
);

// ---------- helpers ----------

// Lowercase words, without placeholders.
function wordsOf(text: string): string[] {
  return withoutPlaceholders(text).toLowerCase().match(/[a-z]+/g) ?? [];
}

// A rough word stem, so "mentored", "mentoring" and "mentor" match: drops common endings.
function stem(word: string): string {
  return word.replace(/(ing|ers|er|ed|es|s)$/, "");
}

// The meaningful word stems in a text (no small words like "the" or "with").
function contentStems(text: string): Set<string> {
  return new Set(wordsOf(text).filter((w) => w.length > 2 && !STOP_WORDS.has(w)).map(stem));
}

// Lowercase, straight quotes and single spaces, for "does this phrase appear in the resume?".
function normalise(text: string): string {
  return plain(text).toLowerCase();
}

// The sentences of a text (split after . ! ? and at line breaks).
function sentencesOf(text: string): string[] {
  return text.split(/(?<=[.!?])\s+|\n+/).filter((s) => s.trim());
}

function withoutPlaceholders(text: string): string {
  return text.replace(PLACEHOLDER, " ");
}

// "[Add  a real Example here]" and "add a real example here" both become "add a real example here".
function placeholderKey(text: string): string {
  return text.replace(/^\[|\]$/g, "").replace(/\s+/g, " ").trim().toLowerCase();
}

const isYourName = (placeholder: string) => placeholderKey(placeholder) === "your name";

// The placeholders in a piece of text, except [Your name].
function placeholdersIn(text: string): string[] {
  return [...text.matchAll(PLACEHOLDER)].map((m) => m[0]).filter((p) => !isYourName(p));
}

// Straight apostrophes and single spaces, so phrase checks don't miss "I’m" or line breaks.
function plain(text: string): string {
  return text.replace(/[‘’]/g, "'").replace(/\s+/g, " ").trim();
}

// The first line of text after the greeting ("Dear ...,"), which starts the first sentence.
function firstSentenceLine(letter: string): string {
  const lines = letter.split("\n").map((line) => line.trim()).filter(Boolean);
  const start = /^dear\b/i.test(lines[0] ?? "") ? 1 : 0;
  return lines[start] ?? "";
}

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

// The value of a run of number words: "four" → 4, "twenty-five" → 25, "two hundred" → 200.
function wordsToNumber(run: string): number {
  let total = 0;
  let current = 0;
  for (const word of run.toLowerCase().split(/[\s-]+/)) {
    const value = WORD_VALUES[word];
    if (value === 100) current = (current || 1) * 100;
    else if (value === 1000) {
      total += (current || 1) * 1000;
      current = 0;
    } else current += value;
  }
  return total + current;
}

// Numbers written as words. With `needUnit`, only those followed by a unit word ("four years", "ten clients").
export function findWordNumbers(text: string, needUnit: boolean): FoundNumber[] {
  return [...text.matchAll(needUnit ? WORD_NUMBER_WITH_UNIT : ANY_WORD_NUMBER)].map((match) => ({
    raw: match[0].trim(),
    value: String(wordsToNumber(match[1])),
    percent: /percent|%/i.test(match[2] ?? ""),
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
// Number words count when a unit follows them ("four years"), but not in phrases like "one of".
export function checkNumbers(letter: string, input: CoverLetterInput): string[] {
  const sources = [input.resume, input.jobDescription, input.companyName, input.roleTitle, input.highlight]
    .filter(Boolean)
    .join("\n");
  // Numbers the person gave us, as digits or as words ("4 years" and "four years" are both 4).
  const known = [...findNumbers(sources), ...findWordNumbers(sources, false)];
  const problems: string[] = [];
  const text = withoutPlaceholders(letter);

  for (const found of [...findNumbers(text), ...findWordNumbers(text, true)]) {
    const ok = known.some((k) => k.value === found.value && (k.percent || !found.percent));
    const message = `The number "${found.raw}" is not in the resume or the other details. Remove it, or use a placeholder instead.`;
    if (!ok && !problems.includes(message)) problems.push(message);
  }
  return problems;
}

// (b) No banned clichés, ignoring case and curly apostrophes, as whole words.
export function checkCliches(letter: string): string[] {
  const text = plain(letter);
  return BANNED_CLICHES.filter((cliche) => {
    const escaped = cliche.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/ /g, "\\s+");
    return new RegExp(`(?<![a-z])${escaped}(?![a-z])`, "i").test(text);
  }).map((cliche) => `The letter uses the cliché "${cliche}". Rewrite that sentence without it.`);
}

// (c) Placeholders and gaps must match one to one. [Your name] is always allowed and needs no gap.
export function checkPlaceholders(result: CoverLetterResult): string[] {
  const inLetter = placeholdersIn(result.letter);
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

// (c2) At most MAX_GAPS gaps ([Your name] doesn't count).
export function checkPlaceholderCount(result: CoverLetterResult): string[] {
  const inLetter = new Set(placeholdersIn(result.letter).map(placeholderKey));
  const gaps = result.gaps.filter((gap) => !isYourName(gap.placeholder));
  const count = Math.max(inLetter.size, gaps.length);
  if (count <= MAX_GAPS) return [];
  return [`The letter has ${count} gaps. Use at most ${MAX_GAPS}: keep only the ones the job description stresses most.`];
}

// (c3) Each placeholder sits inside a normal sentence: never alone on its own line,
// and at most one per paragraph.
export function checkPlacement(letter: string): string[] {
  const problems: string[] = [];

  for (const line of letter.split("\n")) {
    const placeholders = placeholdersIn(line);
    const rest = line.replace(PLACEHOLDER, "");
    if (placeholders.length > 0 && !/[a-z0-9]/i.test(rest)) {
      problems.push(
        `The placeholder "${placeholders[0]}" is on a line of its own. Put it inside a normal sentence in the paragraph where that example belongs.`,
      );
    }
  }

  letter.split(/\n\s*\n/).forEach((paragraph, i) => {
    const count = placeholdersIn(paragraph).length;
    if (count > 1) {
      problems.push(`Paragraph ${i + 1} has ${count} placeholders. Use at most one placeholder per paragraph.`);
    }
  });
  return problems;
}

// (d) The word count fits the chosen length, with slack.
export function checkLength(letter: string, length: LetterLength): string[] {
  const words = countWords(letter);
  const { min, max } = WORD_LIMITS[length];
  if (words >= min && words <= max) return [];
  const aim = LENGTH_GUIDE[length];
  return [
    `Your letter had ${words} words; it must have ${min} to ${max} words, aim for ${aim.minWords} to ${aim.maxWords}.`,
  ];
}

// (e) None of our delimiter markers may leak into the letter or the gaps.
export function checkDelimiters(result: CoverLetterResult): string[] {
  const texts = [result.letter, ...result.gaps.flatMap((gap) => [gap.need, gap.placeholder])];
  return texts.some(containsDelimiter)
    ? ["The answer contains a delimiter marker like <<<..._START>>>. Remove every marker."]
    : [];
}

// (f) The first sentence after the greeting is a specific hook, not "I am applying..." and the like.
export function checkOpening(letter: string): string[] {
  const opening = plain(firstSentenceLine(letter)).toLowerCase();
  const banned = BANNED_OPENINGS.find((phrase) => opening.startsWith(phrase.toLowerCase()));
  if (!banned) return [];
  return [
    `The first sentence starts with "${banned}". Start instead with a specific hook: the person's most relevant real achievement, or a concrete thing the job needs that the resume answers.`,
  ];
}

// (g) Role inflation: a leadership word in the letter ("led", "managed", "mentored"...) must also appear,
// in any form, in the resume. "Team of 4" in the resume does not make "managed a team" true.
export function checkRole(letter: string, resume: string): string[] {
  const letterWords = new Set(wordsOf(letter));
  const resumeWords = new Set(wordsOf(resume));
  const problems: string[] = [];

  for (const family of LEADERSHIP_FAMILIES) {
    const used = family.inLetter.find((word) => letterWords.has(word));
    if (used && !family.inResume.some((word) => resumeWords.has(word))) {
      problems.push(
        `The letter says "${used}", but the resume never shows the person doing that. Describe their real part, in the resume's own terms.`,
      );
    }
  }
  return problems;
}

// (h) Highlight handling: a highlight is never dropped silently.
// "used" needs evidence copied from the resume; "gap" needs a gap that clearly refers to the highlight.
export function checkHighlight(result: CoverLetterResult, input: CoverLetterInput): string[] {
  const { highlightHandling: handling, highlightEvidence: evidence } = result;

  if (!input.highlight) {
    return handling === "not-provided" ? [] : ['No highlight was given, so highlightHandling must be "not-provided".'];
  }
  if (handling === "not-provided") {
    return ['A highlight was given. Either use it (if the resume supports it) or turn it into a gap. Never drop it.'];
  }
  if (handling === "used") {
    const found = normalise(evidence).length >= 3 && normalise(input.resume).includes(normalise(evidence));
    return found
      ? []
      : [
          'highlightHandling is "used", but highlightEvidence is not a phrase copied exactly from the resume. If the resume does not support the highlight, make it a gap instead.',
        ];
  }
  // "gap": some gap must share at least two meaningful words with the highlight (one, if it is very short).
  const highlightStems = contentStems(input.highlight);
  const needed = Math.min(2, highlightStems.size);
  const matches = result.gaps.some((gap) => {
    const gapStems = contentStems(`${gap.need} ${gap.placeholder}`);
    return [...highlightStems].filter((s) => gapStems.has(s)).length >= needed;
  });
  return matches
    ? []
    : ['highlightHandling is "gap", but no gap clearly refers to the highlight. Add a gap (and its placeholder) for it.'];
}

// (i) The letter must not talk about the resume itself ("my resume", "my CV").
export function checkResumeMentions(letter: string): string[] {
  const text = normalise(letter);
  const found = RESUME_MENTIONS.find((phrase) => new RegExp(`(?<![a-z])${phrase.toLowerCase()}(?![a-z])`).test(text));
  return found ? [`The letter says "${found}". Talk about the experience itself, not about the resume.`] : [];
}

// (j) A placeholder stands for a real past example, so its sentence must not hedge it ("not yet", "ready to learn").
export function checkPlaceholderWording(letter: string): string[] {
  const problems: string[] = [];
  for (const sentence of sentencesOf(letter)) {
    if (placeholdersIn(sentence).length === 0) continue;
    const text = normalise(withoutPlaceholders(sentence));
    const hedge = PLACEHOLDER_HEDGES.find((phrase) => text.includes(phrase));
    if (hedge) {
      problems.push(
        `A sentence with a placeholder also says "${hedge}". A placeholder stands for a real past example: rewrite the sentence so it simply introduces that example.`,
      );
    }
  }
  return problems;
}

// The names of the checks. They are logged when a check fails, so they must never contain user text.
export type CheckName =
  | "numbers"
  | "role"
  | "highlight"
  | "placeholders"
  | "placeholder-count"
  | "delimiter"
  | "length"
  | "cliche"
  | "opening"
  | "resume-mention"
  | "placeholder-wording"
  | "placement";

// Must-pass checks protect honesty and safety; should-pass checks are about style.
export const SEVERITY: Record<CheckName, "must" | "should"> = {
  numbers: "must",
  role: "must",
  highlight: "must",
  placeholders: "must",
  "placeholder-count": "must",
  delimiter: "must",
  length: "should",
  cliche: "should",
  opening: "should",
  "resume-mention": "should",
  "placeholder-wording": "should",
  placement: "should",
};

export type LetterProblem = CheckProblem & { check: CheckName; severity: "must" | "should" };

// All checks together, must-pass first. An empty list means the letter is fine.
export function findProblems(result: CoverLetterResult, input: CoverLetterInput): LetterProblem[] {
  const named = (check: CheckName, messages: string[]) =>
    messages.map((message) => ({ check, message, severity: SEVERITY[check] }));
  return [
    ...named("numbers", checkNumbers(result.letter, input)),
    ...named("role", checkRole(result.letter, input.resume)),
    ...named("highlight", checkHighlight(result, input)),
    ...named("placeholders", checkPlaceholders(result)),
    ...named("placeholder-count", checkPlaceholderCount(result)),
    ...named("delimiter", checkDelimiters(result)),
    ...named("length", checkLength(result.letter, input.length)),
    ...named("cliche", checkCliches(result.letter)),
    ...named("opening", checkOpening(result.letter)),
    ...named("resume-mention", checkResumeMentions(result.letter)),
    ...named("placeholder-wording", checkPlaceholderWording(result.letter)),
    ...named("placement", checkPlacement(result.letter)),
  ];
}

// The names of the style checks a letter still fails, each once. Shown to the person as notes.
export function styleNotes(result: CoverLetterResult, input: CoverLetterInput): CheckName[] {
  const names = findProblems(result, input)
    .filter((p) => p.severity === "should")
    .map((p) => p.check);
  return [...new Set(names)];
}
