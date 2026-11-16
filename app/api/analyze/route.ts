import "server-only";
import { analyzeMatch } from "@/lib/analyze/analyze";
import { AI_ERROR_MESSAGES, AiError } from "@/lib/ai/errors";
import { createGeminiGenerate } from "@/lib/ai/gemini";
import { parseAnalyzeInput } from "@/lib/analyze/input";
import { errorResponse, readJsonBody } from "@/lib/api/route-helpers";
import { DAY_MS, MINUTE_MS, createRateLimiter, getClientIp } from "@/lib/rate-limit";

// POST /api/analyze with { resume, jobDescription } → a MatchResult (see lib/types.ts).
// Runs only on the server, so the Gemini API key never reaches the browser.

// Two 15,000-character fields fit easily; anything far bigger is rejected before parsing.
const MAX_BODY_BYTES = 200_000;

// Daily cap first, so a visitor who has used up the day sees the "try tomorrow" message.
const limiter = createRateLimiter([
  { name: "day", max: 30, windowMs: DAY_MS },
  { name: "minute", max: 5, windowMs: MINUTE_MS },
]);

export async function POST(request: Request) {
  // 1. Size and format checks.
  const read = await readJsonBody(request, MAX_BODY_BYTES, "That's too much text to analyze.");
  if (!read.ok) return read.response;

  const checked = parseAnalyzeInput(read.body);
  if (!checked.ok) return errorResponse("invalid-input", checked.message);

  // 2. Rate limit per visitor.
  const limit = limiter.check(getClientIp(request.headers));
  if (!limit.allowed) {
    const message =
      limit.limit === "day"
        ? "You've reached today's limit for this free tool. Please try again tomorrow."
        : AI_ERROR_MESSAGES["rate-limited"];
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
    if (error instanceof AiError) return errorResponse(error.code, error.message);
    console.error("[analyze] Unexpected error", { name: (error as Error)?.name });
    return errorResponse("ai-failed");
  }
}
