import { describe, expect, it } from "vitest";
import { parseConsent } from "@/lib/cookie-consent";

describe("cookie consent", () => {
  it("accepts only yes or no", () => {
    expect(parseConsent("yes")).toBe("yes");
    expect(parseConsent("no")).toBe("no");
  });

  it("treats anything else as not asked yet, so tracking stays off", () => {
    for (const value of [null, undefined, "", "true", "YES", "1"]) expect(parseConsent(value)).toBeNull();
  });
});
