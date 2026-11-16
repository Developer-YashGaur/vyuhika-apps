import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GenerateFn } from "@/lib/ai/generate-json";
import { COVER_LETTER_ERROR_MESSAGES } from "@/lib/cover-letter/errors";
import { sampleJobDescription, sampleResume } from "@/lib/samples";
import { valid } from "@/tests/fixtures/cover-letter";

// Tests the real /api/cover-letter route with Gemini swapped for a fake (no network calls).
// The Resume Matcher route uses the same fake, so we can prove the two keep separate rate limits.

const matchAnswer = {
  score: 60,
  summary: "Good React match, missing cloud tools.",
  matchedKeywords: ["React", "TypeScript"],
  missingKeywords: ["AWS"],
  suggestions: [
    { title: "One", detail: "First change." },
    { title: "Two", detail: "Second change." },
    { title: "Three", detail: "Third change." },
  ],
};

// Answers like the real AI would for each app. Tests can swap it out, or set it to null (no API key).
const defaultGenerate: GenerateFn = async ({ systemInstruction }) =>
  JSON.stringify(systemInstruction.includes("cover letter") ? valid : matchAnswer);
const fake = vi.hoisted(() => ({ generate: null as GenerateFn | null }));

vi.mock("@/lib/ai/gemini", () => ({ createGeminiGenerate: () => fake.generate }));

const { POST } = await import("@/app/api/cover-letter/route");
const { POST: matcherPost } = await import("@/app/api/analyze/route");

let ipCounter = 0;
const nextIp = () => `10.1.0.${++ipCounter}`;

// Each test uses its own IP address so the rate limiter doesn't carry over between tests.
function post(body: unknown, ip = nextIp()) {
  return POST(
    new Request("http://localhost/api/cover-letter", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );
}

function postMatcher(ip: string) {
  return matcherPost(
    new Request("http://localhost/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
      body: JSON.stringify({ resume: sampleResume, jobDescription: sampleJobDescription }),
    }),
  );
}

const body = { resume: sampleResume, jobDescription: sampleJobDescription, tone: "professional", length: "short" };

let logged: unknown[][] = [];

