import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { AiError } from "@/lib/ai/errors";
import { generateJson, isTemporaryError, type GenerateFn } from "@/lib/ai/generate-json";
import { analyzeMatch } from "@/lib/analyze/analyze";
import { writeCoverLetter } from "@/lib/cover-letter/write";
import type { CoverLetterInput } from "@/lib/cover-letter/schema";
import { sampleJobDescription, sampleResume } from "@/lib/samples";
import { valid as validLetter } from "./fixtures/cover-letter";

// Temporary Gemini errors (HTTP 500, 503, 504 and short 429s): retries, the fallback model and the time limit.
// Every AI answer and error comes from a fake, and the waits are 0 ms except where a test is about waiting.

const schema = z.object({ greeting: z.string().min(1) });
const good = JSON.stringify({ greeting: "hello" });
const NO_WAIT = [0, 0];

const apiError = (status: number, message = "provider said no") => Object.assign(new Error(message), { status });
const e503 = () => apiError(503);

// A fake AI that plays a script: a string is an answer, an Error is thrown. It records every request.
function script(...steps: (string | Error)[]) {
  const requests: { fallback?: boolean; prompt: string }[] = [];
  const generate: GenerateFn = async (request) => {
    requests.push({ fallback: request.fallback, prompt: request.prompt });
    const step = steps[Math.min(requests.length - 1, steps.length - 1)];
    if (step instanceof Error) throw step;
    return step;
  };
  return { generate, requests, calls: () => requests.length };
}

function run(generate: GenerateFn, options: Partial<Parameters<typeof generateJson<{ greeting: string }>>[0]> = {}) {
  return generateJson({ systemInstruction: "rules", prompt: "data", schema, generate, logLabel: "test", retryDelaysMs: NO_WAIT, ...options });
}

async function errorOf(promise: Promise<unknown>): Promise<AiError> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof AiError) return error;
    throw error;
  }
  throw new Error("Expected an AiError");
}

let warn: ReturnType<typeof vi.spyOn>;
let error: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  error = vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

describe("which errors are temporary", () => {
  it.each([500, 503, 504])("HTTP %i is temporary", (status) => expect(isTemporaryError(apiError(status))).toBe(true));
  it.each([400, 401, 403, 404])("HTTP %i is not", (status) => expect(isTemporaryError(apiError(status))).toBe(false));

  it("a short-lived 429 is temporary", () => {
    expect(isTemporaryError(apiError(429, 'RESOURCE_EXHAUSTED {"retryDelay":"3s"}'))).toBe(true);
    expect(isTemporaryError(apiError(429, '"retryDelay": "0.5s"'))).toBe(true);
  });

  it("a 429 about the daily quota is not, even with a short delay", () => {
    expect(isTemporaryError(apiError(429, "quotaId GenerateRequestsPerDayPerProjectPerModel-FreeTier retryDelay 2s"))).toBe(false);
    expect(isTemporaryError(apiError(429, "You exceeded your daily quota"))).toBe(false);
  });

  it("a 429 with a long delay, or with no hint at all, is not", () => {
    expect(isTemporaryError(apiError(429, '"retryDelay":"34s"'))).toBe(false);
    expect(isTemporaryError(apiError(429, "Quota exceeded"))).toBe(false);
  });

  it("errors without a status (our own bugs, network) are not", () => {
    expect(isTemporaryError(new Error("boom"))).toBe(false);
    expect(isTemporaryError(null)).toBe(false);
  });
});

