import { z } from "zod";
import { AI_ERROR_MESSAGES, AiError, type AiErrorCode } from "@/lib/ai/errors";

// Asks the AI for a JSON answer, checks it with a zod schema (and optionally the app's own checks),
// and retries once if the answer is broken. Shared by every app: each app brings its own
// instructions, prompt, schema and error wording.

// One call to the AI. Passed in as a parameter so tests can use a fake instead of Gemini.
export type GenerateFn = (request: {
  systemInstruction: string;
  prompt: string;
  jsonSchema: Record<string, unknown>;
  signal: AbortSignal;
}) => Promise<string | undefined>;

// The whole request (including the retry) must finish within this time.
export const AI_TIMEOUT_MS = 30_000;

const MAX_ATTEMPTS = 2; // the first try, plus one retry if the answer is invalid

// The JSON Schema version of a zod schema, for Gemini. "$schema" is removed because Gemini only
// accepts a subset of JSON Schema; length limits it ignores are still enforced by zod on our side.
export function toGeminiJsonSchema(schema: z.ZodType): Record<string, unknown> {
  const jsonSchema = z.toJSONSchema(schema) as Record<string, unknown>;
  delete jsonSchema.$schema;
  return jsonSchema;
}

// Parses and checks the AI's answer. Returns null if it isn't valid JSON in the right shape.
export function parseJsonAnswer<T>(text: string | undefined, schema: z.ZodType<T>): T | null {
  if (!text) return null;
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return null;
  }
  const checked = schema.safeParse(json);
  return checked.success ? checked.data : null;
}

type GenerateJsonOptions<T> = {
  systemInstruction: string;
  prompt: string;
  schema: z.ZodType<T>;
  generate: GenerateFn;
  logLabel: string; // shown in server logs, like "analyze", so we know which app failed
  timeoutMs?: number;
  // Extra checks on a well-formed answer. Returns a list of problems (empty when all is fine).
  // The messages are sent back to the AI with the retry, so it knows what to fix.
  check?: (answer: T) => CheckProblem[];
  // Plain numbers about a failed answer that are safe to log, like { words: 148 }. Never text.
  logNumbers?: (answer: T) => Record<string, number>;
  // The app's own wording for errors (falls back to lib/ai/errors.ts).
  messages?: Partial<Record<AiErrorCode, string>>;
};

// One failed check. `check` is a fixed name from our code (like "length"), so it is safe to log.
// `message` can quote the AI's answer, so it only ever goes back to the AI, never to the logs.
// `severity`: "must" (the default) means the answer can't be used; "should" means a style problem —
// worth a retry, but if the retry doesn't fix it, the answer is still returned.
export type CheckProblem = { check: string; message: string; severity?: "must" | "should" };

export async function generateJson<T>({
  systemInstruction,
  prompt,
  schema,
  generate,
  logLabel,
  timeoutMs = AI_TIMEOUT_MS,
  check,
  logNumbers,
  messages = {},
}: GenerateJsonOptions<T>): Promise<T> {
  const signal = AbortSignal.timeout(timeoutMs);
  const jsonSchema = toGeminiJsonSchema(schema);
  const friendlyError = (code: AiErrorCode) => new AiError(code, messages[code] ?? AI_ERROR_MESSAGES[code]);
  let problems: CheckProblem[] = [];
  // The latest answer whose only problems are style ("should") problems, kept in case the retry is no better.
  let styleOnlyAnswer: T | undefined;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    // On the retry, tell the AI what was wrong with its last answer (only when our own checks failed).
    const request = { systemInstruction, prompt: withProblems(prompt, problems), jsonSchema, signal };

    let text: string | undefined;
    try {
      text = await generate(request);
    } catch (error) {
      throw toAiError(error, signal, logLabel, friendlyError);
    }

    const answer = parseJsonAnswer(text, schema);
    problems = answer && check ? check(answer) : [];
    if (answer && problems.length === 0) return answer;
    if (answer && problems.every((p) => p.severity === "should")) styleOnlyAnswer = answer;

    // Log only the attempt, the names of the failed checks and safe numbers. Never any text:
    // not the user's, not the AI's answer, and not the problem messages (they can quote the answer).
    console.warn(
      answer
        ? `[${logLabel}] attempt ${attempt} of ${MAX_ATTEMPTS} failed checks: ${checkNames(problems)}${numbersText(answer, logNumbers)}`
        : `[${logLabel}] AI answer failed validation (attempt ${attempt} of ${MAX_ATTEMPTS})`,
    );
  }

  // Style problems alone never block an answer: the app can show them as notes.
  if (styleOnlyAnswer !== undefined) {
    console.warn(`[${logLabel}] returning an answer that only failed style checks`);
    return styleOnlyAnswer;
  }
  throw friendlyError("ai-failed");
}

// "length, opening" — each failed check's name once, in order.
function checkNames(problems: CheckProblem[]): string {
  return [...new Set(problems.map((p) => p.check))].join(", ");
}

// " (words: 148)" — only finite numbers make it into the log.
function numbersText<T>(answer: T, logNumbers?: (answer: T) => Record<string, number>): string {
  const pairs = Object.entries(logNumbers?.(answer) ?? {}).filter(([, n]) => typeof n === "number" && Number.isFinite(n));
  return pairs.length ? ` (${pairs.map(([key, n]) => `${key}: ${n}`).join(", ")})` : "";
}

function withProblems(prompt: string, problems: CheckProblem[]): string {
  if (problems.length === 0) return prompt;
  return [
    prompt,
    "",
    "Your previous answer was rejected for these reasons:",
    ...problems.map((p) => `- ${p.message}`),
    "Write a new answer that follows all the rules and fixes every problem above.",
  ].join("\n");
}

// Turns any error from the AI call into one of our safe, friendly errors.
function toAiError(
  error: unknown,
  signal: AbortSignal,
  logLabel: string,
  friendlyError: (code: AiErrorCode) => AiError,
): AiError {
  if (signal.aborted) return friendlyError("timeout");

  const status = (error as { status?: unknown })?.status;
  // Log only the error type and HTTP status; the message could echo request details.
  console.error(`[${logLabel}] AI request failed`, { name: (error as Error)?.name, status });

  if (status === 429) {
    return new AiError("rate-limited", "Our AI service is busy right now. Please try again in a minute.");
  }
  return friendlyError("ai-failed");
}
