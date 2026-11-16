import { z } from "zod";

// Length rules for the long text boxes (resume, job description), shared by every app.

export const MIN_CHARS = 200;
// About 6-8 pages of text. Longer input is almost always a paste mistake, and it costs more to analyze.
export const MAX_CHARS = 15000;

// Removes spaces and blank lines at the start and end.
export function cleanText(text: string): string {
  return text.trim();
}

// How many real characters the text has (ignoring outer whitespace).
export function countChars(text: string): number {
  return cleanText(text).length;
}

// The friendly messages for a long text field, like "Your resume is too short...".
const fieldMessages = {
  missing: (name: string) => `Please add your ${name}.`,
  tooShort: (name: string) => `Your ${name} is too short. Please add at least ${MIN_CHARS} characters.`,
  tooLong: (name: string) =>
    `Your ${name} is too long. Please keep it under ${MAX_CHARS.toLocaleString("en-US")} characters.`,
};

// Server-side check of one long text field. Returns the cleaned text, or a friendly message.
// The page already checks lengths before sending, but anyone can call the API directly.
export function checkField(value: unknown, name: string): string | { message: string } {
  if (typeof value !== "string") return { message: fieldMessages.missing(name) };
  const text = cleanText(value);
  if (text.length < MIN_CHARS) return { message: fieldMessages.tooShort(name) };
  if (text.length > MAX_CHARS) return { message: fieldMessages.tooLong(name) };
  return text;
}

// The same rules as checkField, as a zod schema (trimmed, then MIN_CHARS to MAX_CHARS).
export function longTextSchema(name: string) {
  return z
    .string({ error: fieldMessages.missing(name) })
    .trim()
    .min(MIN_CHARS, { error: fieldMessages.tooShort(name) })
    .max(MAX_CHARS, { error: fieldMessages.tooLong(name) });
}
