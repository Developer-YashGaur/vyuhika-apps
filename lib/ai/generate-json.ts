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
  // The problems are sent back to the AI with the retry, so it knows what to fix.
  check?: (answer: T) => string[];
  // The app's own wording for errors (falls back to lib/ai/errors.ts).
  messages?: Partial<Record<AiErrorCode, string>>;
};

export async function generateJson<T>({
  systemInstruction,
  prompt,
  schema,
  generate,
  logLabel,
  timeoutMs = AI_TIMEOUT_MS,
  check,
  messages = {},
}: GenerateJsonOptions<T>): Promise<T> {
  const signal = AbortSignal.timeout(timeoutMs);
  const jsonSchema = toGeminiJsonSchema(schema);
  const friendlyError = (code: AiErrorCode) => new AiError(code, messages[code] ?? AI_ERROR_MESSAGES[code]);
  let problems: string[] = [];

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

    // Log only the fact that it failed, never the user's text, the AI answer or the problem details.
    console.warn(
      answer
        ? `[${logLabel}] AI answer failed ${problems.length} check(s) (attempt ${attempt} of ${MAX_ATTEMPTS})`
        : `[${logLabel}] AI answer failed validation (attempt ${attempt} of ${MAX_ATTEMPTS})`,
    );
  }

  throw friendlyError("ai-failed");
}

function withProblems(prompt: string, problems: string[]): string {
  if (problems.length === 0) return prompt;
  return [
    prompt,
    "",
    "Your previous answer was rejected for these reasons:",
    ...problems.map((p) => `- ${p}`),
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