describe("temporary provider errors", () => {
  it("a 503, then success: one retry on the main model", async () => {
    const ai = script(e503(), good);
    expect(await run(ai.generate)).toEqual({ greeting: "hello" });
    expect(ai.requests.map((r) => r.fallback)).toEqual([false, false]);
  });

  it("two 503s, then success: still the main model", async () => {
    const ai = script(e503(), e503(), good);
    expect(await run(ai.generate)).toEqual({ greeting: "hello" });
    expect(ai.requests.map((r) => r.fallback)).toEqual([false, false, false]);
  });

  it("three 503s, then the fallback model succeeds", async () => {
    const ai = script(e503(), e503(), e503(), good);
    expect(await run(ai.generate)).toEqual({ greeting: "hello" });
    expect(ai.requests.map((r) => r.fallback)).toEqual([false, false, false, true]);
  });

  it("503 everywhere: the friendly error, after 3 main tries and 1 fallback try", async () => {
    const ai = script(e503());
    const failure = await errorOf(run(ai.generate));
    expect(failure.code).toBe("ai-failed");
    expect(ai.requests.map((r) => r.fallback)).toEqual([false, false, false, true]);
  });

  it("500 and 504 are retried too", async () => {
    for (const status of [500, 504]) {
      const ai = script(apiError(status), good);
      expect(await run(ai.generate)).toEqual({ greeting: "hello" });
      expect(ai.calls()).toBe(2);
    }
  });

  it("400, 401 and 403 are not retried and don't use the fallback", async () => {
    for (const status of [400, 401, 403]) {
      const ai = script(apiError(status), good);
      expect((await errorOf(run(ai.generate))).code).toBe("ai-failed");
      expect(ai.calls()).toBe(1);
    }
  });

  it("an error without a status is not retried", async () => {
    const ai = script(new Error("boom"), good);
    expect((await errorOf(run(ai.generate))).code).toBe("ai-failed");
    expect(ai.calls()).toBe(1);
  });

  it("the fallback gets one try only, with no waits of its own", async () => {
    const ai = script(e503());
    await errorOf(run(ai.generate));
    expect(ai.requests.filter((r) => r.fallback)).toHaveLength(1);
  });

  it("a short-lived 429 is retried, and ends as the friendly rate-limit message if it never clears", async () => {
    const shortLived = apiError(429, '"retryDelay":"2s"');
    const recovers = script(shortLived, good);
    expect(await run(recovers.generate)).toEqual({ greeting: "hello" });
    const never = script(shortLived);
    const failure = await errorOf(run(never.generate));
    expect(failure.code).toBe("rate-limited");
    expect(never.calls()).toBe(4);
  });

  it("a daily-quota 429 is not retried and doesn't use the fallback", async () => {
    const ai = script(apiError(429, "GenerateRequestsPerDayPerProjectPerModel retryDelay 1s"), good);
    expect((await errorOf(run(ai.generate))).code).toBe("rate-limited");
    expect(ai.calls()).toBe(1);
  });

  it("waits between tries (1 s then 2.5 s by default) and not before the first", async () => {
    vi.useFakeTimers();
    try {
      const ai = script(e503(), e503(), good);
      let done = false;
      const result = generateJson({ systemInstruction: "r", prompt: "p", schema, generate: ai.generate, logLabel: "test" }).then((r) => {
        done = true;
        return r;
      });
      await vi.advanceTimersByTimeAsync(0);
      expect(ai.calls()).toBe(1);
      await vi.advanceTimersByTimeAsync(999);
      expect(ai.calls()).toBe(1);
      await vi.advanceTimersByTimeAsync(1);
      expect(ai.calls()).toBe(2);
      await vi.advanceTimersByTimeAsync(2_499);
      expect(ai.calls()).toBe(2);
      await vi.advanceTimersByTimeAsync(1);
      expect(ai.calls()).toBe(3);
      await result;
      expect(done).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("combined with the retry for failed checks", () => {
  const checkGreeting = (answer: { greeting: string }) =>
    answer.greeting === "hello" ? [] : [{ check: "greeting", message: "Say hello." }];
  const bad = JSON.stringify({ greeting: "goodbye" });

  it("the situation seen live: the first answer fails a check, the retry gets a 503, then recovers", async () => {
    const ai = script(bad, e503(), good);
    expect(await run(ai.generate, { check: checkGreeting })).toEqual({ greeting: "hello" });
    expect(ai.calls()).toBe(3);
    // The retry that follows the 503 still tells the AI what was wrong with the first answer.
    expect(ai.requests[1].prompt).toContain("Say hello.");
    expect(ai.requests[2].prompt).toContain("Say hello.");
  });

  it("a 503 before the first answer doesn't use up the check retry", async () => {
    const ai = script(e503(), bad, good);
    expect(await run(ai.generate, { check: checkGreeting })).toEqual({ greeting: "hello" });
    expect(ai.calls()).toBe(3);
  });

  it("503s on both answers still leave one check retry, and no more", async () => {
    const ai = script(e503(), bad, e503(), good);
    expect(await run(ai.generate, { check: checkGreeting })).toEqual({ greeting: "hello" });
    expect(ai.calls()).toBe(4);
  });

  it("temporary errors never give a third answer: two bad answers still end in the friendly error", async () => {
    const ai = script(e503(), bad, e503(), bad, good);
    expect((await errorOf(run(ai.generate, { check: checkGreeting }))).code).toBe("ai-failed");
    expect(ai.calls()).toBe(4); // 2 answers, 2 temporary errors, never the 5th step
  });

  it("an answer that only had style problems is returned when the retry can't reach the AI", async () => {
    const styleOnly = (answer: { greeting: string }) =>
      answer.greeting === "hello" ? [] : [{ check: "style", message: "x", severity: "should" as const }];
    const ai = script(bad, e503());
    expect(await run(ai.generate, { check: styleOnly })).toEqual({ greeting: "goodbye" });
  });

  it("a must-pass failure is not rescued that way", async () => {
    const ai = script(bad, e503());
    expect((await errorOf(run(ai.generate, { check: checkGreeting }))).code).toBe("ai-failed");
  });
});

describe("the overall time limit", () => {
  it("stops the waiting between tries and answers with the timeout error", async () => {
    const ai = script(e503());
    const started = Date.now();
    const failure = await errorOf(run(ai.generate, { timeoutMs: 80, retryDelaysMs: [10_000, 10_000] }));
    expect(failure.code).toBe("timeout");
    expect(Date.now() - started).toBeLessThan(2_000);
    expect(ai.calls()).toBe(1); // it never reached the second try, let alone the fallback
  });

  it("covers a slow call after a temporary error", async () => {
    let calls = 0;
    const generate: GenerateFn = ({ signal }) => {
      calls++;
      if (calls === 1) return Promise.reject(e503());
      return new Promise((_, reject) => signal.addEventListener("abort", () => reject(new Error("aborted"))));
    };
    expect((await errorOf(run(generate, { timeoutMs: 300, callTimeoutMs: 10_000 }))).code).toBe("timeout");
    expect(calls).toBeGreaterThanOrEqual(2);
  });

  it("stays below Vercel's maxDuration in both API routes, with a margin, and each call is shorter than the whole", async () => {
    const { AI_CALL_TIMEOUT_MS, AI_TIMEOUT_MS } = await import("@/lib/ai/generate-json");
    const analyze = await import("@/app/api/analyze/route");
    const letter = await import("@/app/api/cover-letter/route");
    for (const maxDuration of [analyze.maxDuration, letter.maxDuration]) {
      expect(maxDuration).toBeGreaterThan(0);
      expect(AI_TIMEOUT_MS).toBeLessThanOrEqual(maxDuration * 1000 - 5_000); // 5 s for parsing, checks and the response
    }
    expect(AI_CALL_TIMEOUT_MS).toBeLessThan(AI_TIMEOUT_MS / 2);
  });
});

// A fake that ignores its abort signal and never answers, and one that answers after a while.
const hang: GenerateFn = () => new Promise<string | undefined>(() => {});
const slow = (ms: number, answer: string): GenerateFn => ({ signal }) =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => resolve(answer), ms);
    signal.addEventListener("abort", () => {
      clearTimeout(timer);
      reject(new Error("aborted"));
    });
  });

describe("a time limit for every single call", () => {
  it("a hanging call is cut off after its own limit and the retry on the main model recovers", async () => {
    let calls = 0;
    const generate: GenerateFn = (request) => (++calls === 1 ? hang(request) : Promise.resolve(good));
    const started = Date.now();
    expect(await run(generate, { timeoutMs: 5_000, callTimeoutMs: 60 })).toEqual({ greeting: "hello" });
    expect(calls).toBe(2);
    expect(Date.now() - started).toBeLessThan(1_000); // not the whole 5 s
  });

  it("a call that is just slow is cut off too, even if it honours the abort signal", async () => {
    let calls = 0;
    const generate: GenerateFn = (request) => (++calls === 1 ? slow(10_000, good)(request) : Promise.resolve(good));
    expect(await run(generate, { timeoutMs: 5_000, callTimeoutMs: 50 })).toEqual({ greeting: "hello" });
    expect(calls).toBe(2);
  });

  it("a call that finishes inside its limit is left alone", async () => {
    expect(await run(slow(20, good), { timeoutMs: 5_000, callTimeoutMs: 500 })).toEqual({ greeting: "hello" });
  });

  it("three stalled tries on the main model, then the fallback answers (the fallback keeps time in reserve)", async () => {
    const requests: boolean[] = [];
    const generate: GenerateFn = (request) => {
      requests.push(!!request.fallback);
      return request.fallback ? Promise.resolve(good) : hang(request);
    };
    // 1000 ms in total: the reserve is 200 ms, so the main model's tries are shortened to leave it.
    const started = Date.now();
    expect(await run(generate, { timeoutMs: 1_000, callTimeoutMs: 250 })).toEqual({ greeting: "hello" });
    expect(requests.at(-1)).toBe(true);
    expect(requests.filter((fallback) => !fallback).length).toBeGreaterThanOrEqual(1);
    expect(Date.now() - started).toBeLessThan(1_000);
  });

  it("a stalled main model never starves the fallback: with only the reserve left, the main tries stop", async () => {
    const requests: boolean[] = [];
    const generate: GenerateFn = (request) => {
      requests.push(!!request.fallback);
      return request.fallback ? Promise.resolve(good) : hang(request);
    };
    // Each main try may use 400 ms, but only 1000 - 200 (reserve) = 800 ms are for the main model in total.
    await run(generate, { timeoutMs: 1_000, callTimeoutMs: 400, retryDelaysMs: [0, 0, 0, 0] });
    expect(requests.filter((fallback) => !fallback).length).toBeLessThanOrEqual(2);
    expect(requests.at(-1)).toBe(true);
  });

  it("hanging everywhere ends with the friendly timeout message, within the overall limit", async () => {
    const started = Date.now();
    const failure = await errorOf(run(hang, { timeoutMs: 600, callTimeoutMs: 100 }));
    expect(failure.code).toBe("timeout");
    expect(Date.now() - started).toBeLessThan(1_500);
  });

  it("a per-call timeout on the last possible try ends as a timeout, not as a generic failure", async () => {
    const failure = await errorOf(run(hang, { timeoutMs: 60_000, callTimeoutMs: 20, retryDelaysMs: [0] }));
    expect(failure.code).toBe("timeout");
  });

  it("a per-call timeout doesn't use up the retry for failed checks", async () => {
    const bad = JSON.stringify({ greeting: "goodbye" });
    const check = (answer: { greeting: string }) => (answer.greeting === "hello" ? [] : [{ check: "greeting", message: "Say hello." }]);
    let calls = 0;
    const generate: GenerateFn = (request) => {
      calls++;
      if (calls === 1) return hang(request); // stalls, then times out
      return Promise.resolve(calls === 2 ? bad : good);
    };
    expect(await run(generate, { timeoutMs: 5_000, callTimeoutMs: 50, check })).toEqual({ greeting: "hello" });
    expect(calls).toBe(3);
  });

  it("an answer that only had style problems is returned when the retry stalls", async () => {
    const styleOnly = (answer: { greeting: string }) =>
      answer.greeting === "hello" ? [] : [{ check: "style", message: "x", severity: "should" as const }];
    let calls = 0;
    const generate: GenerateFn = (request) => (++calls === 1 ? Promise.resolve(JSON.stringify({ greeting: "goodbye" })) : hang(request));
    expect(await run(generate, { timeoutMs: 600, callTimeoutMs: 80, check: styleOnly })).toEqual({ greeting: "goodbye" });
  });
});

describe("timing logs", () => {
  let info: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    info = vi.spyOn(console, "info").mockImplementation(() => {});
  });
  const lines = (): string[] => info.mock.calls.map((call: unknown[]) => String(call[0]));

  it("log every call with its kind, its time and its outcome, and one line with the total", async () => {
    const bad = JSON.stringify({ greeting: "goodbye" });
    const check = (answer: { greeting: string }) => (answer.greeting === "hello" ? [] : [{ check: "greeting", message: "Say hello." }]);
    // main: fails a check; retry-after-check: 503; retry-after-temporary-error: ok.
    const ai = script(bad, e503(), good);
    await run(ai.generate, { check });
    const log = lines();
    expect(log).toHaveLength(4);
    expect(log[0]).toMatch(/^\[test\] call main: \d+ ms, outcome ok, \d+ ms into the request$/);
    expect(log[1]).toMatch(/^\[test\] call retry-after-check: \d+ ms, outcome 503, \d+ ms into the request$/);
    expect(log[2]).toMatch(/^\[test\] call retry-after-temporary-error: \d+ ms, outcome ok, \d+ ms into the request$/);
    expect(log[3]).toMatch(/^\[test\] request ok: total \d+ ms$/);
  });

  it("log the fallback call and the outcomes timeout, request-timeout and error", async () => {
    await run(script(apiError(503), apiError(503), new Error("boom"), good).generate).catch(() => {});
    expect(lines().some((l) => /call fallback: \d+ ms, outcome ok/.test(l))).toBe(false); // "boom" is not temporary: no fallback
    expect(lines().some((l) => /call retry-after-temporary-error: \d+ ms, outcome error/.test(l))).toBe(true);

    info.mockClear();
    await run(script(e503(), e503(), e503(), good).generate);
    expect(lines().some((l) => /call fallback: \d+ ms, outcome ok/.test(l))).toBe(true);

    info.mockClear();
    await run(hang, { timeoutMs: 400, callTimeoutMs: 40 }).catch(() => {}); // each call stops at its own limit
    expect(lines().some((l) => /outcome timeout,/.test(l))).toBe(true);
    expect(lines().at(-1)).toMatch(/^\[test\] request failed: total \d+ ms$/);

    info.mockClear();
    await run(hang, { timeoutMs: 100, callTimeoutMs: 10_000 }).catch(() => {}); // the request's limit comes first
    expect(lines().some((l) => /outcome request-timeout,/.test(l))).toBe(true);
  });

  it("never contain any text: not the prompt, the answer, the error message, the problems or the key", async () => {
    const secret = "SECRET-RESUME-TEXT AIzaSyKEYKEYKEYKEYKEY dear hiring manager";
    const badAnswer = JSON.stringify({ greeting: "SECRET-ANSWER-TEXT" });
    const check = () => [{ check: "greeting", message: "SECRET-PROBLEM-TEXT" }];
    const ai = script(badAnswer, apiError(503, secret), apiError(504, secret), apiError(429, secret), badAnswer);
    await run(ai.generate, { check, prompt: "PROMPT-WITH-SECRET-RESUME" }).catch(() => {});
    await run(hang, { prompt: "PROMPT-WITH-SECRET-RESUME", timeoutMs: 300, callTimeoutMs: 30 }).catch(() => {});
    const everything = [...info.mock.calls, ...warn.mock.calls, ...error.mock.calls].map((call: unknown[]) => JSON.stringify(call)).join("\n");
    expect(everything.length).toBeGreaterThan(200);
    expect(everything).not.toMatch(/SECRET|AIza|hiring|PROMPT/i);
    for (const line of lines()) {
      expect(line).toMatch(/^\[test\] (call [a-z-]+: \d+ ms, outcome [a-z0-9-]+, \d+ ms into the request|request (ok|failed): total \d+ ms)$/);
    }
  });
});

