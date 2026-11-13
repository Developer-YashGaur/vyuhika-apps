import { z } from "zod";
import type { MatchResult } from "@/lib/types";

// The exact JSON shape we ask Gemini for. The same zod schema is used twice:
// 1. turned into a JSON Schema and sent to Gemini, so it answers in this shape;
// 2. used on the server to check Gemini's answer before it reaches the page.

const keyword = z.string().trim().min(1).max(60);

export const matchResultSchema = z.object({
  score: z
    .number()
    .int()
    .min(0)
    .max(100)
    .describe("Match score from 0 to 100, consistent with the matched and missing keyword lists."),
  summary: z
    .string()
    .trim()
    .min(1)
    .max(240)
    .describe("One short sentence (under 25 words) explaining why the score is what it is."),
  matchedKeywords: z
    .array(keyword)
    .max(25)
    .describe("Skills, tools and qualifications the job asks for that appear in the resume, in the resume's wording."),
  missingKeywords: z
    .array(keyword)
    .max(25)
    .describe("Skills, tools and qualifications the job requires or prefers that are absent from the resume."),
  suggestions: z
    .array(
      z.object({
        title: z.string().trim().min(1).max(100).describe("A short headline for the change."),
        detail: z.string().trim().min(1).max(600).describe("What to add, reword or move, and why."),
      }),
    )
    .length(3)
    .describe("Exactly three specific, honest improvements."),
});

// Fails to compile if the schema and lib/types.ts ever drift apart.
const _sameShape: MatchResult = {} as z.infer<typeof matchResultSchema>;
void _sameShape;

// The JSON Schema version for Gemini. "$schema" is removed because Gemini only accepts a
// subset of JSON Schema; length limits it ignores are still enforced by zod on our side.
export function matchResultJsonSchema(): Record<string, unknown> {
  const schema = z.toJSONSchema(matchResultSchema) as Record<string, unknown>;
  delete schema.$schema;
  return schema;
}

// Lowercases and swaps punctuation for spaces, keeping + and # for names like C++ and C#.
function normalize(text: string): string {
  return ` ${text.toLowerCase().replace(/[^a-z0-9+#]+/g, " ").trim()} `;
}

// True if `keyword` appears in `text` as whole words ("Java" is not found in "JavaScript").
export function mentions(text: string, keyword: string): boolean {
  const word = normalize(keyword);
  return word.trim() !== "" && normalize(text).includes(word);
}

// A safety net on top of the prompt: drops any keyword that breaks the rules.
// - Matched keywords must really appear in the resume.
// - Missing keywords must really appear in the job description and not in the resume.
// Then keeps the score within 15 points of the share of keywords matched.
export function enforceHonesty(result: MatchResult, resume: string, jobDescription: string): MatchResult {
  const unique = (words: string[]) =>
    words.filter((w, i) => words.findIndex((x) => x.toLowerCase() === w.toLowerCase()) === i);

  const matchedKeywords = unique(result.matchedKeywords.filter((w) => mentions(resume, w)));
  const missingKeywords = unique(
    result.missingKeywords.filter((w) => mentions(jobDescription, w) && !mentions(resume, w)),
  );

  let score = result.score;
  const total = matchedKeywords.length + missingKeywords.length;
  if (total > 0) {
    const share = Math.round((matchedKeywords.length / total) * 100);
    score = Math.min(Math.max(score, share - 15), share + 15, 100);
    score = Math.max(score, 0);
  }

  return { ...result, score, matchedKeywords, missingKeywords };
}
