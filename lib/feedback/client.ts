import type { FeedbackDebug, FeedbackType } from "@/lib/feedback/rules";

// Runs in the browser: sends feedback to our own API route and turns failures into friendly messages.

export type FeedbackRequest = {
  type: FeedbackType;
  message: string;
  email: string;
  website: string; // the hidden honeypot field, normally empty
  context: { path: string; timestamp: string; browser: string };
  debug?: FeedbackDebug;
};

const FALLBACK_ERROR = "We couldn't send your feedback right now. Please try again later.";

export async function sendFeedback(request: FeedbackRequest, fetchFn: typeof fetch = fetch): Promise<void> {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    throw new Error("You seem to be offline. Check your connection and try again.");
  }

  let response: Response;
  try {
    response = await fetchFn("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw new Error(FALLBACK_ERROR);
  }

  if (response.ok) return;
  const data = await response.json().catch(() => null);
  throw new Error(typeof data?.error?.message === "string" ? data.error.message : FALLBACK_ERROR);
}
