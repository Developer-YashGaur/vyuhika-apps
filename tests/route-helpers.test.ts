import { describe, expect, it } from "vitest";
import { errorResponse, readJsonBody } from "@/lib/api/route-helpers";

// Tests the shared helpers the API routes use to read requests and answer with errors.

const MAX = 100;
const TOO_LARGE = "That's too much text.";

function request(body: string, headers: Record<string, string> = {}) {
  return new Request("http://localhost/api/test", { method: "POST", body, headers });
}

async function errorOf(check: Awaited<ReturnType<typeof readJsonBody>>) {
  if (check.ok) throw new Error("Expected the body to be rejected");
  return { status: check.response.status, ...(await check.response.json()).error };
}

describe("readJsonBody", () => {
  it("returns the parsed body when it is small, valid JSON", async () => {
    expect(await readJsonBody(request('{"a":1}'), MAX, TOO_LARGE)).toEqual({ ok: true, body: { a: 1 } });
  });

  it("rejects a body that is too big", async () => {
    const big = JSON.stringify({ text: "a".repeat(MAX) });
    expect(await errorOf(await readJsonBody(request(big), MAX, TOO_LARGE))).toEqual({
      status: 400,
      code: "invalid-input",
      message: TOO_LARGE,
    });
  });

  it("rejects a body whose declared size is too big, before reading it", async () => {
    const check = await readJsonBody(request("{}", { "content-length": String(MAX + 1) }), MAX, TOO_LARGE);
    expect((await errorOf(check)).message).toBe(TOO_LARGE);
  });

  it("rejects text that isn't JSON, with the standard message", async () => {
    const error = await errorOf(await readJsonBody(request("not json at all"), MAX, TOO_LARGE));
    expect(error.status).toBe(400);
    expect(error.code).toBe("invalid-input");
    expect(error.message).not.toMatch(/json|syntax/i);
  });
});

describe("errorResponse", () => {
  it("uses the right HTTP status for each error", () => {
    expect(errorResponse("invalid-input").status).toBe(400);
    expect(errorResponse("rate-limited").status).toBe(429);
    expect(errorResponse("timeout").status).toBe(504);
    expect(errorResponse("ai-failed").status).toBe(502);
  });

  it("answers { error: { code, message } } and keeps extra headers", async () => {
    const response = errorResponse("rate-limited", "Slow down.", { "Retry-After": "30" });
    expect(response.headers.get("Retry-After")).toBe("30");
    expect(await response.json()).toEqual({ error: { code: "rate-limited", message: "Slow down." } });
  });
});
