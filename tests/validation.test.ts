import { describe, expect, it } from "vitest";
import { MAX_CHARS, MIN_CHARS, canAnalyze, cleanText, countChars, isLongEnough, isTooLong, scoreLabel } from "@/lib/validation";

const enough = "a".repeat(MIN_CHARS);
const tooShort = "a".repeat(MIN_CHARS - 1);

describe("cleanText and countChars", () => {
  it("removes whitespace at the start and end", () => {
    expect(cleanText("  \n hello world \t\n")).toBe("hello world");
  });

  it("does not count outer whitespace", () => {
    expect(countChars("   abc   ")).toBe(3);
    expect(countChars("\n\n\n")).toBe(0);
  });
});

describe("isLongEnough", () => {
  it("accepts text with exactly the minimum length", () => {
    expect(isLongEnough(enough)).toBe(true);
  });

  it("rejects text one character short", () => {
    expect(isLongEnough(tooShort)).toBe(false);
  });

  it("rejects short text padded with spaces", () => {
    expect(isLongEnough(`   ${tooShort}      `)).toBe(false);
  });
});

describe("canAnalyze", () => {
  it("needs both fields to be long enough", () => {
    expect(canAnalyze(enough, enough)).toBe(true);
    expect(canAnalyze(enough, tooShort)).toBe(false);
    expect(canAnalyze(tooShort, enough)).toBe(false);
    expect(canAnalyze("", "")).toBe(false);
  });

  it("rejects text over the maximum length", () => {
    expect(isTooLong("a".repeat(MAX_CHARS))).toBe(false);
    expect(isTooLong("a".repeat(MAX_CHARS + 1))).toBe(true);
    expect(canAnalyze(enough, "a".repeat(MAX_CHARS + 1))).toBe(false);
  });
});

describe("scoreLabel", () => {
  it("labels scores by range", () => {
    expect(scoreLabel(90)).toBe("Strong match");
    expect(scoreLabel(75)).toBe("Strong match");
    expect(scoreLabel(74)).toBe("Fair match");
    expect(scoreLabel(50)).toBe("Fair match");
    expect(scoreLabel(49)).toBe("Weak match");
  });
});
