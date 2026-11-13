import "server-only"; // build fails if this file is ever imported into browser code
import { GoogleGenAI } from "@google/genai";
import type { GenerateFn } from "@/lib/analyze/analyze";

// The only file that talks to Google. The API key is read from the server's environment
// (.env.local locally, Vercel's settings in production) and never leaves the server.

// Fast, low-cost model that works on the free tier. Override with GEMINI_MODEL in .env.local.
export const DEFAULT_GEMINI_MODEL = "gemini-3.5-flash-lite";

export function getGeminiModel(): string {
  return process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL;
}

// Returns null when the key is missing, so the route can answer with a friendly error.
export function createGeminiGenerate(): GenerateFn | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return null;

  const ai = new GoogleGenAI({ apiKey });
  const model = getGeminiModel();

  return async ({ systemInstruction, prompt, jsonSchema, signal }) => {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseJsonSchema: jsonSchema,
        abortSignal: signal,
      },
    });
    return response.text;
  };
}
