import { describe, expect, it } from "vitest";
import { FEEDBACK_PAGES, checkDebug, feedbackPage } from "@/lib/feedback/pages";
import { COVER_LETTER_PATH, MATCHER_PATH, type LetterFeedbackDebug } from "@/lib/feedback/rules";
import { parseFeedback } from "@/lib/feedback/schema";

// The table of pages that may attach a debug block, and the strict schema of each one.

const base = {
  type: "wrong-result",
  message: "The letter is much longer than the length I picked.",
  email: "",
  website: "",
  context: { path: COVER_LETTER_PATH, timestamp: "2026-11-16T10:00:00.000Z", browser: "Chrome on macOS, 1440×900 window" },
};

const letterDebug: LetterFeedbackDebug = {
  tone: "friendly",
  length: "short",
  wordCount: 231,
  blanks: 2,
  companyFilled: true,
  roleFilled: false,
  highlightFilled: true,
  highlightHandling: "gap",
  notes: ["length"],
};

const matcherDebug = { score: 62, summary: "Good React match.", matchedKeywords: ["React"], missingKeywords: ["AWS"] };

const send = (debug: unknown, over: Record<string, unknown> = {}) => parseFeedback({ ...base, ...over, debug });
const sendPlain = (extra: Record<string, unknown>) => parseFeedback({ ...base, debug: letterDebug, ...extra });

// Every name the cover letter page must never send, anywhere.
const FORBIDDEN = ["letter", "resume", "jobDescription", "highlight", "highlightEvidence", "companyName", "roleTitle", "gaps"];

describe("allowed pages table", () => {
  it("lists exactly the Resume Matcher and the Cover Letter Writer", () => {
    expect(Object.keys(FEEDBACK_PAGES).sort()).toEqual([COVER_LETTER_PATH, MATCHER_PATH].sort());
    expect(MATCHER_PATH).toBe("/apps/resume-matcher");
    expect(COVER_LETTER_PATH).toBe("/apps/cover-letter-writer");
  });

  it("finds an entry for a listed page and nothing for anything else", () => {
    expect(feedbackPage(MATCHER_PATH)).toBeDefined();
    expect(feedbackPage(COVER_LETTER_PATH)).toBeDefined();
    for (const path of ["/", "/apps", "/apps/other", "/apps/cover-letter-writer/", "/constructor", "/__proto__", "/toString"]) {
      expect(feedbackPage(path), path).toBeUndefined();
    }
  });

  it("each page checks its debug block with its own schema", () => {
    expect(checkDebug(MATCHER_PATH, matcherDebug).ok).toBe(true);
    expect(checkDebug(COVER_LETTER_PATH, letterDebug).ok).toBe(true);
    expect(checkDebug(MATCHER_PATH, letterDebug).ok).toBe(false);
    expect(checkDebug(COVER_LETTER_PATH, matcherDebug).ok).toBe(false);
  });
});