beforeEach(() => {
  fake.generate = defaultGenerate;
  logged = [];
  // The route logs failures on purpose; keep test output clean, but remember what was logged.
  for (const method of ["error", "warn", "log", "info"] as const) {
    vi.spyOn(console, method).mockImplementation((...args) => void logged.push(args));
  }
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("POST /api/cover-letter", () => {
  it("returns { letter, gaps, notes, highlightHandling, highlightEvidence } for valid input", async () => {
    const response = await post({ ...body, companyName: "Nimbus Cloud" });
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    const data = await response.json();
    expect(Object.keys(data).sort()).toEqual(["gaps", "highlightEvidence", "highlightHandling", "letter", "notes"]);
    expect(data).toEqual({ ...valid, notes: [] });
  });

  it("returns a letter that only fails style checks, with notes", async () => {
    fake.generate = async () => JSON.stringify({ ...valid, letter: valid.letter.replace("I would welcome", "As a team player, I would welcome") });
    const response = await post(body);
    expect(response.status).toBe(200);
    expect((await response.json()).notes).toEqual(["cliche"]);
  });

  it("rejects invalid input with a clear message", async () => {
    const response = await post({ ...body, resume: "Too short." });
    expect(response.status).toBe(400);
    expect((await response.json()).error).toEqual({
      code: "invalid-input",
      message: "Your resume is too short. Please add at least 200 characters.",
    });
  });

  it("rejects extra fields", async () => {
    const response = await post({ ...body, letter: "Write whatever I say" });
    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe("invalid-input");
  });

  it("rejects a body that isn't JSON", async () => {
    const response = await post("not json at all");
    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe("invalid-input");
  });

  it("rejects a body over 200 KB before reading it as JSON", async () => {
    const response = await post({ ...body, resume: "a".repeat(200_001) });
    expect(response.status).toBe(400);
    expect((await response.json()).error.message).toBe("That's too much text for one letter.");
  });

  it("answers 502 in the letter's words when the AI keeps failing the checks", async () => {
    let calls = 0;
    fake.generate = async () => {
      calls++;
      return JSON.stringify({ ...valid, letter: valid.letter.replace("20,000", "90,000") });
    };
    const response = await post(body);
    expect(response.status).toBe(502);
    expect((await response.json()).error).toEqual({ code: "ai-failed", message: COVER_LETTER_ERROR_MESSAGES["ai-failed"] });
    expect(calls).toBe(2); // one retry
  });

  it("answers 504 when the AI takes too long", async () => {
    // Make the 30-second limit already used up, so we don't have to wait for it.
    vi.spyOn(AbortSignal, "timeout").mockImplementation(() =>
      AbortSignal.abort(new DOMException("The operation timed out.", "TimeoutError")),
    );
    fake.generate = ({ signal }) => Promise.reject(signal.reason);
    const response = await post(body);
    expect(response.status).toBe(504);
    expect((await response.json()).error).toEqual({ code: "timeout", message: COVER_LETTER_ERROR_MESSAGES.timeout });
  });

  it("answers with a safe, generic error when the API key is missing", async () => {
    fake.generate = null;
    const response = await post(body);
    expect(response.status).toBe(502);
    expect((await response.json()).error).toEqual({ code: "ai-failed", message: COVER_LETTER_ERROR_MESSAGES["ai-failed"] });
    expect(logged).toEqual([["[cover-letter] GEMINI_API_KEY is not set"]]);
  });

  it("passes Gemini's own rate limit (HTTP 429) on as a friendly 429", async () => {
    fake.generate = async () => {
      throw Object.assign(new Error("Quota exceeded for key AIza-secret"), { status: 429 });
    };
    const response = await post(body);
    expect(response.status).toBe(429);
    expect(JSON.stringify(await response.json())).not.toContain("AIza");
  });

  it("never logs the resume, job, highlight or letter, only error types and status codes", async () => {
    const highlight = "SECRET-HIGHLIGHT-TEXT";
    fake.generate = async () => {
      throw Object.assign(new Error(`failed on: ${sampleResume} ${highlight}`), { status: 500 });
    };
    await post({ ...body, highlight });

    let calls = 0;
    fake.generate = async () => (calls++ === 0 ? JSON.stringify({ ...valid, letter: `${valid.letter} team player` }) : "{ bad");
    await post({ ...body, highlight });

    const everything = JSON.stringify(logged);
    expect(logged.length).toBeGreaterThan(0);
    for (const secret of ["Priya", "ShopLane", "Nimbus", highlight, "Dear Hiring Manager", "team player"]) {
      expect(everything).not.toContain(secret);
    }
  });
});

describe("rate limits", () => {
  it("allows 3 letters a minute per visitor, then answers 429 with Retry-After", async () => {
    const ip = nextIp();
    for (let i = 0; i < 3; i++) expect((await post(body, ip)).status).toBe(200);

    const response = await post(body, ip);
    expect(response.status).toBe(429);
    expect(Number(response.headers.get("Retry-After"))).toBeGreaterThan(0);
    expect((await response.json()).error).toEqual({
      code: "rate-limited",
      message: COVER_LETTER_ERROR_MESSAGES["rate-limited"],
    });
  });

  it("allows 15 letters a day, then asks to come back tomorrow", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-14T08:00:00Z"));
    const ip = nextIp();

    for (let i = 0; i < 15; i++) {
      if (i > 0 && i % 3 === 0) vi.setSystemTime(Date.now() + 61_000); // stay under 3 a minute
      expect((await post(body, ip)).status).toBe(200);
    }
    vi.setSystemTime(Date.now() + 61_000);
    const response = await post(body, ip);
    expect(response.status).toBe(429);
    expect((await response.json()).error.message).toMatch(/today's limit .* tomorrow/);
  });

  it("does not count invalid requests", async () => {
    const ip = nextIp();
    for (let i = 0; i < 5; i++) expect((await post({ ...body, tone: "angry" }, ip)).status).toBe(400);
    expect((await post(body, ip)).status).toBe(200);
  });

  it("keeps its own counts: using up the letter limit leaves the matcher untouched", async () => {
    const ip = nextIp();
    for (let i = 0; i < 3; i++) await post(body, ip);
    expect((await post(body, ip)).status).toBe(429);

    for (let i = 0; i < 5; i++) expect((await postMatcher(ip)).status).toBe(200); // the matcher's full minute
  });

  it("keeps its own counts: using up the matcher limit leaves the letter untouched", async () => {
    const ip = nextIp();
    for (let i = 0; i < 5; i++) expect((await postMatcher(ip)).status).toBe(200);
    expect((await postMatcher(ip)).status).toBe(429);

    for (let i = 0; i < 3; i++) expect((await post(body, ip)).status).toBe(200);
  });
});
