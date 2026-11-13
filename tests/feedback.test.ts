import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MATCHER_PATH, MESSAGE_MAX, describeBrowser, isValidEmail, pickDebugInfo, stripHtml } from "@/lib/feedback/rules";
import { parseFeedback, type Feedback } from "@/lib/feedback/schema";
import { MINUTE_MS, createRateLimiter } from "@/lib/rate-limit";
import { sampleJobDescription, sampleResume } from "@/lib/samples";

// Validation and safety rules for feedback. Email building and sending are tested in feedback-email.test.ts.

const base = {
  type: "bug",
  message: "The upload button does nothing on my phone.",
  email: "",
  website: "",
  context: { path: "/", timestamp: "2026-11-13T10:00:00.000Z", browser: "Chrome on macOS, 1440×900 window" },
};

const result = {
  score: 62,
  summary: "Good React match, missing AWS.",
  matchedKeywords: ["React", "TypeScript"],
  missingKeywords: ["AWS"],
};

function valid(body: unknown): Feedback {
  const checked = parseFeedback(body);
  if (checked.ok !== true) throw new Error(`Expected valid feedback, got ${JSON.stringify(checked)}`);
  return checked.feedback;
}

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("parseFeedback validation", () => {
  it("accepts a normal message and treats an empty email as no email", () => {
    const feedback = valid(base);
    expect(feedback.message).toBe(base.message);
    expect(feedback.email).toBeUndefined();
  });

  it("rejects messages that are too short or too long", () => {
    expect(parseFeedback({ ...base, message: "short" })).toEqual({
      ok: false,
      message: expect.stringContaining("between 10 and 2000"),
    });
    expect(parseFeedback({ ...base, message: "a".repeat(MESSAGE_MAX + 1) }).ok).toBe(false);
    expect(valid({ ...base, message: "a".repeat(MESSAGE_MAX) }).message).toHaveLength(MESSAGE_MAX);
  });

  it("checks the email address when one is given", () => {
    expect(parseFeedback({ ...base, email: "not-an-email" })).toEqual({
      ok: false,
      message: expect.stringContaining("email"),
    });
    expect(valid({ ...base, email: " priya@example.com " }).email).toBe("priya@example.com");
    expect(isValidEmail("a@b.co")).toBe(true);
    expect(isValidEmail("a@b")).toBe(false);
  });

  it("rejects an unknown type or a strange page path", () => {
    expect(parseFeedback({ ...base, type: "complaint" }).ok).toBe(false);
    expect(parseFeedback({ ...base, context: { ...base.context, path: "/x?token=abc" } }).ok).toBe(false);
  });
});

describe("honeypot", () => {
  it("flags a request where the hidden field is filled in as a bot", () => {
    expect(parseFeedback({ ...base, website: "http://spam.example" })).toEqual({ ok: "bot" });
  });

  it("lets a request through when the hidden field is empty", () => {
    expect(parseFeedback({ ...base, website: "" }).ok).toBe(true);
  });
});

describe("HTML stripping", () => {
  it("removes tags and control characters but keeps the words and line breaks", () => {
    expect(stripHtml('<b>Bold</b> and <a href="x">link</a>\nnext line\u0007')).toBe("Bold and link\nnext line");
    expect(stripHtml("<script>alert(1)</script>Hi")).toBe("alert(1)Hi");
    expect(stripHtml("unclosed <img src=x onerror=alert(1)")).toBe("unclosed");
  });

  it("is applied to the message and to attached keywords", () => {
    const feedback = valid({
      ...base,
      type: "wrong-result",
      message: "<h1>Wrong</h1> score, <i>please</i> check",
      context: { ...base.context, path: MATCHER_PATH },
      debug: { ...result, matchedKeywords: ["<b>React</b>"] },
    });
    expect(feedback.message).toBe("Wrong score, please check");
    expect(feedback.debug?.matchedKeywords).toEqual(["React"]);
  });

  it("checks the length after stripping, so tags can't pad a message", () => {
    expect(parseFeedback({ ...base, message: "<p></p><p></p><p>hi</p>" }).ok).toBe(false);
  });
});

describe("resume and job text can never be included", () => {
  it("rejects a request with resume or job description fields anywhere", () => {
    expect(parseFeedback({ ...base, resume: sampleResume }).ok).toBe(false);
    expect(parseFeedback({ ...base, jobDescription: sampleJobDescription }).ok).toBe(false);
    expect(
      parseFeedback({
        ...base,
        type: "wrong-result",
        context: { ...base.context, path: MATCHER_PATH },
        debug: { ...result, resume: sampleResume },
      }).ok,
    ).toBe(false);
    expect(parseFeedback({ ...base, context: { ...base.context, jobDescription: "x" } }).ok).toBe(false);
  });

  it("pickDebugInfo copies only score, summary and keywords", () => {
    const fullResult = { ...result, suggestions: [], resume: sampleResume, jobDescription: sampleJobDescription };
    expect(Object.keys(pickDebugInfo(fullResult)).sort()).toEqual([
      "matchedKeywords",
      "missingKeywords",
      "score",
      "summary",
    ]);
  });

  it("drops attached results unless it's a 'Wrong result' report from the Resume Matcher", () => {
    const onMatcher = { ...base.context, path: MATCHER_PATH };
    expect(valid({ ...base, type: "wrong-result", context: onMatcher, debug: result }).debug).toEqual(result);
    expect(valid({ ...base, type: "bug", context: onMatcher, debug: result }).debug).toBeUndefined();
    expect(valid({ ...base, type: "wrong-result", debug: result }).debug).toBeUndefined(); // path is "/"
  });
});

describe("feedback rate limit (3 per 10 minutes)", () => {
  it("blocks the 4th message, then allows one after 10 minutes", () => {
    const limiter = createRateLimiter([{ name: "ten-minutes", max: 3, windowMs: 10 * MINUTE_MS }]);
    const start = 1_000_000_000_000;
    for (let i = 0; i < 3; i++) expect(limiter.check("ip", start + i * 1000).allowed).toBe(true);
    expect(limiter.check("ip", start + 5 * MINUTE_MS)).toEqual({
      allowed: false,
      limit: "ten-minutes",
      retryAfterSeconds: 300,
    });
    expect(limiter.check("ip", start + 10 * MINUTE_MS).allowed).toBe(true);
  });
});

describe("describeBrowser", () => {
  it("gives a short summary", () => {
    const iphone =
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
    expect(describeBrowser(iphone, 390, 844)).toBe("Safari on iOS, 390×844 window");
    const edge = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140.0 Safari/537.36 Edg/140.0";
    expect(describeBrowser(edge, 1920.4, 1080)).toBe("Edge on Windows, 1920×1080 window");
  });
});
