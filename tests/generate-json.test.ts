import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { AiError } from "@/lib/ai/errors";
import { generateJson, type GenerateFn } from "@/lib/ai/generate-json";

// Tests the shared "ask the AI for JSON" helper. No real Gemini calls: every answer comes from a fake.

const schema = z.object({ greeting: z.string().min(1) });
const valid = JSON.stringify({ greeting: "hello" });

// A fake AI that returns each answer in turn and counts how often it was called.
function fakeAi(...answers: (string | undefined)[]) {
  let calls = 0;
  const generate: GenerateFn = async () => answers[Math.min(calls++, answers.length - 1)];
  return { generate, calls: () => calls };
}

function run(generate: GenerateFn, timeoutMs?: number) {
  return generateJson({ systemInstruction: "rules", prompt: "data", schema, generate, logLabel: "test", timeoutMs });
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

beforeEach(() => {
  // The helper logs failures on purpose; keep test output clean.
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

describe("generateJson", () => {
  it("returns a valid answer after one call", async () => {
    const ai = fakeAi(valid);
    expect(await run(ai.generate)).toEqual({ greeting: "hello" });
    expect(ai.calls()).toBe(1);
  });

  it("sends the schema to the AI as JSON Schema, without $schema", async () => {
    let sent: Record<string, unknown> = {};
    await run(async (request) => {
      sent = request.jsonSchema;
      return valid;
    });
    expect(sent.type).toBe("object");
    expect(sent).not.toHaveProperty("$schema");
  });

  it("retries once when the answer is broken, and uses the retry", async () => {
    const ai = fakeAi("{ not json", valid);
    expect(await run(ai.generate)).toEqual({ greeting: "hello" });
    expect(ai.calls()).toBe(2);
  });

  it("retries only once, then gives a friendly error", async () => {
    const ai = fakeAi(JSON.stringify({ greeting: "" }));
    const error = await errorOf(run(ai.generate));
    expect(error.code).toBe("ai-failed");
    expect(error.message).not.toMatch(/json|schema|zod/i);
    expect(ai.calls()).toBe(2);
  });

  it("times out when the AI is too slow", async () => {
    const slow: GenerateFn = ({ signal }) =>
      new Promise((_, reject) => signal.addEventListener("abort", () => reject(signal.reason)));
    expect((await errorOf(run(slow, 20))).code).toBe("timeout");
  });

  it("the time limit covers the retry too", async () => {
    // The first answer is broken, the retry hangs: the total time limit still ends it.
    let calls = 0;
    const brokenThenSlow: GenerateFn = ({ signal }) =>
      calls++ === 0
        ? Promise.resolve("{ not json")
        : new Promise((_, reject) => signal.addEventListener("abort", () => reject(signal.reason)));
    expect((await errorOf(run(brokenThenSlow, 20))).code).toBe("timeout");
    expect(calls).toBe(2);
  });
});
