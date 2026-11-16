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
// The whole request, waits included, stays inside one time limit, and every single call to Google also has its own
// shorter time limit, so one stalled call can't use up the whole budget. A call that times out counts as a
// temporary error (it can be retried, and then the fallback model gets its turn).
// Every call is logged with its kind, how long it took and how it ended: numbers and fixed words only.

// One call to the AI. Passed in as a parameter so tests can use a fake instead of Gemini.
export type GenerateFn = (request: {
  systemInstruction: string;
  prompt: string;
  jsonSchema: Record<string, unknown>;
  signal: AbortSignal;
  fallback?: boolean; // true: use the fallback model (see lib/ai/gemini.ts)
}) => Promise<string | undefined>;

// The whole request (both kinds of retry, waits included) must finish within this time.
// The API routes set maxDuration = 60 (Vercel's Hobby limit is 300 s), so this leaves a safe margin
// (tests/ai-resilience.test.ts keeps the two in step).
export const AI_TIMEOUT_MS = 50_000;

// One single call to Google must finish within this time, or it counts as a temporary error.
export const AI_CALL_TIMEOUT_MS = 20_000;

// Shares of the request's time limit (so they scale with it): once the main model has failed, the fallback model
// should still get this much time (10 s of 50 s). Later tries of the main model are shortened to leave it, and are
// skipped when there isn't enough time. A new call is never started with less than the minimum (2 s of 50 s) left.
const FALLBACK_RESERVE_SHARE = 0.2;
const MIN_CALL_SHARE = 0.04;

// A single call to Google took longer than its own time limit.
export class CallTimeoutError extends Error {
  constructor() {
    super("The AI call took too long");
    this.name = "CallTimeoutError";
  }
}

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
  callTimeoutMs?: number; // the time limit of one single call to Google
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

export async function generateJson<T>(options: GenerateJsonOptions<T>): Promise<T> {
  const startedAt = Date.now();
  let outcome = "failed";
  try {
    const answer = await runGenerateJson(options);
    outcome = "ok";
    return answer;
  } finally {
    // One line per request: how it ended and how long it took. Numbers and fixed words only.
    console.info(`[${options.logLabel}] request ${outcome}: total ${Date.now() - startedAt} ms`);
  }
}

async function runGenerateJson<T>({
  systemInstruction,
  prompt,
  schema,
  generate,
  logLabel,
  timeoutMs = AI_TIMEOUT_MS,
  retryDelaysMs = TEMPORARY_RETRY_DELAYS_MS,
  callTimeoutMs = AI_CALL_TIMEOUT_MS,
  check,
  logFacts,
  messages = {},
}: GenerateJsonOptions<T>): Promise<T> {
  const startedAt = Date.now();
  const signal = AbortSignal.timeout(timeoutMs);
  const run: Run = { generate, signal, logLabel, startedAt, deadline: startedAt + timeoutMs, delays: retryDelaysMs, callTimeoutMs, fallbackReserveMs: timeoutMs * FALLBACK_RESERVE_SHARE, minCallMs: timeoutMs * MIN_CALL_SHARE };
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
      text = await generateWithProviderRetries(run, request, attempt === 1 ? "main" : "retry-after-check");
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
  return statusOf(error) !== undefined || error instanceof CallTimeoutError;
}

