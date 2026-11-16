import { z } from "zod";
import { HIGHLIGHT_HANDLING, LENGTHS, TONES } from "@/lib/cover-letter/schema";
import { NOTE_NAMES } from "@/lib/cover-letter/feedback";
import { COVER_LETTER_PATH, MATCHER_PATH, stripHtml } from "@/lib/feedback/rules";

// The pages that may attach a debug block to a "Wrong result" report, each with its own strict schema.
// "Strict" means any field we don't expect (like `resume`, `letter` or `highlightEvidence`) makes the
// whole request invalid. A page that is not in this table can never attach anything.

export const clean = (max: number) => z.string().max(max * 2).transform(stripHtml).pipe(z.string().max(max));

// Resume Matcher: score, summary and keywords.
const matcherDebugSchema = z.strictObject({
  score: z.number().int().min(0).max(100),
  summary: clean(240),
  matchedKeywords: z.array(clean(60)).max(25),
  missingKeywords: z.array(clean(60)).max(25),
});

// Cover Letter Writer: settings, counts and yes/no answers. Notes must be known check names.
const coverLetterDebugSchema = z.strictObject({
  tone: z.enum(TONES),
  length: z.enum(LENGTHS),
  wordCount: z.number().int().min(0).max(5000),
  blanks: z.number().int().min(0).max(100),
  companyFilled: z.boolean(),
  roleFilled: z.boolean(),
  highlightFilled: z.boolean(),
  highlightHandling: z.enum(HIGHLIGHT_HANDLING),
  notes: z.array(z.enum(NOTE_NAMES)).max(NOTE_NAMES.length),
});

export const FEEDBACK_PAGES = {
  [MATCHER_PATH]: { debug: matcherDebugSchema },
  [COVER_LETTER_PATH]: { debug: coverLetterDebugSchema },
} as const;

export type FeedbackPagePath = keyof typeof FEEDBACK_PAGES;
type AnyDebug = z.infer<(typeof FEEDBACK_PAGES)[FeedbackPagePath]["debug"]>;

export function feedbackPage(path: string) {
  return Object.hasOwn(FEEDBACK_PAGES, path) ? FEEDBACK_PAGES[path as FeedbackPagePath] : undefined;
}

// Pages that are not in the table can't attach anything. A debug block sent from one is still checked
// (it has to fit one of the strict schemas, so junk is refused) and then dropped.
const anyPageDebug = z.union([matcherDebugSchema, coverLetterDebugSchema]);

export function checkDebug(path: string, debug: unknown): { ok: true; debug: AnyDebug } | { ok: false } {
  const schema = feedbackPage(path)?.debug ?? anyPageDebug;
  const checked = schema.safeParse(debug);
  return checked.success ? { ok: true, debug: checked.data } : { ok: false };
}
