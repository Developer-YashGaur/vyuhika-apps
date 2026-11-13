import { MAX_CHARS, MIN_CHARS, cleanText } from "@/lib/validation";

// Checks the body sent to /api/analyze. The page already checks lengths before sending,
// but the server must check again because anyone can call the API directly.

export type AnalyzeInput = { resume: string; jobDescription: string };

type InputCheck = { ok: true; input: AnalyzeInput } | { ok: false; message: string };

function checkField(value: unknown, name: string): string | { message: string } {
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

export function parseAnalyzeInput(body: unknown): InputCheck {
  const data = (typeof body === "object" && body !== null ? body : {}) as Record<string, unknown>;

  const resume = checkField(data.resume, "resume");
  if (typeof resume !== "string") return { ok: false, ...resume };

  const jobDescription = checkField(data.jobDescription, "job description");
  if (typeof jobDescription !== "string") return { ok: false, ...jobDescription };

  return { ok: true, input: { resume, jobDescription } };
}
