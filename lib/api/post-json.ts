import { AI_ERROR_MESSAGES, AiError, type AiErrorCode } from "@/lib/ai/errors";

// Runs in the browser: sends JSON to one of our own API routes (never to Google directly)
// and turns every kind of failure into a friendly AiError.

// A bit longer than the server's own 30-second limit, so the server can answer first.
const CLIENT_TIMEOUT_MS = 40_000;

const KNOWN_CODES = Object.keys(AI_ERROR_MESSAGES) as AiErrorCode[];

// `looksRight` checks that a successful answer has the shape the page expects.
export async function postJson<T>(
  url: string,
  body: unknown,
  looksRight: (data: unknown) => boolean,
  fetchFn: typeof fetch = fetch,
): Promise<T> {
  if (typeof navigator !== "undefined" && navigator.onLine === false) throw new AiError("offline");

  let response: Response;
  try {
    response = await fetchFn(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(CLIENT_TIMEOUT_MS),
    });
  } catch (error) {
    if ((error as Error)?.name === "TimeoutError") throw new AiError("timeout");
    // fetch throws a TypeError when the network is down.
    throw new AiError("offline");
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const code = data?.error?.code;
    const message = data?.error?.message;
    if (KNOWN_CODES.includes(code)) throw new AiError(code, typeof message === "string" ? message : undefined);
    throw new AiError(response.status === 429 ? "rate-limited" : "ai-failed");
  }

  if (!looksRight(data)) throw new AiError("ai-failed");
  return data as T;
}
