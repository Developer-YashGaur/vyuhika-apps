import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Which Gemini model each call uses. The Google client is faked: nothing leaves this machine.

const generateContent = vi.fn<(args: Record<string, unknown>) => Promise<{ text: string }>>(async () => ({ text: '{"ok":true}' }));
vi.mock("@google/genai", () => ({
  GoogleGenAI: class {
    models = { generateContent };
  },
}));

const { DEFAULT_GEMINI_FALLBACK_MODEL, DEFAULT_GEMINI_MODEL, createGeminiGenerate, getGeminiFallbackModel } = await import(
  "@/lib/ai/gemini"
);

const request = { systemInstruction: "rules", prompt: "data", jsonSchema: {}, signal: new AbortController().signal };

beforeEach(() => {
  vi.stubEnv("GEMINI_API_KEY", "fake-key-for-tests");
  generateContent.mockClear();
});
afterEach(() => vi.unstubAllEnvs());

describe("Gemini models", () => {
  it("the fallback defaults to a different stable model than the main one", () => {
    expect(DEFAULT_GEMINI_FALLBACK_MODEL).toBe("gemini-3.1-flash-lite");
    expect(DEFAULT_GEMINI_FALLBACK_MODEL).not.toBe(DEFAULT_GEMINI_MODEL);
    expect(DEFAULT_GEMINI_FALLBACK_MODEL).not.toMatch(/preview|exp/);
  });

  it("uses the main model normally and the fallback only when asked", async () => {
    const generate = createGeminiGenerate()!;
    await generate(request);
    await generate({ ...request, fallback: false });
    await generate({ ...request, fallback: true });
    expect(generateContent.mock.calls.map(([args]) => args.model)).toEqual([
      DEFAULT_GEMINI_MODEL,
      DEFAULT_GEMINI_MODEL,
      DEFAULT_GEMINI_FALLBACK_MODEL,
    ]);
  });

  it("GEMINI_MODEL and GEMINI_FALLBACK_MODEL override the defaults (blank values don't)", async () => {
    vi.stubEnv("GEMINI_MODEL", " my-main ");
    vi.stubEnv("GEMINI_FALLBACK_MODEL", " my-fallback ");
    const generate = createGeminiGenerate()!;
    await generate(request);
    await generate({ ...request, fallback: true });
    expect(generateContent.mock.calls.map(([args]) => args.model)).toEqual(["my-main", "my-fallback"]);

    vi.stubEnv("GEMINI_FALLBACK_MODEL", "   ");
    expect(getGeminiFallbackModel()).toBe(DEFAULT_GEMINI_FALLBACK_MODEL);
  });

  it("returns nothing without a key, so the route can answer with a friendly error", () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    expect(createGeminiGenerate()).toBeNull();
  });
});
