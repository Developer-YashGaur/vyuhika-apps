import { describe, expect, it } from "vitest";
import { requestAnalysis } from "@/lib/analyze/client";
import { AnalyzeError } from "@/lib/analyze/errors";

// Checks how the browser turns network problems and server errors into friendly errors.

async function codeOf(fetchFn: typeof fetch): Promise<string> {
  try {
    await requestAnalysis("resume", "job", fetchFn);
  } catch (error) {
    if (error instanceof AnalyzeError) return error.code;
    throw error;
  }
  throw new Error("Expected an AnalyzeError");
}

const reply = (status: number, body: unknown) => (async () => Response.json(body, { status })) as typeof fetch;

describe("requestAnalysis", () => {
  it("returns the result when the server answers OK", async () => {
    const result = { score: 50, summary: "s", matchedKeywords: [], missingKeywords: [], suggestions: [] };
    expect(await requestAnalysis("resume", "job", reply(200, result))).toEqual(result);
  });

  it("reports offline when the network request fails", async () => {
    const down = (async () => {
      throw new TypeError("Failed to fetch");
    }) as typeof fetch;
    expect(await codeOf(down)).toBe("offline");
  });

  it("passes on the server's error code and message", async () => {
    const fetchFn = reply(429, { error: { code: "rate-limited", message: "Please try again tomorrow." } });
    await expect(requestAnalysis("r", "j", fetchFn)).rejects.toMatchObject({
      code: "rate-limited",
      message: "Please try again tomorrow.",
    });
    expect(await codeOf(reply(504, { error: { code: "timeout", message: "Too slow" } }))).toBe("timeout");
  });

  it("falls back to a generic error for unexpected replies", async () => {
    expect(await codeOf(reply(500, "oops"))).toBe("ai-failed");
    expect(await codeOf(reply(200, { nope: true }))).toBe("ai-failed");
  });
});