// Temporary problems on Google's side that are worth trying again:
// - A single call that took longer than its own time limit.
// - HTTP 500, 503 and 504.
// - HTTP 429 only when it is short-lived. A 429 about the daily quota will not clear in seconds, and a 429 that
//   says nothing about the wait is not retried (like before). 400, 401 and 403 are never retried.
// The error's message is only read here to classify it. It is never logged.
export function isTemporaryError(error: unknown): boolean {
  if (error instanceof CallTimeoutError) return true;
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

// Everything one request needs to make calls to Google.
type Run = {
  generate: GenerateFn;
  signal: AbortSignal; // the whole request's time limit
  logLabel: string;
  startedAt: number;
  deadline: number;
  delays: number[];
  callTimeoutMs: number;
  fallbackReserveMs: number;
  minCallMs: number;
};

// "main": the first call for an answer. "retry-after-check": the call that follows a failed check.
// "retry-after-temporary-error": another try of the main model after a temporary error. "fallback": the other model.
type CallKind = "main" | "retry-after-check" | "retry-after-temporary-error" | "fallback";

// One single call to Google with its own time limit (also inside the request's limit), logged with its kind,
// how long it took and how it ended. The log has numbers and fixed words only: never any text or the key.
async function timedCall(run: Run, request: Parameters<GenerateFn>[0], kind: CallKind, maxMs: number): Promise<string | undefined> {
  // The call's own limit only matters when it is shorter than what is left of the request's limit.
  const callSignal =
    maxMs < run.deadline - Date.now() ? AbortSignal.any([run.signal, AbortSignal.timeout(Math.max(1, maxMs))]) : run.signal;
  const started = Date.now();
  let outcome = "ok";
  try {
    return await raceAbort(run.generate({ ...request, signal: callSignal, fallback: kind === "fallback" }), callSignal);
  } catch (error) {
    // A call that was stopped by its own time limit (and not by the request's) is a temporary error.
    const failure = callSignal.aborted && !run.signal.aborted ? new CallTimeoutError() : error;
    const status = statusOf(failure);
    outcome = run.signal.aborted
      ? "request-timeout"
      : failure instanceof CallTimeoutError
        ? "timeout"
        : status !== undefined
          ? String(status)
          : "error";
    throw failure;
  } finally {
    const now = Date.now();
    console.info(`[${run.logLabel}] call ${kind}: ${now - started} ms, outcome ${outcome}, ${now - run.startedAt} ms into the request`);
  }
}

// Gives up on a call that ignores its abort signal, so a hanging call can't hang the request.
function raceAbort<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(new Error("The call was stopped"));
    if (signal.aborted) onAbort();
    else signal.addEventListener("abort", onAbort, { once: true });
    promise.then(resolve, reject).finally(() => signal.removeEventListener("abort", onAbort));
  });
}

// One answer from the AI, with the provider retries: the main model up to 1 + delays.length times, then the fallback
// model once. Later tries of the main model are shortened (or skipped) so the fallback keeps some time.
async function generateWithProviderRetries(
  run: Run,
  request: Parameters<GenerateFn>[0],
  firstKind: "main" | "retry-after-check",
): Promise<string | undefined> {
  const tries = run.delays.length + 1;
  let lastError: unknown;
  for (let i = 0; i < tries; i++) {
    const remaining = run.deadline - Date.now();
    const maxMs = i === 0 ? Math.min(run.callTimeoutMs, remaining) : Math.min(run.callTimeoutMs, remaining - run.fallbackReserveMs);
    if (i > 0 && maxMs < run.minCallMs) break; // not enough time for another try and the fallback
    try {
      return await timedCall(run, request, i === 0 ? firstKind : "retry-after-temporary-error", maxMs);
    } catch (error) {
      if (run.signal.aborted || !isTemporaryError(error)) throw error;
      lastError = error;
      if (i === tries - 1) break;
      await wait(run.delays[i], run.signal);
      if (run.signal.aborted) throw error;
    }
  }

  const remaining = run.deadline - Date.now();
  if (remaining < run.minCallMs) throw lastError;
  console.warn(`[${run.logLabel}] main model still failing; trying the fallback model once`);
  return timedCall(run, request, "fallback", Math.min(run.callTimeoutMs, remaining));
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
  if (signal.aborted || error instanceof CallTimeoutError) return friendlyError("timeout");

  const status = (error as { status?: unknown })?.status;
  // Log only the error type and HTTP status; the message could echo request details.
  console.error(`[${logLabel}] AI request failed`, { name: (error as Error)?.name, status });

  if (status === 429) {
    return new AiError("rate-limited", "Our AI service is busy right now. Please try again in a minute.");
  }
  return friendlyError("ai-failed");
}
