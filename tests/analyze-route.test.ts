import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sampleJobDescription, sampleResume } from "@/lib/samples";
import { MAX_CHARS } from "@/lib/validation";

// Tests the real /api/analyze route with Gemini swapped for a fake (no network calls).

const fakeAnswer = {
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

vi.mock("@/lib/analyze/gemini", () => ({
  createGeminiGenerate: () => async () => JSON.stringify(fakeAnswer),
}));

const { POST } = await import("@/app/api/analyze/route");

let ipCounter = 0;
// Each test uses its own IP address so the rate limiter doesn't carry over between tests.
function post(body: unknown, ip = `10.0.0.${++ipCounter}`) {
  return POST(
    new Request("http://localhost/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );
}

const valid = { resume: sampleResume, jobDescription: sampleJobDescription };

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

describe("POST /api/analyze", () => {
  it("returns the result for valid input", async () => {
    const response = await post(valid);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(fakeAnswer);
  });

  it("rejects text over the length limit with a clear message", async () => {
    const response = await post({ ...valid, resume: "a".repeat(MAX_CHARS + 1) });
    expect(response.status).toBe(400);
    const { error } = await response.json();
    expect(error.code).toBe("invalid-input");
    expect(error.message).toContain("resume is too long");
  });

  it("rejects a body that isn't JSON", async () => {
    const response = await post("not json at all");
    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe("invalid-input");
  });

  it("allows 5 requests a minute per visitor, then answers 429 with a friendly message", async () => {
    for (let i = 0; i < 5; i++) expect((await post(valid, "203.0.113.9")).status).toBe(200);

    const response = await post(valid, "203.0.113.9");
    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBeTruthy();
    const { error } = await response.json();
    expect(error.code).toBe("rate-limited");
    expect(error.message).toMatch(/try again/i);
  });
});
