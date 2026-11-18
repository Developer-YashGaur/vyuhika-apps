import type { SearchFn } from "@/lib/ai/search";

// Free web search for "Find openings" (Tavily: about 1000 free credits a month, no card needed).
// It only returns web pages; the AI is then used just to tidy them into a list, so no paid Google Search is needed.
// Page text is UNTRUSTED: the app checks it the same way as before (links, contacts, prompt-injection).

type TavilyResult = { title?: unknown; url?: unknown; content?: unknown };

export function formatTavilyResults(results: unknown): string {
  if (!Array.isArray(results)) return "";
  return (results as TavilyResult[])
    .flatMap((r) => (typeof r?.url === "string" && typeof r?.content === "string" ? [r] : []))
    .slice(0, 8)
    .map((r, i) => `Result ${i + 1}\nTitle: ${String(r.title ?? "").slice(0, 200)}\nLink: ${r.url}\nPage text: ${String(r.content).slice(0, 1800)}`)
    .join("\n\n");
}

export function createTavilySearch(fetchFn: typeof fetch = fetch): SearchFn | null {
  const apiKey = process.env.TAVILY_API_KEY?.trim();
  if (!apiKey) return null;

  return async ({ prompt, query, signal }) => {
    const response = await fetchFn("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ query: query ?? prompt.slice(0, 300), search_depth: "advanced", chunks_per_source: 3, max_results: 8 }),
      signal,
    });
    if (!response.ok) throw new Error(`Tavily search failed with status ${response.status}`);
    const data = (await response.json()) as { results?: unknown };
    const results = Array.isArray(data.results) ? (data.results as TavilyResult[]) : [];
    const sources = results.flatMap((r) => (typeof r.url === "string" ? [{ uri: r.url, title: String(r.title ?? "") }] : []));
    return { text: formatTavilyResults(results), sources };
  };
}
