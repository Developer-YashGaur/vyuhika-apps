import { afterEach, describe, expect, it, vi } from "vitest";
import { siteVerification } from "@/lib/metadata";

// Optional Google Search Console verification: only when GOOGLE_SITE_VERIFICATION is set.

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("siteVerification", () => {
  it("is empty when the variable is not set, empty or blank", () => {
    for (const value of [undefined, "", "   ", "\n"]) expect(siteVerification(value)).toBeUndefined();
  });

  it("puts the code in verification.google, trimmed", () => {
    expect(siteVerification("abc123_XYZ-code")).toEqual({ google: "abc123_XYZ-code" });
    expect(siteVerification("  abc123  ")).toEqual({ google: "abc123" });
  });
});

describe("the site's metadata", () => {
  it("has no verification when GOOGLE_SITE_VERIFICATION is not set", async () => {
    vi.stubEnv("GOOGLE_SITE_VERIFICATION", "");
    vi.resetModules();
    const { siteMetadata } = await import("@/lib/metadata");
    expect(siteMetadata.verification).toBeUndefined();
  });

  it("adds verification.google when GOOGLE_SITE_VERIFICATION is set", async () => {
    vi.stubEnv("GOOGLE_SITE_VERIFICATION", "my-search-console-code");
    vi.resetModules();
    const { siteMetadata } = await import("@/lib/metadata");
    expect(siteMetadata.verification).toEqual({ google: "my-search-console-code" });
  });

  it("the variable is documented in the README by name only", async () => {
    const { readFileSync } = await import("node:fs");
    const readme = readFileSync("README.md", "utf8");
    expect(readme).toContain("`GOOGLE_SITE_VERIFICATION`");
    expect(readme).toContain("## Privacy and analytics");
  });
});
