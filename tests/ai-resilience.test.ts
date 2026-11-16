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
    expect((await errorOf(run(generate, { timeoutMs: 100 }))).code).toBe("timeout");
    expect(calls).toBe(2);
  });
});

describe("logs", () => {
  it("hold only the try number, the status and fixed words, never the error text, the prompt or the key", async () => {
    const secret = "SECRET-RESUME-TEXT AIzaSyKEYKEYKEYKEYKEY dear hiring manager";
    const ai = script(apiError(503, secret), apiError(503, secret), apiError(503, secret), apiError(504, secret));
    await errorOf(run(ai.generate, { prompt: "PROMPT-WITH-SECRET-RESUME" }));
    const lines = [...warn.mock.calls, ...error.mock.calls].map((call) => JSON.stringify(call));
    expect(lines.length).toBeGreaterThanOrEqual(5);
    for (const line of lines) {
      expect(line).not.toMatch(/SECRET|AIza|hiring|PROMPT/i);
    }
    // Every warning is a fixed sentence with numbers in it.
    for (const [message] of warn.mock.calls) {
      expect(message).toMatch(/^\[test\] [A-Za-z ;,()0-9]+$/);
    }
    expect(warn.mock.calls.map((call: unknown[]) => call[0])).toEqual([
      "[test] temporary AI error, status 503 (try 1 of 3)",
      "[test] temporary AI error, status 503 (try 2 of 3)",
      "[test] temporary AI error, status 503 (try 3 of 3)",
      "[test] main model still failing; trying the fallback model once",
      "[test] fallback model failed, status 504",
    ]);
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
