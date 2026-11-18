import { describe, expect, it } from "vitest";
import { createTavilySearch, formatTavilyResults } from "@/lib/ai/tavily-search";

describe("free web search (Tavily)", () => {
  it("turns results into text that contains each link", () => {
    const text = formatTavilyResults([{ title: "Backend Engineer", url: "https://acme.com/jobs/1", content: "Build APIs." }, { url: 5 }, null]);
    expect(text).toContain("https://acme.com/jobs/1");
    expect(text).toContain("Build APIs.");
    expect(text).not.toContain("Result 2");
  });
  it("gives nothing for a bad answer", () => {
    expect(formatTavilyResults(undefined)).toBe("");
    expect(formatTavilyResults("x")).toBe("");
  });
  it("is off without a key", () => {
    delete process.env.TAVILY_API_KEY;
    expect(createTavilySearch()).toBe(null);
  });
  it("sends the short query with the key, and fails clearly on an error", async () => {
    process.env.TAVILY_API_KEY = "k";
    let sent: { body?: string; headers?: Record<string, string> } = {};
    const ok = (async (_u: unknown, init: RequestInit) => { sent = init as never; return new Response(JSON.stringify({ results: [{ title: "T", url: "https://a.com/j", content: "c" }] })); }) as typeof fetch;
    const res = await createTavilySearch(ok)!({ prompt: "long prompt", query: "acme careers", signal: new AbortController().signal });
    expect(JSON.parse(sent.body!).query).toBe("acme careers");
    expect(sent.headers!.Authorization).toBe("Bearer k");
    expect(res.sources[0].uri).toBe("https://a.com/j");
    const bad = (async () => new Response("no", { status: 429 })) as unknown as typeof fetch;
    let message = "";
    try {
      await createTavilySearch(bad)!({ prompt: "p", signal: new AbortController().signal });
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).toContain("429");
    delete process.env.TAVILY_API_KEY;
  });
});
