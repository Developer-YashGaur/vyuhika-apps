import "server-only"; // build fails if this file is ever imported into browser code
import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import type { GenerateFn } from "@/lib/ai/generate-json";
import type { SearchFn } from "@/lib/ai/search";

// The only file that talks to Google. The API key is read from the server's environment
// (.env.local locally, Vercel's settings in production) and never leaves the server.

// Fast, low-cost model that works on the free tier. Override with GEMINI_MODEL in .env.local.
export const DEFAULT_GEMINI_MODEL = "gemini-3.5-flash-lite";

export function getGeminiModel(): string {
  return process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL;
}

// Used once when the main model keeps failing with temporary errors (HTTP 500, 503, 504 or a short 429).
// A different stable, fast, low-cost model that supports JSON answers (Google's model pages, checked 2026-11-16).
// Override with GEMINI_FALLBACK_MODEL in .env.local.
export const DEFAULT_GEMINI_FALLBACK_MODEL = "gemini-3.1-flash-lite";

export function getGeminiFallbackModel(): string {
  return process.env.GEMINI_FALLBACK_MODEL?.trim() || DEFAULT_GEMINI_FALLBACK_MODEL;
}

// How much the model "thinks" before answering. Google's docs (checked 2026-11-16) say gemini-3.5-flash-lite and
// gemini-3.1-flash-lite already think at "minimal" by default, which is the lowest level (near-off, lowest latency),
// so nothing is sent unless GEMINI_THINKING_LEVEL is set to minimal, low, medium or high. A higher level is slower.
const THINKING_LEVELS: Record<string, ThinkingLevel> = {
  minimal: ThinkingLevel.MINIMAL,
  low: ThinkingLevel.LOW,
  medium: ThinkingLevel.MEDIUM,
  high: ThinkingLevel.HIGH,
};

export function getGeminiThinkingLevel(): ThinkingLevel | undefined {
  return THINKING_LEVELS[process.env.GEMINI_THINKING_LEVEL?.trim().toLowerCase() ?? ""];
}

// Returns null when the key is missing, so the route can answer with a friendly error.
export function createGeminiGenerate(): GenerateFn | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return null;

  const ai = new GoogleGenAI({ apiKey });
  const model = getGeminiModel();
  const fallbackModel = getGeminiFallbackModel();
  const thinkingLevel = getGeminiThinkingLevel();

  return async ({ systemInstruction, prompt, jsonSchema, signal, fallback }) => {
    const response = await ai.models.generateContent({
      model: fallback ? fallbackModel : model,
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseJsonSchema: jsonSchema,
        abortSignal: signal,
        ...(thinkingLevel && { thinkingConfig: { thinkingLevel } }),
      },
    });
    return response.text;
  };
}

// Like createGeminiGenerate, but the model may search Google while it answers (Google Search grounding) and the
// answer is plain text, because grounding together with a JSON schema is not reliable. A second call turns the text
// into JSON. Returns null when the key is missing.
export function createGeminiSearch(): SearchFn | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return null;

  const ai = new GoogleGenAI({ apiKey });
  // Web search can need a stronger model than the cheap default. Set GEMINI_SEARCH_MODEL in .env.local to change it.
  const model = process.env.GEMINI_SEARCH_MODEL?.trim() || getGeminiModel();

  return async ({ prompt, signal }) => {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: { tools: [{ googleSearch: {} }], abortSignal: signal },
    });
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
    const sources = chunks.flatMap((chunk) => (chunk.web?.uri ? [{ uri: chunk.web.uri, title: chunk.web.title ?? "" }] : []));
    return { text: response.text ?? "", sources };
  };
}
