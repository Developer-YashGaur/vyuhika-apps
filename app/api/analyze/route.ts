import "server-only";
import { analyzeMatch } from "@/lib/analyze/analyze";
import { ANALYZE_ERROR_MESSAGES, AnalyzeError, type AnalyzeErrorCode } from "@/lib/analyze/errors";
import { createGeminiGenerate } from "@/lib/analyze/gemini";
import { parseAnalyzeInput } from "@/lib/analyze/input";
import { createRateLimiter, getClientIp } from "@/lib/analyze/rate-limit";

// POST /api/analyze with { resume, jobDescription } → a MatchResult (see lib/types.ts).
// Runs only on the server, so the Gemini API key never reaches the browser.

// Two 15,000-character fields fit easily; anything far bigger is rejected before parsing.
const MAX_BODY_BYTES = 200_000;

const limiter = createRateLimiter({ perMinute: 5, perDay: 30 });

const STATUS: Record<AnalyzeErrorCode, number> = {
  "invalid-input": 400,
  "rate-limited": 429,
  timeout: 504,
  "ai-failed": 502,
  offline: 503, // only used by the browser, listed for completeness
};

function errorResponse(code: AnalyzeErrorCode, message = ANALYZE_ERROR_MESSAGES[code], headers?: HeadersInit) {
  return Response.json({ error: { code, message } }, { status: STATUS[code], headers });
}

export async function POST(request: Request) {
  // 1. Size and format checks.
  const declaredSize = Number(request.headers.get("content-length") ?? 0);
  if (declaredSize > MAX_BODY_BYTES) return errorResponse("invalid-input", "That's too much text to analyze.");

  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) return errorResponse("invalid-input", "That's too much text to analyze.");

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return errorResponse("invalid-input");
  }

  const checked = parseAnalyzeInput(body);
  if (!checked.ok) return errorResponse("invalid-input", checked.message);

  // 2. Rate limit per visitor.
  const limit = limiter.check(getClientIp(request.headers));
  if (!limit.allowed) {
    const message =
      limit.reason === "day"
        ? "You've reached today's limit for this free tool. Please try again tomorrow."
        : ANALYZE_ERROR_MESSAGES["rate-limited"];
    return errorResponse("rate-limited", message, { "Retry-After": String(limit.retryAfterSeconds) });
  }

  // 3. Call the AI.
  const generate = createGeminiGenerate();
  if (!generate) {
    console.error("[analyze] GEMINI_API_KEY is not set");
    return errorResponse("ai-failed");
  }

  try {
    const result = await analyzeMatch(checked.input.resume, checked.input.jobDescription, generate);
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof AnalyzeError) return errorResponse(error.code, error.message);
    console.error("[analyze] Unexpected error", { name: (error as Error)?.name });
    return errorResponse("ai-failed");
  }
}
