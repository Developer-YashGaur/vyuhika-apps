// The shape of a Resume Matcher result.
// The API route (app/api/analyze) returns this; lib/mock.ts returns it in tests.

export type Suggestion = {
  title: string;
  detail: string;
};

export type MatchResult = {
  score: number; // 0 to 100
  summary: string; // one short line explaining the score
  matchedKeywords: string[];
  missingKeywords: string[];
  suggestions: Suggestion[];
};
