import "server-only";
import { deliverFeedback } from "@/lib/feedback/deliver";
import { parseFeedback } from "@/lib/feedback/schema";
import { MINUTE_MS, createRateLimiter, getClientIp } from "@/lib/rate-limit";

// POST /api/feedback → emails the feedback to the site owner.
// Answers { ok: true } or { error: { message } }. Message content is never logged.

// A 2,000-character message plus attached keywords is far smaller than this.
const MAX_BODY_BYTES = 16_000;

const limiter = createRateLimiter([{ name: "ten-minutes", max: 3, windowMs: 10 * MINUTE_MS }]);

const GENERIC_ERROR = "We couldn't send your feedback right now. Please try again later.";

function errorResponse(status: number, message: string, headers?: HeadersInit) {
  return Response.json({ error: { message } }, { status, headers });
}

export async function POST(request: Request) {
  const declaredSize = Number(request.headers.get("content-length") ?? 0);
  if (declaredSize > MAX_BODY_BYTES) return errorResponse(413, "Your message is too long.");

  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) return errorResponse(413, "Your message is too long.");

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return errorResponse(400, "Something in the form wasn't right. Please refresh the page and try again.");
  }

  const checked = parseFeedback(body);
  // A bot filled in the hidden field: pretend it worked so it doesn't try again, but send nothing.
  if (checked.ok === "bot") return Response.json({ ok: true });
  if (!checked.ok) return errorResponse(400, checked.message);

  const limit = limiter.check(getClientIp(request.headers));
  if (!limit.allowed) {
    return errorResponse(429, "You've sent a lot of feedback in a short time. Please try again in a few minutes.", {
      "Retry-After": String(limit.retryAfterSeconds),
    });
  }

  const delivered = await deliverFeedback(checked.feedback);
  if (!delivered.ok) return errorResponse(503, GENERIC_ERROR);
  return Response.json({ ok: true });
}
