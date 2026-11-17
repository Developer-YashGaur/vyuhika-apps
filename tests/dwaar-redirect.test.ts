import { describe, expect, it } from "vitest";
import { safeNextPath } from "@/lib/auth/redirect";

describe("safeNextPath", () => {
  it("keeps Dwaar pages", () => {
    expect(safeNextPath("/apps/dwaar")).toBe("/apps/dwaar");
    expect(safeNextPath("/apps/dwaar/profile")).toBe("/apps/dwaar/profile");
    expect(safeNextPath("/apps/dwaar?saved=1")).toBe("/apps/dwaar?saved=1");
  });

  it("sends everything else to the Dwaar home", () => {
    for (const bad of [null, undefined, "", "/", "/apps/resume-matcher", "https://evil.example", "//evil.example", "/apps/dwaarX", "/apps/dwaar/../x\\y", "/apps/dwaar/https://evil.example"]) {
      expect(safeNextPath(bad), String(bad)).toBe("/apps/dwaar");
    }
  });
});
