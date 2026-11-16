import { existsSync } from "node:fs";
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

  it("includes Cover Letter Writer as a free, live app that links to its page", () => {
    const letter = apps.find((app) => app.slug === "cover-letter-writer");
    expect(letter).toMatchObject({ name: "Cover Letter Writer", tier: "Free", status: "live", icon: "letter" });
    expect(appHref(letter!)).toBe("/apps/cover-letter-writer");
    expect(letter!.description).toBe(
      "Upload your resume, paste a job, and get a draft that only uses facts from your resume, with blanks where you add your own examples.",
    );
  });

  it("keeps Interview Coach as a coming-soon Pro app", () => {
    expect(apps.find((app) => app.slug === "interview-coach")).toMatchObject({ tier: "Pro", status: "coming-soon" });
  });

  it("lists exactly two live apps and one coming soon", () => {
    expect(apps.filter((app) => app.status === "live").map((app) => app.slug)).toEqual(["resume-matcher", "cover-letter-writer"]);
    expect(apps.filter((app) => app.status === "coming-soon")).toHaveLength(1);
  });

  it("every live app links to a page that exists", () => {
    for (const app of apps.filter((a) => a.status === "live")) {
      expect(appHref(app)).toBe(`/apps/${app.slug}`);
      expect(existsSync(`app${appHref(app)}/page.tsx`), app.slug).toBe(true);
    }
  });
});
