import { existsSync, readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import CoverLetterWriterPage from "@/app/apps/cover-letter-writer/page";
import ResumeMatcherPage from "@/app/apps/resume-matcher/page";
import Home from "@/app/page";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";
import MoreTools from "@/components/MoreTools";
import Footer from "@/components/Footer";
import { HOME_UPDATED, appContent } from "@/lib/app-content";
import { apps } from "@/lib/apps";
import { coverLetterWriterMetadata, homeMetadata, resumeMatcherMetadata } from "@/lib/metadata";
import { site } from "@/lib/site";
import { PRICE_CURRENCY } from "@/lib/structured-data";

// Search visibility: the text under each tool, the structured data (JSON-LD), the titles and descriptions,
// canonical addresses and the sitemap. Pages are rendered here; the last block also checks the real production
// build's HTML (it runs after `npm run build`).

const pages = {
  home: { path: "", html: () => renderToStaticMarkup(<Home />), metadata: homeMetadata },
  "resume-matcher": { path: "/apps/resume-matcher", html: () => renderToStaticMarkup(<ResumeMatcherPage />), metadata: resumeMatcherMetadata },
  "cover-letter-writer": { path: "/apps/cover-letter-writer", html: () => renderToStaticMarkup(<CoverLetterWriterPage />), metadata: coverLetterWriterMetadata },
};
const appSlugs = ["resume-matcher", "cover-letter-writer"] as const;

const decode = (text: string) =>
  text.replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
const stripTags = (html: string) => decode(html.replace(/<[^>]+>/g, "").trim());

// Every <script type="application/ld+json"> in some HTML, parsed. JSON.parse throws if one is not valid JSON.
type Data = Record<string, unknown> & { "@type": string; offers?: unknown; itemListElement?: { position: number; item: string }[]; mainEntity?: { name: string; acceptedAnswer: { text: string } }[] };
function jsonLd(html: string): Data[] {
  return [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(([, json]) => JSON.parse(json));
}

// Every "@type" in a value, however deep.
function typesIn(value: unknown, found = new Set<string>()): Set<string> {
  if (Array.isArray(value)) value.forEach((v) => typesIn(v, found));
  else if (value && typeof value === "object") {
    for (const [key, v] of Object.entries(value)) {
      if (key === "@type") found.add(String(v));
      else typesIn(v, found);
    }
  }
  return found;
}

// Every key name in a value, however deep.
function keysIn(value: unknown, found: string[] = []): string[] {
  if (Array.isArray(value)) value.forEach((v) => keysIn(v, found));
  else if (value && typeof value === "object") {
    for (const [key, v] of Object.entries(value)) {
      found.push(key);
      keysIn(v, found);
    }
  }
  return found;
}

// The question and answer pairs shown in the page's FAQ section.
function visibleFaq(html: string) {
  const section = html.match(/<section aria-labelledby="faq">([\s\S]*?)<\/section>/)![1];
  return [...section.matchAll(/<h3[^>]*>([\s\S]*?)<\/h3><p[^>]*>([\s\S]*?)<\/p>/g)].map(([, q, a]) => ({ question: stripTags(q), answer: stripTags(a) }));
}

describe("structured data (JSON-LD)", () => {
  it("home: valid JSON with exactly WebSite and Organization, named Vyuhika Apps, with the logo from the brand files", () => {
    const data = jsonLd(pages.home.html());
    expect(data.map((d) => d["@type"]).sort()).toEqual(["Organization", "WebSite"]);
    const org = data.find((d) => d["@type"] === "Organization")!;
    expect(org).toMatchObject({ name: "Vyuhika Apps", url: site.url, logo: `${site.url}/brand/kit/icon-512.png` });
    expect(data.find((d) => d["@type"] === "WebSite")).toMatchObject({ name: "Vyuhika Apps", url: site.url });
  });

  it.each(appSlugs)("%s: valid JSON with exactly SoftwareApplication, FAQPage and BreadcrumbList", (slug) => {
    const data = jsonLd(pages[slug].html());
    expect(data.map((d) => d["@type"]).sort()).toEqual(["BreadcrumbList", "FAQPage", "SoftwareApplication"]);
    // Nothing else hides inside them either.
    expect([...typesIn(data)].sort()).toEqual(["Answer", "BreadcrumbList", "FAQPage", "ListItem", "Offer", "Question", "SoftwareApplication"]);
  });

  it.each(appSlugs)("%s: a free web app, with the price 0 in %s", (slug) => {
    const app = jsonLd(pages[slug].html()).find((d) => d["@type"] === "SoftwareApplication")!;
    expect(app).toMatchObject({ operatingSystem: "Web", applicationCategory: expect.any(String), url: `${site.url}/apps/${slug}` });
    expect(app.offers).toEqual({ "@type": "Offer", price: "0", priceCurrency: PRICE_CURRENCY });
    expect(PRICE_CURRENCY).toBe("INR");
  });

  it.each(appSlugs)("%s: breadcrumbs go home, then the app", (slug) => {
    const crumbs = jsonLd(pages[slug].html()).find((d) => d["@type"] === "BreadcrumbList")!;
    expect(crumbs.itemListElement!.map((i) => [i.position, i.item])).toEqual([[1, site.url], [2, `${site.url}/apps/${slug}`]]);
  });

  it.each(appSlugs)("%s: the FAQ in the JSON-LD equals the visible FAQ, word for word", (slug) => {
    const html = pages[slug].html();
    const faq = jsonLd(html).find((d) => d["@type"] === "FAQPage")!;
    const fromJson = faq.mainEntity!.map((q) => ({ question: q.name, answer: q.acceptedAnswer.text }));
    expect(fromJson).toHaveLength(5);
    expect(visibleFaq(html)).toEqual(fromJson);
  });

  it("has no ratings, reviews or counts of any kind, in the data or in the page text", () => {
    for (const [name, page] of Object.entries(pages)) {
      const html = page.html();
      const keys = keysIn(jsonLd(html));
      expect(keys.filter((k) => /^(rating|review|aggregate|bestRating|worstRating|interactionStatistic|testimonial)|count$|votes?$/i.test(k)), name).toEqual([]);
      const raw = JSON.stringify(jsonLd(html));
      for (const word of ["AggregateRating", "Review", "ratingValue", "reviewCount", "ratingCount", "bestRating"]) expect(raw, `${name} ${word}`).not.toContain(word);
    }
  });

  it("escapes < so text can never close the script tag early", () => {
    for (const page of Object.values(pages)) {
      for (const [, json] of page.html().matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) expect(json).not.toContain("<");
    }
  });
});

describe("the text under each tool is in the server HTML", () => {
  it.each(appSlugs)("%s: has every section and all the words, as plain HTML", (slug) => {
    const html = pages[slug].html();
    const content = appContent[slug];
    for (const heading of ["What it does not do", "How it works", "Who it is for", "Frequently asked questions", "More tools"]) expect(html).toContain(heading);
    expect(html).toMatch(/What [A-Za-z ]+ does</);
    const text = stripTags(html.replace(/<[^>]+>/g, "\n"));
    const plain = decode(html.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ");
    for (const sentence of [content.whatItDoes, content.whoFor, content.doesNot, ...content.steps.flatMap((s) => [s.title, s.text])]) {
      expect(plain, sentence.slice(0, 40)).toContain(sentence);
    }
    expect(text.length).toBeGreaterThan(0);
    expect(content.steps).toHaveLength(3);
    expect(content.faq).toHaveLength(5);
  });

  it.each(appSlugs)("%s: sits after the tool in the page, and nothing in it is hidden until JavaScript runs", (slug) => {
    const html = pages[slug].html();
    expect(html.indexOf('id="what-it-does"')).toBeGreaterThan(html.indexOf("Analyze match") > -1 ? html.indexOf("Analyze match") : html.indexOf("Write my cover letter"));
    const guide = html.slice(html.indexOf('id="what-it-does"'), html.indexOf("</main>"));
    expect(guide).not.toMatch(/opacity:\s*0|<details|[ "]hidden[ ">]|style=/);
  });

  it("says nothing the code does not do: the numbers match the limits in the code", () => {
    const route = (file: string) => readFileSync(file, "utf8");
    const limits = (file: string) => {
      const src = route(file);
      return { day: Number(src.match(/name: "day", max: (\d+)/)![1]), minute: Number(src.match(/name: "minute", max: (\d+)/)![1]) };
    };
    const matcher = limits("app/api/analyze/route.ts");
    const letter = limits("app/api/cover-letter/route.ts");
    const matcherFaq = JSON.stringify(appContent["resume-matcher"].faq);
    const letterFaq = JSON.stringify(appContent["cover-letter-writer"].faq);
    expect(matcherFaq).toContain(`${matcher.minute} matches a minute and up to ${matcher.day} matches a day`);
    expect(letterFaq).toContain(`${letter.minute} letters a minute and up to ${letter.day} letters a day`);
    expect(route("lib/resume-file/rules.ts")).toContain("MAX_FILE_BYTES = 5 * 1024 * 1024");
    expect(route("lib/text-rules.ts")).toContain("MIN_CHARS = 200");
    expect(route("lib/text-rules.ts")).toContain("MAX_CHARS = 15000");
    for (const slug of appSlugs) {
      const text = JSON.stringify(appContent[slug]);
      expect(text).toContain("5 MB");
      expect(text).toContain("15,000");
      expect(text).toContain("200 characters");
      expect(text.match(/guarantee/g)?.length).toBe(1); // the only mention is the negative one
      expect(text).toMatch(/does not guarantee/);
      expect(text).toMatch(/human must check every/);
      expect(text).not.toMatch(/\d+\s?(users|people|visitors|customers)|testimonial|rated|stars|best|#1|top-rated/i);
    }
  });
});

describe("titles, descriptions and canonical addresses", () => {
  const entries = Object.entries(pages).map(([name, page]) => ({
    name,
    title: (page.metadata.title as { absolute: string }).absolute,
    description: page.metadata.description as string,
    canonical: page.metadata.alternates?.canonical as string,
    path: page.path,
  }));

  it.each(entries)("$name: title is about 60 characters or less and the description about 160 or less", ({ title, description }) => {
    expect(title.length).toBeGreaterThan(20);
    expect(title.length).toBeLessThanOrEqual(60);
    expect(description.length).toBeGreaterThanOrEqual(70);
    expect(description.length).toBeLessThanOrEqual(160);
  });

  it("every title and every description is different", () => {
    expect(new Set(entries.map((e) => e.title)).size).toBe(entries.length);
    expect(new Set(entries.map((e) => e.description)).size).toBe(entries.length);
  });

  it.each(entries)("$name: canonical is the site URL plus the page's own path", ({ canonical, path }) => {
    expect(canonical).toBe(`${site.url}${path}`);
  });

  it("share cards use the same title and description as the page", () => {
    for (const page of Object.values(pages)) {
      const title = (page.metadata.title as { absolute: string }).absolute;
      expect(page.metadata.openGraph).toMatchObject({ title, description: page.metadata.description });
      expect(page.metadata.twitter).toMatchObject({ title, description: page.metadata.description });
    }
  });

  it("describes the pages in words a person would search for", () => {
    expect(resumeMatcherMetadata.title).toEqual({ absolute: expect.stringMatching(/Resume Matcher.*Job Description/) });
    expect(coverLetterWriterMetadata.title).toEqual({ absolute: expect.stringMatching(/Cover Letter Writer.*Resume.*Job Description/) });
  });
});

describe("one h1 per page", () => {
  it.each(Object.keys(pages))("%s has exactly one", (name) => {
    expect(pages[name as keyof typeof pages].html().match(/<h1[\s>]/g)).toHaveLength(1);
  });

  it("the app h1s are the app names", () => {
    expect(pages["resume-matcher"].html()).toMatch(/<h1[^>]*>Resume Matcher<\/h1>/);
    expect(pages["cover-letter-writer"].html()).toMatch(/<h1[^>]*>Cover Letter Writer<\/h1>/);
  });
});

describe("indexing and the sitemap", () => {
  it("no page is noindex; only /api/ and /dev/ are blocked, and neither is in the sitemap", () => {
    for (const page of Object.values(pages)) {
      expect(page.metadata.robots).toBeUndefined();
      expect(JSON.stringify(page.metadata)).not.toMatch(/noindex|"index":false/);
      expect(page.html()).not.toMatch(/<meta name="robots"/);
    }
    const rules = robots().rules as { disallow: string[] };
    expect(rules.disallow).toEqual(["/api/", "/dev/"]);
    expect(sitemap().map((e) => e.url).join(" ")).not.toMatch(/\/api|\/dev/);
  });

  it("lastModified comes from real dates in lib/app-content.ts, not from the current time", () => {
    const entries = sitemap();
    expect(entries.map((e) => e.lastModified)).toEqual([HOME_UPDATED, appContent["resume-matcher"].updated, appContent["cover-letter-writer"].updated]);
    for (const e of entries) {
      expect(String(e.lastModified)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(Date.parse(String(e.lastModified))).toBeLessThanOrEqual(Date.now());
    }
    expect(sitemap()).toEqual(entries); // the same answer every time
  });
});

describe("internal links", () => {
  const hrefs = (html: string) => [...html.matchAll(/<a\b[^>]*href="([^"]*)"/g)].map((m) => m[1]);

  it("the footer lists every live app on this site, and no external app", () => {
    const html = renderToStaticMarkup(<Footer />);
    const nav = html.match(/<nav aria-label="Apps">([\s\S]*?)<\/nav>/)![1];
    expect(hrefs(nav)).toEqual(["/apps/resume-matcher", "/apps/cover-letter-writer"]);
  });

  it("More tools links to the other apps, and Koshvia opens in a new tab with the hint", () => {
    const html = renderToStaticMarkup(<MoreTools currentSlug="resume-matcher" />);
    expect(hrefs(html)).toEqual(["/apps/cover-letter-writer", "https://koshvia.vyuhika.com"]);
    const koshvia = html.match(/<a [^>]*koshvia[^>]*>[\s\S]*?<\/a>/)![0];
    expect(koshvia).toContain('target="_blank"');
    expect(koshvia).toContain('rel="noopener noreferrer"');
    expect(koshvia).toContain("(opens in a new tab)");
    expect(html).not.toContain("Interview Coach"); // coming soon: no page yet
    expect(html).not.toContain('href="/apps/resume-matcher"'); // not a link to itself
    expect(renderToStaticMarkup(<MoreTools currentSlug="cover-letter-writer" />)).toContain('href="/apps/resume-matcher"');
  });

  it("every live app on this site has content, so the footer and the sitemap never point at an empty page", () => {
    for (const app of apps.filter((a) => a.status === "live" && !a.externalUrl)) expect(appContent[app.slug], app.slug).toBeDefined();
  });
});

// The real production HTML, with no JavaScript run. Needs `npm run build` first; it is skipped (and says so) when there is no build.
const built = existsSync(".next/server/app/apps/resume-matcher.html");
describe.skipIf(!built)("the production build's HTML", () => {
  it.each(appSlugs)("%s: the new text, the JSON-LD and the canonical link are in the HTML file", (slug) => {
    const html = readFileSync(`.next/server/app/apps/${slug}.html`, "utf8");
    const content = appContent[slug];
    const plain = decode(html.replace(/<script[\s\S]*?<\/script>/g, "").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ");
    for (const sentence of [content.whatItDoes, content.whoFor, content.doesNot, ...content.faq.flatMap((f) => [f.question, f.answer])]) {
      expect(plain, sentence.slice(0, 40)).toContain(sentence);
    }
    expect(html.match(/<h1[\s>]/g)).toHaveLength(1);
    expect(html).toContain(`<link rel="canonical" href="${site.url}/apps/${slug}"/>`);
    expect(typesIn(jsonLd(html)).has("FAQPage")).toBe(true);
    expect(html).not.toMatch(/noindex/);
  });

  it("home: WebSite and Organization are in the HTML file", () => {
    const html = readFileSync(".next/server/app/index.html", "utf8");
    expect(jsonLd(html).map((d) => d["@type"]).sort()).toEqual(["Organization", "WebSite"]);
    expect(html).toContain(`<link rel="canonical" href="${site.url}"/>`);
  });
});
