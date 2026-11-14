import { z } from "zod";
import { AiError } from "@/lib/ai/errors";

// Asks the AI for a JSON answer, checks it with a zod schema, and retries once if the answer is broken.
// Shared by every app: each app brings its own instructions, prompt and schema.

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
};

export async function generateJson<T>({
  systemInstruction,
  prompt,
  schema,
  generate,
  logLabel,
  timeoutMs = AI_TIMEOUT_MS,
}: GenerateJsonOptions<T>): Promise<T> {
  const signal = AbortSignal.timeout(timeoutMs);
  const request = { systemInstruction, prompt, jsonSchema: toGeminiJsonSchema(schema), signal };

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    let text: string | undefined;
    try {
      text = await generate(request);
    } catch (error) {
      throw toAiError(error, signal, logLabel);
    }

    const answer = parseJsonAnswer(text, schema);
    if (answer) return answer;

    // Log only the fact that it failed, never the user's text or the AI answer.
    console.warn(`[${logLabel}] AI answer failed validation (attempt ${attempt} of ${MAX_ATTEMPTS})`);
  }

  throw new AiError("ai-failed");
}

// Turns any error from the AI call into one of our safe, friendly errors.
function toAiError(error: unknown, signal: AbortSignal, logLabel: string): AiError {
  if (signal.aborted) return new AiError("timeout");

  const status = (error as { status?: unknown })?.status;
  // Log only the error type and HTTP status; the message could echo request details.
  console.error(`[${logLabel}] AI request failed`, { name: (error as Error)?.name, status });

  if (status === 429) {
    return new AiError("rate-limited", "Our AI service is busy right now. Please try again in a minute.");
  }
  return new AiError("ai-failed");
}
