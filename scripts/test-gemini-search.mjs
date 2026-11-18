// Checks Gemini web search (Google Search grounding) with your own key, one model at a time, and prints Google's
// full answer when it fails. It never prints the key. Run it from the project folder:
//   node --env-file=.env.local scripts/test-gemini-search.mjs
// To try other models:  node --env-file=.env.local scripts/test-gemini-search.mjs gemini-2.5-flash gemini-3-flash
import { GoogleGenAI } from "@google/genai";

const key = process.env.GEMINI_API_KEY?.trim();
if (!key) {
  console.error("GEMINI_API_KEY is missing in .env.local");
  process.exit(1);
}
const ai = new GoogleGenAI({ apiKey: key });
const fromArgs = process.argv.slice(2);
const models = fromArgs.length ? fromArgs : [...new Set([process.env.GEMINI_SEARCH_MODEL, process.env.GEMINI_MODEL, "gemini-2.5-flash", "gemini-2.5-flash-lite"].filter(Boolean))];

for (const model of models) {
  const start = Date.now();
  try {
    const response = await ai.models.generateContent({
      model,
      contents: "List 2 current job openings at Freshworks for a Frontend Developer, with links.",
      config: { tools: [{ googleSearch: {} }] },
    });
    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks?.length ?? 0;
    console.log(`OK    ${model}: ${Date.now() - start} ms, ${response.text?.length ?? 0} characters, ${sources} sources`);
  } catch (error) {
    console.log(`FAIL  ${model}: ${Date.now() - start} ms, status ${error?.status ?? "?"}`);
    console.log(String(error?.message ?? error).slice(0, 2500).replaceAll(key, "[key]"));
  }
  console.log("");
}
