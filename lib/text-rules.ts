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

// Server-side check of one long text field. Returns the cleaned text, or a friendly message.
// The page already checks lengths before sending, but anyone can call the API directly.
export function checkField(value: unknown, name: string): string | { message: string } {
  if (typeof value !== "string") return { message: `Please add your ${name}.` };
  const text = cleanText(value);
  if (text.length < MIN_CHARS) {
    return { message: `Your ${name} is too short. Please add at least ${MIN_CHARS} characters.` };
  }
  if (text.length > MAX_CHARS) {
    return {
      message: `Your ${name} is too long. Please keep it under ${MAX_CHARS.toLocaleString("en-US")} characters.`,
    };
  }
  return text;
}