describe("logs", () => {
  it("hold only the try number, the status and fixed words, never the error text, the prompt or the key", async () => {
    const secret = "SECRET-RESUME-TEXT AIzaSyKEYKEYKEYKEYKEY dear hiring manager";
    const ai = script(apiError(503, secret), apiError(503, secret), apiError(503, secret), apiError(504, secret));
    await errorOf(run(ai.generate, { prompt: "PROMPT-WITH-SECRET-RESUME" }));
    const lines = [...warn.mock.calls, ...error.mock.calls].map((call: unknown[]) => JSON.stringify(call));
    expect(lines.length).toBeGreaterThanOrEqual(2);
    for (const line of lines) {
      expect(line).not.toMatch(/SECRET|AIza|hiring|PROMPT/i);
    }
    for (const [message] of warn.mock.calls) {
      expect(message).toMatch(/^\[test\] [A-Za-z ;,()0-9]+$/);
    }
    expect(warn.mock.calls.map((call: unknown[]) => call[0])).toEqual(["[test] main model still failing; trying the fallback model once"]);
  });
});

describe("the Resume Matcher behaves the same", () => {
  const answer = {
    score: 62,
    summary: "Solid React and TypeScript, but no Next.js, AWS or Docker, which the job asks for.",
    matchedKeywords: ["React", "TypeScript", "REST APIs", "Git", "Agile", "SQL"],
    missingKeywords: ["Next.js", "GraphQL", "AWS", "Docker"],
    suggestions: [
      { title: "Name the cloud tools", detail: "If you have used AWS or Docker, add them to your skills." },
      { title: "Use their wording", detail: "Say 'unit testing' as well as naming Jest." },
      { title: "Show performance results", detail: "Your page speed work is a match; say how much faster it got." },
    ],
  };

  it("a normal answer takes one call, with the main model", async () => {
    const ai = script(JSON.stringify(answer));
    const result = await analyzeMatch(sampleResume, sampleJobDescription, ai.generate);
    expect(result.score).toBe(62);
    expect(ai.requests.map((r) => r.fallback)).toEqual([false]);
  });

  it("errors that are not temporary behave as before: 400 is ai-failed, a plain 429 is rate-limited, both after one call", async () => {
    const bad = script(apiError(400));
    expect((await errorOf(analyzeMatch(sampleResume, sampleJobDescription, bad.generate))).code).toBe("ai-failed");
    expect(bad.calls()).toBe(1);
    const limited = script(apiError(429, "Quota exceeded"));
    expect((await errorOf(analyzeMatch(sampleResume, sampleJobDescription, limited.generate))).code).toBe("rate-limited");
    expect(limited.calls()).toBe(1);
  });

  it("a broken answer still gets exactly one retry", async () => {
    const ai = script("not json", JSON.stringify(answer));
    await analyzeMatch(sampleResume, sampleJobDescription, ai.generate);
    expect(ai.calls()).toBe(2);
    const never = script("not json");
    expect((await errorOf(analyzeMatch(sampleResume, sampleJobDescription, never.generate))).code).toBe("ai-failed");
    expect(never.calls()).toBe(2);
  });

  it("a temporary error is now retried (this one waits the real 1 s)", async () => {
    const ai = script(e503(), JSON.stringify(answer));
    expect((await analyzeMatch(sampleResume, sampleJobDescription, ai.generate)).score).toBe(62);
    expect(ai.calls()).toBe(2);
  });
});

describe("the Cover Letter Writer with a temporary error", () => {
  const input: CoverLetterInput = { resume: sampleResume, jobDescription: sampleJobDescription, tone: "professional", length: "medium" };

  it("first answer fails a must-pass check, the retry gets a 503, then the letter comes back (waits the real 1 s)", async () => {
    // Gaps left out, so the letter's placeholder has no matching gap: a must-pass failure.
    const broken = JSON.stringify({ ...validLetter, gaps: [] });
    const ai = script(broken, e503(), JSON.stringify(validLetter));
    const letter = await writeCoverLetter(input, ai.generate);
    expect(letter.letter).toBe(validLetter.letter);
    expect(ai.calls()).toBe(3);
  });
});
