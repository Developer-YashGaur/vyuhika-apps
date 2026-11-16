import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import AppCard from "@/components/AppCard";
import AppGrid from "@/components/AppGrid";
import { apps } from "@/lib/apps";
import { siteMetadata } from "@/lib/metadata";
import { site } from "@/lib/site";
import manifest from "@/app/manifest";

// The marketplace cards: external links, badges, category labels, the grid and the marketplace's own wording.

const app = (slug: string) => apps.find((a) => a.slug === slug)!;
const card = (slug: string) => renderToStaticMarkup(<AppCard app={app(slug)} />);

describe("an external app's card (Koshvia)", () => {
  const html = card("koshvia");

  it("is a plain link that opens the other site in a new tab, safely", () => {
    const anchor = html.match(/<a [^>]*>/)![0];
    expect(anchor).toContain('href="https://koshvia.vyuhika.com"');
    expect(anchor).toContain('target="_blank"');
    expect(anchor).toContain('rel="noopener noreferrer"');
    expect(anchor).toContain("bento-inner"); // the whole card is the link, so Tab reaches it and Enter opens it
  });

  it("shows the shared arrow hint, hidden from screen readers, and says it opens in a new tab", () => {
    expect(html).toContain('class="external-hint"');
    expect(html).toMatch(/<svg[^>]*aria-hidden="true"[^>]*class="external-hint"/);
    expect(html).toContain("(opens in a new tab)");
    expect(html).toContain("Open Koshvia");
  });

  it("shows the category, the Free + Pro badge and the wallet icon", () => {
    expect(html).toContain("Finance");
    expect(html).toContain("badge-freemium");
    expect(html).toContain("Free</span> + <span");
    expect(html).toContain("Pro</span>");
    expect(html).toContain('d="M17.2 14h.01"'); // the wallet's clasp
  });
});

describe("an internal app's card", () => {
  it("opens in the same tab: no target, no arrow hint", () => {
    const html = card("resume-matcher");
    expect(html).toContain('href="/apps/resume-matcher"');
    expect(html).not.toContain("target=");
    expect(html).not.toContain("external-hint");
    expect(html).not.toContain("opens in a new tab");
  });

  it("shows the plain Free badge", () => {
    const html = card("cover-letter-writer");
    expect(html).toContain('<span class="badge">Free</span>');
    expect(html).not.toContain("badge-freemium");
  });

  it("a coming-soon card is not a link", () => {
    const html = card("interview-coach");
    expect(html).not.toContain("<a ");
    expect(html).toContain("Coming soon");
    expect(html).toContain('<span class="badge">Pro</span>');
    expect(html).toContain("card-pro");
  });
});

describe("every card", () => {
  it.each(apps.map((a) => a.slug))("%s has its category label", (slug) => {
    expect(card(slug)).toContain(`<p class="card-category">${app(slug).category}</p>`);
  });
});

describe("the grid", () => {
  const html = renderToStaticMarkup(<AppGrid />);
  const cells = [...html.matchAll(/<li class="bento-cell ([^"]*)"/g)].map((m) => m[1]);

  it("has one cell per app, in order", () => {
    expect(cells).toHaveLength(apps.length);
    for (const name of apps.map((a) => a.name)) expect(html).toContain(name);
  });

  it("gives the first app the big tile and shares the rest evenly on laptops (6 columns: 4+2, then 3+3)", () => {
    expect(cells[0]).toContain("lg:col-span-4");
    expect(cells[1]).toContain("lg:col-span-2");
    expect(cells[2]).toContain("lg:col-span-3");
    expect(cells[3]).toContain("lg:col-span-3");
    expect(html).toContain("lg:grid-cols-6");
  });

  it("on tablets the last odd card spans both columns, and on very wide screens every small card takes one of 5 columns", () => {
    expect(cells[0]).toContain("sm:col-span-2");
    expect(cells[3]).toContain("sm:col-span-2"); // 3 small cards in 2 columns: the last one spans both
    expect(cells[1]).not.toContain("sm:col-span-2");
    for (const cell of cells.slice(1)) expect(cell).toContain("min-[137.5rem]:col-span-1");
    expect(cells[0]).toContain("min-[137.5rem]:col-span-2");
    expect(html).toContain("min-[137.5rem]:grid-cols-5");
  });
});

describe("the marketplace's own wording", () => {
  it("says digital tools, not AI tools, in the page description and the manifest", () => {
    expect(String(siteMetadata.description)).toBe(`Useful digital tools, some free and some paid. ${site.tagline}`);
    expect(String(siteMetadata.openGraph?.description)).not.toContain("AI tools");
    expect(manifest().description).toBe(`Useful digital tools, some free and some paid. ${site.tagline}`);
  });

  it("keeps the tagline unchanged", () => {
    expect(site.tagline).toBe("Intelligence, built in public.");
    expect(String(siteMetadata.description)).toContain("Intelligence, built in public.");
  });
});