describe("cover letter debug block (strict schema)", () => {
  it("accepts the safe summary and keeps exactly those fields", () => {
    const checked = send(letterDebug);
    expect(checked.ok).toBe(true);
    if (checked.ok !== true) return;
    expect(checked.feedback.letterDebug).toEqual(letterDebug);
    expect(checked.feedback.debug).toBeUndefined();
  });

  it("accepts empty notes and each highlightHandling value", () => {
    for (const highlightHandling of ["not-provided", "used", "gap"]) {
      expect(send({ ...letterDebug, highlightHandling, notes: [] }).ok).toBe(true);
    }
  });

  it("rejects an extra field", () => {
    expect(send({ ...letterDebug, extra: 1 }).ok).toBe(false);
    expect(send({ ...letterDebug, placeholders: 2 }).ok).toBe(false);
  });

  it.each(FORBIDDEN)("rejects the field name %s inside the debug block", (name) => {
    expect(send({ ...letterDebug, [name]: "anything" }).ok).toBe(false);
    expect(send({ ...letterDebug, [name]: ["a"] }).ok).toBe(false);
    expect(send({ ...letterDebug, [name]: { nested: true } }).ok).toBe(false);
  });

  it.each(FORBIDDEN)("rejects the field name %s at the top of the request", (name) => {
    expect(sendPlain({ [name]: "anything" }).ok).toBe(false);
  });

  it.each(FORBIDDEN)("rejects the field name %s inside the context", (name) => {
    expect(sendPlain({ context: { ...base.context, [name]: "anything" } }).ok).toBe(false);
  });

  it("rejects them even with the other fields missing or the page being a different one", () => {
    expect(send({ letter: "Dear Hiring Manager" }).ok).toBe(false);
    expect(send({ ...letterDebug, letter: "x" }, { context: { ...base.context, path: "/" } }).ok).toBe(false);
  });

  it("rejects values that are not settings or counts", () => {
    const bad = [
      { tone: "angry" },
      { length: "long" },
      { wordCount: "231" },
      { wordCount: -1 },
      { wordCount: 1.5 },
      { blanks: 101 },
      { companyFilled: "yes" },
      { roleFilled: 1 },
      { highlightHandling: "Led a team of 4" },
      { notes: "length" },
      { notes: ["length", "My resume says I led a team"] }, // free text is not a note name
      { notes: ["numbers"] }, // must-pass checks never become notes
      { notes: [{ text: "x" }] },
    ];
    for (const change of bad) expect(send({ ...letterDebug, ...change }).ok, JSON.stringify(change)).toBe(false);
    expect(send(null).ok).toBe(false);
    expect(send("letter").ok).toBe(false);
    expect(send([letterDebug]).ok).toBe(false);
  });

  it("rejects a debug block with a missing field", () => {
    for (const key of Object.keys(letterDebug)) {
      const rest: Record<string, unknown> = { ...letterDebug };
      delete rest[key];
      expect(send(rest).ok, key).toBe(false);
    }
  });

  it("is dropped (not an error) unless it is a 'Wrong result' report", () => {
    for (const type of ["bug", "idea", "other"]) {
      const checked = send(letterDebug, { type });
      expect(checked.ok).toBe(true);
      if (checked.ok === true) expect(checked.feedback.letterDebug).toBeUndefined();
    }
  });

  it("a cover letter block sent from the Resume Matcher page is rejected, and the other way round", () => {
    expect(send(letterDebug, { context: { ...base.context, path: MATCHER_PATH } }).ok).toBe(false);
    expect(send(matcherDebug).ok).toBe(false);
  });

  it("is dropped when it comes from a page that is not in the table", () => {
    const checked = send(letterDebug, { context: { ...base.context, path: "/" } });
    expect(checked.ok).toBe(true);
    if (checked.ok === true) {
      expect(checked.feedback.letterDebug).toBeUndefined();
      expect(checked.feedback.debug).toBeUndefined();
    }
  });
});

describe("the Resume Matcher's entry is unchanged", () => {
  const onMatcher = { context: { ...base.context, path: MATCHER_PATH } };

  it("keeps the same four fields and puts them in `debug`", () => {
    const checked = send(matcherDebug, onMatcher);
    expect(checked.ok).toBe(true);
    if (checked.ok !== true) return;
    expect(checked.feedback.debug).toEqual(matcherDebug);
    expect(checked.feedback.letterDebug).toBeUndefined();
  });

  it("is still strict about extra fields and the resume and job names", () => {
    for (const name of ["resume", "jobDescription", "letter", "extra"]) {
      expect(send({ ...matcherDebug, [name]: "x" }, onMatcher).ok, name).toBe(false);
    }
  });

  it("still checks the score range and the number of keywords", () => {
    expect(send({ ...matcherDebug, score: 101 }, onMatcher).ok).toBe(false);
    expect(send({ ...matcherDebug, matchedKeywords: Array(26).fill("a") }, onMatcher).ok).toBe(false);
  });

  it("is still dropped for other report types and for other pages", () => {
    const bug = send(matcherDebug, { ...onMatcher, type: "bug" });
    expect(bug.ok === true && bug.feedback.debug).toBeUndefined();
    const home = send(matcherDebug, { context: { ...base.context, path: "/" } });
    expect(home.ok === true && home.feedback.debug).toBeUndefined();
  });

  it("an attached block that fits no page's schema is still refused", () => {
    expect(send({ resume: "x" }, { context: { ...base.context, path: "/" } }).ok).toBe(false);
  });
});
