import "server-only";
import { createGeminiGenerate } from "@/lib/ai/gemini";
import { AiError, type AiErrorCode } from "@/lib/ai/errors";
import { errorResponse, readJsonBody } from "@/lib/api/route-helpers";
import { COVER_LETTER_ERROR_MESSAGES } from "@/lib/cover-letter/errors";
import { parseCoverLetterInput } from "@/lib/cover-letter/schema";
import { writeCoverLetter } from "@/lib/cover-letter/write";
import { DAY_MS, MINUTE_MS, createRateLimiter, getClientIp } from "@/lib/rate-limit";

// POST /api/cover-letter with { resume, jobDescription, companyName?, roleTitle?, highlight?, tone, length }
// → { letter, gaps, notes, highlightHandling, highlightEvidence } (see lib/cover-letter/write.ts).
// `notes` lists style checks the letter still fails (names only, like ["length"]).
// Runs only on the server, so the Gemini API key never reaches the browser.

// Two 15,000-character fields plus the short ones fit easily; anything far bigger is rejected before parsing.
const MAX_BODY_BYTES = 200_000;

// Its own limiter, so these counts are separate from the Resume Matcher's. "Regenerate" counts too.
// Daily cap first, so a visitor who has used up the day sees the "try tomorrow" message.
const limiter = createRateLimiter([
  { name: "day", max: 15, windowMs: DAY_MS },
  { name: "minute", max: 3, windowMs: MINUTE_MS },
]);

// The same error answers as the matcher, in this app's words.
function letterError(code: AiErrorCode, message = COVER_LETTER_ERROR_MESSAGES[code], headers?: HeadersInit) {
  return errorResponse(code, message, headers);
}

// Vercel's Hobby plan allows up to 300 s (with Fluid compute, the default). The AI time limit is 50 s
// (AI_TIMEOUT_MS), so 60 s covers a slow call, a temporary-error retry, the fallback model and the checks.
export const maxDuration = 60;

export async function POST(request: Request) {
  // 1. Size and format checks.
  const read = await readJsonBody(request, MAX_BODY_BYTES, "That's too much text for one letter.");
  if (!read.ok) return read.response;

  const checked = parseCoverLetterInput(read.body);
  if (!checked.ok) return letterError("invalid-input", checked.message);

  // 2. Rate limit per visitor.
  const limit = limiter.check(getClientIp(request.headers));
  if (!limit.allowed) {
    const message =
      limit.limit === "day"
        ? "You've written today's limit of free cover letters. Please try again tomorrow."
        : COVER_LETTER_ERROR_MESSAGES["rate-limited"];
    return letterError("rate-limited", message, { "Retry-After": String(limit.retryAfterSeconds) });
  }

  // 3. Call the AI.
  const generate = createGeminiGenerate();
  if (!generate) {
    console.error("[cover-letter] GEMINI_API_KEY is not set");
    return letterError("ai-failed");
  }

  try {
    const { letter, gaps, notes, highlightHandling, highlightEvidence } = await writeCoverLetter(checked.input, generate);
    return Response.json(
      { letter, gaps, notes, highlightHandling, highlightEvidence },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof AiError) return letterError(error.code, error.message);
    // Log only the error type, never the person's text or the letter.
    console.error("[cover-letter] Unexpected error", { name: (error as Error)?.name });
    return letterError("ai-failed");
  }
}
