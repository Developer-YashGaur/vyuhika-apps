import { describe, expect, it } from "vitest";
import { llmsText } from "@/lib/llms";

describe("llms.txt", () => {
  const text = llmsText();
  it("starts with the site name and lists every live app and the policy pages", () => {
    expect(text.startsWith("# Vyuhika Apps")).toBe(true);
    for (const name of ["Resume Matcher", "Cover Letter Writer", "Dwaar", "Koshvia"]) expect(text).toContain(`[${name}]`);
    expect(text).toContain("https://apps.vyuhika.com/apps/dwaar");
    expect(text).toContain("/privacy");
  });
  it("makes no ratings or user-count claims", () => {
    expect(/\b(rated|stars?|reviews?|users|customers)\b/i.test(text)).toBe(false);
  });
});
