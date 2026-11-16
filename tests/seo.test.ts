import { describe, expect, it } from "vitest";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";
import { site } from "@/lib/site";

// /sitemap.xml and /robots.txt, as Next builds them from these functions.

describe("sitemap", () => {
  const urls = sitemap().map((entry) => entry.url);

  it("lists the home page and the two live apps, using the site URL", () => {
    expect(urls).toEqual([
      "https://apps.vyuhika.com",
      "https://apps.vyuhika.com/apps/resume-matcher",
      "https://apps.vyuhika.com/apps/cover-letter-writer",
    ]);
    expect(site.url).toBe("https://apps.vyuhika.com");
  });

  it("never lists /dev/, /api/ or the coming-soon app", () => {
    for (const url of urls) expect(url).not.toMatch(/\/dev|\/api|interview-coach/);
  });

  it("has no duplicates", () => {
    expect(new Set(urls).size).toBe(urls.length);
  });
});

describe("robots", () => {
  const output = robots();
  const rules = Array.isArray(output.rules) ? output.rules : [output.rules];

  it("allows all crawlers except /api/ and /dev/", () => {
    expect(rules).toHaveLength(1);
    expect(rules[0]).toMatchObject({ userAgent: "*", allow: "/", disallow: ["/api/", "/dev/"] });
  });

  it("points at the sitemap on the site URL, and doesn't mention /dev/ anywhere else", () => {
    expect(output.sitemap).toBe("https://apps.vyuhika.com/sitemap.xml");
    expect(JSON.stringify({ ...output, rules: undefined })).not.toContain("/dev");
  });
});
