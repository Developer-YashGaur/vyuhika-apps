import { z } from "zod";
import { AI_ERROR_MESSAGES, AiError, type AiErrorCode } from "@/lib/ai/errors";

// Asks the AI for a JSON answer, checks it with a zod schema (and optionally the app's own checks),
// and retries once if the answer is broken. Shared by every app: each app brings its own
// instructions, prompt, schema and error wording.
//
// Two separate kinds of retry (neither uses up the other's budget):
// 1. Answer retry: the answer was broken or failed a check, so the AI gets one more try (MAX_ATTEMPTS).
// 2. Provider retry: Google had a temporary problem (HTTP 500, 503, 504, or a short-lived 429). That call is
//    tried again after about 1 s, then 2.5 s, and if the main model is still failing the fallback model gets one try.
//    This happens inside each call of kind 1, so "first answer fails a check, retry gets a 503, then recovers" works.
// The whole request, waits included, stays inside one time limit.

// One call to the AI. Passed in as a parameter so tests can use a fake instead of Gemini.
export type GenerateFn = (request: {
  systemInstruction: string;
  prompt: string;
  jsonSchema: Record<string, unknown>;
  signal: AbortSignal;
  fallback?: boolean; // true: use the fallback model (see lib/ai/gemini.ts)
}) => Promise<string | undefined>;

// The whole request (both kinds of retry, waits included) must finish within this time.
// The API routes set maxDuration = 60 (Vercel's Hobby limit is 300 s), so this leaves a safe margin.
export const AI_TIMEOUT_MS = 50_000;

// Waits before the 2nd and 3rd try of the main model after a temporary provider error.
export const TEMPORARY_RETRY_DELAYS_MS = [1_000, 2_500];

// A short-lived 429 asks us to wait at most this long; a longer wait won't fit our schedule.
const MAX_SHORT_RETRY_DELAY_S = 5;

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
  retryDelaysMs?: number[]; // waits between tries after a temporary provider error (tests use short ones)
  // Extra checks on a well-formed answer. Returns a list of problems (empty when all is fine).
  // The messages are sent back to the AI with the retry, so it knows what to fix.
  check?: (answer: T) => CheckProblem[];
  // Facts about a failed answer that are safe to log: numbers, or fixed code words from our own code
  // (like { words: 148, highlight: "gap" }). Never the user's or the AI's text.
  logFacts?: (answer: T) => Record<string, number | string | undefined>;
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
  retryDelaysMs = TEMPORARY_RETRY_DELAYS_MS,
  check,
  logFacts,
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
      text = await generateWithProviderRetries(generate, request, signal, logLabel, retryDelaysMs);
    } catch (error) {
      // The retry can't reach the AI, but an earlier answer only had style problems: that one is still good.
      if (styleOnlyAnswer !== undefined && !signal.aborted && isProviderFailure(error)) {
        console.warn(`[${logLabel}] AI unavailable for the retry; returning an answer that only failed style checks`);
        return styleOnlyAnswer;
      }
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
        ? `[${logLabel}] attempt ${attempt} of ${MAX_ATTEMPTS} failed checks: ${checkNames(problems)}${factsText(answer, logFacts)}`
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

function statusOf(error: unknown): number | undefined {
  const status = (error as { status?: unknown })?.status;
  return typeof status === "number" ? status : undefined;
}

// Does the error come from Google's side (an HTTP status) rather than from our own code?
function isProviderFailure(error: unknown): boolean {
  return statusOf(error) !== undefined;
}

// Temporary problems on Google's side that are worth trying again:
// - HTTP 500, 503 and 504.
// - HTTP 429 only when it is short-lived. A 429 about the daily quota will not clear in seconds, and a 429 that
//   says nothing about the wait is not retried (like before). 400, 401 and 403 are never retried.
// The error's message is only read here to classify it. It is never logged.
export function isTemporaryError(error: unknown): boolean {
  const status = statusOf(error);
  if (status === 500 || status === 503 || status === 504) return true;
  if (status !== 429) return false;

  const message = String((error as { message?: unknown })?.message ?? "");
  if (/per ?day|daily/i.test(message)) return false;
  const delay = /"?retryDelay"?\s*[:=]\s*"?(\d+(?:\.\d+)?)\s*s/i.exec(message);
  return delay !== null && Number(delay[1]) <= MAX_SHORT_RETRY_DELAY_S;
}

// Waits `ms`, or less if the request's time limit runs out first.
function wait(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal.aborted) return resolve();
    const done = () => {
      clearTimeout(timer);
      signal.removeEventListener("abort", done);
      resolve();
    };
    const timer = setTimeout(done, ms);
    signal.addEventListener("abort", done, { once: true });
  });
}

// One call to the AI, with the provider retries: the main model up to 1 + delays.length times, then the fallback
// model once. Only the try number, the HTTP status and "fallback" are logged, never any text.
async function generateWithProviderRetries(
  generate: GenerateFn,
  request: Parameters<GenerateFn>[0],
  signal: AbortSignal,
  logLabel: string,
  delays: number[],
): Promise<string | undefined> {
  const tries = delays.length + 1;
  for (let i = 0; i < tries; i++) {
    try {
      return await generate({ ...request, fallback: false });
    } catch (error) {
      if (signal.aborted || !isTemporaryError(error)) throw error;
      console.warn(`[${logLabel}] temporary AI error, status ${statusOf(error)} (try ${i + 1} of ${tries})`);
      if (i === tries - 1) break;
      await wait(delays[i], signal);
      if (signal.aborted) throw error;
    }
  }

  console.warn(`[${logLabel}] main model still failing; trying the fallback model once`);
  try {
    return await generate({ ...request, fallback: true });
  } catch (error) {
    if (!signal.aborted) console.warn(`[${logLabel}] fallback model failed, status ${statusOf(error)}`);
    throw error;
  }
}

// "length, opening" — each failed check's name once, in order.
function checkNames(problems: CheckProblem[]): string {
  return [...new Set(problems.map((p) => p.check))].join(", ");
}

// " (words: 148, highlight: gap)". Only finite numbers and plain code words (like "gap" or
// "evidence-not-in-resume") make it into the log; anything else is left out, so no text can slip through.
function factsText<T>(answer: T, logFacts?: (answer: T) => Record<string, number | string | undefined>): string {
  const isSafe = (v: unknown) =>
    (typeof v === "number" && Number.isFinite(v)) || (typeof v === "string" && /^[a-z][a-z0-9-]{0,40}$/.test(v));
  const pairs = Object.entries(logFacts?.(answer) ?? {}).filter(([key, v]) => /^[a-z][a-z0-9-]*$/i.test(key) && isSafe(v));
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
