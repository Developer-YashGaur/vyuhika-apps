import { AI_ERROR_MESSAGES, type AiErrorCode } from "@/lib/ai/errors";

// Small helpers shared by the AI API routes: reading the request body safely and answering with errors.

const STATUS: Record<AiErrorCode, number> = {
  "invalid-input": 400,
  "rate-limited": 429,
  timeout: 504,
  "ai-failed": 502,
  offline: 503, // only used by the browser, listed for completeness
};

// Every error answer has the same shape: { error: { code, message } }.
export function errorResponse(code: AiErrorCode, message = AI_ERROR_MESSAGES[code], headers?: HeadersInit) {
  return Response.json({ error: { code, message } }, { status: STATUS[code], headers });
}

type BodyCheck = { ok: true; body: unknown } | { ok: false; response: Response };

// Reads the body as JSON. Anything bigger than `maxBytes` is rejected before parsing,
// and so is text that isn't valid JSON.
export async function readJsonBody(request: Request, maxBytes: number, tooLargeMessage: string): Promise<BodyCheck> {
  const declaredSize = Number(request.headers.get("content-length") ?? 0);
  if (declaredSize > maxBytes) return { ok: false, response: errorResponse("invalid-input", tooLargeMessage) };

  const raw = await request.text();
  if (raw.length > maxBytes) return { ok: false, response: errorResponse("invalid-input", tooLargeMessage) };

  try {
    return { ok: true, body: JSON.parse(raw) };
  } catch {
    return { ok: false, response: errorResponse("invalid-input") };
  }
}
