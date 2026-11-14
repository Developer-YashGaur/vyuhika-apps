import { afterEach, describe, expect, it, vi } from "vitest";
import { AiError } from "@/lib/ai/errors";
import { postJson } from "@/lib/api/post-json";

// Tests the shared browser helper that calls our API routes. No real network: fetch is always faked.

const hasName = (data: unknown) => typeof (data as { name?: unknown } | null)?.name === "string";

const reply = (status: number, body: unknown) => (async () => Response.json(body, { status })) as typeof fetch;

async function errorOf(fetchFn: typeof fetch): Promise<AiError> {
  try {
    await postJson("/api/test", { hello: "world" }, hasName, fetchFn);
  } catch (error) {
    if (error instanceof AiError) return error;
    throw error;
  }
  throw new Error("Expected an AiError");
}

afterEach(() => vi.unstubAllGlobals());

describe("postJson", () => {
  it("sends JSON to the given URL and returns an answer that looks right", async () => {
    let sent: { url: string; init?: RequestInit } | null = null;
    const fetchFn = (async (url: string, init?: RequestInit) => {
      sent = { url, init };
      return Response.json({ name: "ok" });
    }) as typeof fetch;

    expect(await postJson("/api/test", { hello: "world" }, hasName, fetchFn)).toEqual({ name: "ok" });
    expect(sent!.url).toBe("/api/test");
    expect(sent!.init?.method).toBe("POST");
    expect(sent!.init?.body).toBe(JSON.stringify({ hello: "world" }));
  });

  it("reports offline without calling the server when the browser is offline", async () => {
    vi.stubGlobal("navigator", { onLine: false });
    const fetchFn = vi.fn(reply(200, { name: "ok" }));
    expect((await errorOf(fetchFn)).code).toBe("offline");
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("reports offline when the network request fails", async () => {
    const down = (async () => {
      throw new TypeError("Failed to fetch");
    }) as typeof fetch;
    expect((await errorOf(down)).code).toBe("offline");
  });

  it("reports a timeout when the request takes too long", async () => {
    const slow = (async () => {
      throw new DOMException("The operation timed out.", "TimeoutError");
    }) as typeof fetch;
    expect((await errorOf(slow)).code).toBe("timeout");
  });

  it("passes on a known error code and message from the server", async () => {
    const error = await errorOf(reply(429, { error: { code: "rate-limited", message: "Try again tomorrow." } }));
    expect(error.code).toBe("rate-limited");
    expect(error.message).toBe("Try again tomorrow.");
  });

  it("turns an unknown error into a friendly one", async () => {
    expect((await errorOf(reply(500, { error: { code: "kaboom", message: "stack trace" } }))).code).toBe("ai-failed");
    expect((await errorOf(reply(500, "not an object"))).code).toBe("ai-failed");
    expect((await errorOf(reply(429, null))).code).toBe("rate-limited");
  });

  it("rejects a successful answer with the wrong shape", async () => {
    expect((await errorOf(reply(200, { nope: true }))).code).toBe("ai-failed");
    expect((await errorOf(reply(200, null))).code).toBe("ai-failed");
  });
});
