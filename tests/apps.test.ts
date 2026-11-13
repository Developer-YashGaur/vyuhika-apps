import { describe, expect, it } from "vitest";
import { appHref, apps } from "@/lib/apps";

describe("apps list", () => {
  it("has a unique slug for every app", () => {
    const slugs = apps.map((app) => app.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("uses URL-safe slugs", () => {
    for (const app of apps) {
      expect(app.slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    }
  });

  it("includes Resume Matcher as a free, live app", () => {
    const matcher = apps.find((app) => app.slug === "resume-matcher");
    expect(matcher).toMatchObject({ tier: "Free", status: "live" });
    expect(appHref(matcher!)).toBe("/apps/resume-matcher");
  });
});
