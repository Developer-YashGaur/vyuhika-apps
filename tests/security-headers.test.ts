import { describe, expect, it } from "vitest";
import nextConfig, { securityHeaders } from "@/next.config";

describe("security headers", () => {
  it("are sent for every page", async () => {
    const rules = await nextConfig.headers!();
    expect(rules.length).toBe(1);
    expect(rules[0].source).toBe("/:path*");
    expect(rules[0].headers).toEqual(securityHeaders);
  });

  it("include the basic protections", () => {
    const byKey = Object.fromEntries(securityHeaders.map((h) => [h.key, h.value]));
    expect(byKey["Strict-Transport-Security"].startsWith("max-age=")).toBe(true);
    expect(byKey["X-Content-Type-Options"]).toBe("nosniff");
    expect(byKey["X-Frame-Options"]).toBe("DENY");
    expect(byKey["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
    expect(byKey["Permissions-Policy"].includes("camera=()")).toBe(true);
  });
});
