import { describe, expect, it } from "vitest";
import { mockAnalyzeMatch } from "@/lib/mock";
import { sampleJobDescription, sampleResume } from "@/lib/samples";
import { isLongEnough } from "@/lib/validation";

describe("mockAnalyzeMatch", () => {
  it("returns a result in the shape the UI expects", async () => {
    const result = await mockAnalyzeMatch("resume", "job", 0);

    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.summary).not.toBe("");
    expect(result.matchedKeywords.length).toBeGreaterThan(0);
    expect(result.missingKeywords.length).toBeGreaterThan(0);
    expect(result.suggestions).toHaveLength(3);
    for (const s of result.suggestions) {
      expect(s.title).not.toBe("");
      expect(s.detail).not.toBe("");
    }
  });
});

describe("sample text", () => {
  it("is long enough to enable the Analyze button", () => {
    expect(isLongEnough(sampleResume)).toBe(true);
    expect(isLongEnough(sampleJobDescription)).toBe(true);
  });
});
