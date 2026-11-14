import { checkField } from "@/lib/text-rules";

// Checks the body sent to /api/analyze. The page already checks lengths before sending,
// but the server must check again because anyone can call the API directly.

export type AnalyzeInput = { resume: string; jobDescription: string };

type InputCheck = { ok: true; input: AnalyzeInput } | { ok: false; message: string };

export function parseAnalyzeInput(body: unknown): InputCheck {
  const data = (typeof body === "object" && body !== null ? body : {}) as Record<string, unknown>;

  const resume = checkField(data.resume, "resume");
  if (typeof resume !== "string") return { ok: false, ...resume };

  const jobDescription = checkField(data.jobDescription, "job description");
  if (typeof jobDescription !== "string") return { ok: false, ...jobDescription };

  return { ok: true, input: { resume, jobDescription } };
}
