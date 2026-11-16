// Tired phrases a cover letter must not use. The prompt shows these lists to the AI, and
// lib/cover-letter/checks.ts rejects any letter that still contains one (ignoring case).
// To ban another phrase, add it here.

// Not allowed anywhere in the letter.
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
  "I note the following",
  "where my experience does not",
];

// The letter must not talk about the resume itself.
export const RESUME_MENTIONS = ["as per my resume", "my resume", "my résumé", "my CV"];

// A placeholder stands for a real past example, so it must not share a sentence with these.
export const PLACEHOLDER_HEDGES = ["not yet", "ready to learn", "eager to learn", "aligns with my background"];

// Not allowed as the start of the first sentence after the greeting.
export const BANNED_OPENINGS = [
  "I am applying",
  "I'm applying",
  "I am writing",
  "I'm writing",
  "I would like to apply",
  "I would like to be considered",
  "I wish to apply",
  "I am interested in",
  "I'm interested in",
  "Please accept",
];
