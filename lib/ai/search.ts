// One AI call that is allowed to search the web (Google Search grounding). Passed in as a parameter so tests can use
// a fake instead of Gemini. The answer is plain text: it is UNTRUSTED (it comes from web pages), so the app checks it.

// `query` is a short search phrase, used by search engines that take a query instead of a long prompt.
export type SearchRequest = { prompt: string; query?: string; signal: AbortSignal };
export type SearchSource = { uri: string; title: string };
export type SearchResult = { text: string; sources: SearchSource[] };
export type SearchFn = (request: SearchRequest) => Promise<SearchResult>;
