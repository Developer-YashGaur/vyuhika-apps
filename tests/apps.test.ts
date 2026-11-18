import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { appHref, apps, isExternal, pricingLabel, type Category } from "@/lib/apps";
import { site } from "@/lib/site";

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
    expect(matcher).toMatchObject({ pricing: "free", category: "Careers", status: "live" });
    expect(appHref(matcher!)).toBe("/apps/resume-matcher");
  });

  it("includes Cover Letter Writer as a free, live app that links to its page", () => {
    const letter = apps.find((app) => app.slug === "cover-letter-writer");
    expect(letter).toMatchObject({ name: "Cover Letter Writer", pricing: "free", category: "Careers", status: "live", icon: "letter" });
    expect(appHref(letter!)).toBe("/apps/cover-letter-writer");
    expect(letter!.description).toBe(
      "Upload your resume, paste a job, and get a draft that only uses facts from your resume, with blanks where you add your own examples.",
    );
  });

  it("keeps Interview Coach as a coming-soon Pro app", () => {
    expect(apps.find((app) => app.slug === "interview-coach")).toMatchObject({ pricing: "pro", category: "Careers", status: "coming-soon" });
  });

  it("includes Dwaar as a free, live careers app that links to its page", () => {
    const dwaar = apps.find((app) => app.slug === "dwaar");
    expect(dwaar).toMatchObject({ name: "Dwaar", pricing: "free", category: "Careers", status: "live", icon: "door" });
    expect(appHref(dwaar!)).toBe("/apps/dwaar");
  });

  it("lists exactly four live apps and one coming soon", () => {
    expect(apps.filter((app) => app.status === "live").map((app) => app.slug)).toEqual([
      "resume-matcher",
      "cover-letter-writer",
      "dwaar",
      "koshvia",
    ]);
    expect(apps.filter((app) => app.status === "coming-soon")).toHaveLength(1);
  });

  it("every live internal app links to a page that exists", () => {
    for (const app of apps.filter((a) => a.status === "live" && !isExternal(a))) {
      expect(appHref(app)).toBe(`/apps/${app.slug}`);
      expect(existsSync(`app${appHref(app)}/page.tsx`), app.slug).toBe(true);
    }
  });

  it("every external app is live and has an https URL", () => {
    const external = apps.filter(isExternal);
    expect(external.length).toBeGreaterThan(0);
    for (const app of external) {
      expect(app.status, app.slug).toBe("live");
      const url = new URL(app.externalUrl!); // throws if it isn't a URL
      expect(url.protocol, app.slug).toBe("https:");
      expect(appHref(app)).toBe(app.externalUrl);
    }
  });

  it("internal apps have no external URL", () => {
    for (const app of apps.filter((a) => !isExternal(a))) expect(app.externalUrl).toBeUndefined();
  });

  it("external links never point at this site (apps.vyuhika.com)", () => {
    const ours = new URL(site.url).host;
    for (const app of apps.filter(isExternal)) {
      const url = new URL(app.externalUrl!);
      expect(url.host, app.slug).not.toBe(ours);
      expect(app.externalUrl, app.slug).not.toContain(ours);
    }
  });

  it("gives every app a known category and pricing", () => {
    const categories: Category[] = ["Careers", "Finance", "Daily life", "Developer tools", "Business"];
    for (const app of apps) {
      expect(categories, app.slug).toContain(app.category);
      expect(["free", "pro", "freemium"], app.slug).toContain(app.pricing);
    }
  });

  it("includes Koshvia exactly as given: external, Finance, live, free with a paid tier", () => {
    const koshvia = apps.find((app) => app.slug === "koshvia");
    expect(koshvia).toEqual({
      slug: "koshvia",
      name: "Koshvia",
      description:
        "Track your personal and business budgets and investments in one place. Free to start, with a paid tier for more.",
      category: "Finance",
      pricing: "freemium",
      icon: "wallet",
      status: "live",
      externalUrl: "https://koshvia.vyuhika.com",
    });
    expect(appHref(koshvia!)).toBe("https://koshvia.vyuhika.com");
  });

  it("labels the prices", () => {
    expect(pricingLabel("free")).toBe("Free");
    expect(pricingLabel("pro")).toBe("Pro");
    expect(pricingLabel("freemium")).toBe("Free + Pro");
  });
});
