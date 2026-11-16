import { describe, expect, it } from "vitest";
import { AiError } from "@/lib/ai/errors";
import { requestCoverLetter } from "@/lib/cover-letter/client";
import { COVER_LETTER_ERROR_MESSAGES } from "@/lib/cover-letter/errors";
import type { CoverLetterInput } from "@/lib/cover-letter/schema";
import { valid } from "./fixtures/cover-letter";

// Checks how the browser sends the request and turns failures into friendly errors in the letter app's words.

const input: CoverLetterInput = {
  resume: "r".repeat(300),
  jobDescription: "j".repeat(300),
  tone: "professional",
  length: "short",
};

const answer = { ...valid, notes: [] };
const reply = (status: number, body: unknown) => (async () => Response.json(body, { status })) as typeof fetch;

async function failure(fetchFn: typeof fetch): Promise<AiError> {
  try {
    await requestCoverLetter(input, fetchFn);
  } catch (error) {
    if (error instanceof AiError) return error;
    throw error;
  }
  throw new Error("Expected an AiError");
}

describe("requestCoverLetter", () => {
  it("returns the answer when the server replies OK", async () => {
    expect(await requestCoverLetter(input, reply(200, answer))).toEqual(answer);
  });

  it("sends only the fields the server accepts and leaves blank optional ones out", async () => {
    let sent: { url: string; body: Record<string, unknown> } | undefined;
    const spy = (async (url: string, init: RequestInit) => {
      sent = { url, body: JSON.parse(String(init.body)) };
      return Response.json(answer);
    }) as unknown as typeof fetch;

    await requestCoverLetter({ ...input, companyName: "  Nimbus  ", roleTitle: "   ", highlight: "" }, spy);

    expect(sent?.url).toBe("/api/cover-letter");
    expect(sent?.body).toEqual({ ...input, companyName: "Nimbus" });
  });

  it("uses the letter app's words when the network is down", async () => {
    const down = (async () => {
      throw new TypeError("Failed to fetch");
    }) as typeof fetch;
    const error = await failure(down);
    expect(error.code).toBe("offline");
    expect(error.message).toBe(COVER_LETTER_ERROR_MESSAGES.offline);
  });

  it("uses the letter app's words for a reply without a message", async () => {
    const limited = await failure(reply(429, "slow down"));
    expect(limited.code).toBe("rate-limited");
    expect(limited.message).toBe(COVER_LETTER_ERROR_MESSAGES["rate-limited"]);

    const broken = await failure(reply(500, "oops"));
    expect(broken.code).toBe("ai-failed");
    expect(broken.message).toBe(COVER_LETTER_ERROR_MESSAGES["ai-failed"]);
  });

  it("keeps the server's own code and message", async () => {
    const error = await failure(
      reply(429, { error: { code: "rate-limited", message: "You've written today's limit of free cover letters." } }),
    );
    expect(error.code).toBe("rate-limited");
    expect(error.message).toBe("You've written today's limit of free cover letters.");
  });

  it("treats an answer without a letter or without gaps as a failure", async () => {
    for (const body of [{ gaps: [] }, { letter: "Dear Hiring Manager," }, { letter: "", gaps: [] }, { letter: 5, gaps: [] }, null]) {
      const error = await failure(reply(200, body));
      expect(error.code).toBe("ai-failed");
      expect(error.message).toBe(COVER_LETTER_ERROR_MESSAGES["ai-failed"]);
    }
  });
});
