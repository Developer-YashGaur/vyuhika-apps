// Tired phrases a cover letter must not use. The prompt shows this list to the AI, and
// lib/cover-letter/checks.ts rejects any letter that still contains one (ignoring case).
// To ban another phrase, add it here.

export const BANNED_CLICHES = [
  "I am writing to express",
  "I'm writing to express",
  "I am writing to apply",
  "I'm writing to apply",
  "team player",
  "hard worker",
  "hard-working",
  "perfect fit",
  "proven track record",
  "fast-paced environment",
  "think outside the box",
  "go-getter",
  "dream job",
  "results-driven",
];
