import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import BuiltBy from "@/components/BuiltBy";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import { buildConfirmationEmail } from "@/lib/feedback/emails";
import { sampleFeedback } from "@/lib/feedback/email-samples";
import { site } from "@/lib/site";

// Every outside link (portfolio, LinkedIn, YouTube) must come from lib/site.ts
// and open safely in a new tab.

// All <a> tags in some HTML, as { href, target, rel, text }.
function links(html: string) {
  return [...html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)].map(([, attrs, inner]) => ({
    href: attrs.match(/href="([^"]*)"/)?.[1],
    target: attrs.match(/target="([^"]*)"/)?.[1],
    rel: attrs.match(/rel="([^"]*)"/)?.[1],
    text: inner.replace(/<[^>]+>/g, "").trim(),
  }));
}

const outside = [site.owner.portfolio, site.links.linkedin, site.links.youtube];

function expectSafeExternal(html: string) {
  for (const link of links(html).filter((l) => l.href?.startsWith("http"))) {
    expect(outside).toContain(link.href);
    expect(link.target).toBe("_blank");
    expect(link.rel).toBe("noopener noreferrer");
    expect(link.text).toContain("(opens in a new tab)");
  }
}

describe("lib/site.ts", () => {
  it("holds the owner's name and portfolio", () => {
    expect(site.owner.name).toBe("Yash Gaur");
    expect(site.owner.portfolio).toBe("https://yash-gaur.vyuhika.com/");
    for (const url of outside) expect(url).toMatch(/^https:\/\//);
  });
});

describe("links come from lib/site.ts", () => {
  it("footer: 'Made by Yash Gaur' links to the portfolio", () => {
    const html = renderToStaticMarkup(<Footer />);
    const made = links(html).find((l) => l.text.startsWith(site.owner.name));
    expect(made?.href).toBe(site.owner.portfolio);
    expect(links(html).map((l) => l.href)).toEqual([site.owner.portfolio, site.links.linkedin, site.links.youtube]);
    expectSafeExternal(html);
  });

  it("navbar: has an About link to the portfolio", () => {
    const html = renderToStaticMarkup(<Navbar onHome />);
    const about = links(html).find((l) => l.text.startsWith("About"));
    expect(about?.href).toBe(site.owner.portfolio);
    expectSafeExternal(html);
  });

  it("Built by section: portfolio button plus LinkedIn and YouTube", () => {
    const html = renderToStaticMarkup(<BuiltBy />);
    expect(html).toContain("Built by Yash");
    const hrefs = links(html).map((l) => l.href);
    expect(hrefs).toEqual([site.owner.portfolio, site.links.linkedin, site.links.youtube]);
    expect(links(html)[0].text).toContain("Visit my portfolio");
    expectSafeExternal(html);
  });

  it("confirmation email: 'Built by Yash Gaur' with the portfolio link, in HTML and plain text", async () => {
    const email = await buildConfirmationEmail(sampleFeedback.bug, "https://apps.vyuhika.com");
    expect(email.html).toContain(`href="${site.owner.portfolio}"`);
    expect(email.html).toMatch(/Built by[\s\S]*Yash Gaur/);
    expect(email.text).toContain(`Built by Yash Gaur: ${site.owner.portfolio}`);
  });

  it("no other source file writes these URLs out (lib/site.ts is the single source)", async () => {
    const files: string[] = [];
    async function walk(dir: string) {
      for (const entry of await readdir(dir, { withFileTypes: true })) {
        const path = join(dir, entry.name);
        if (entry.isDirectory()) await walk(path);
        else if (/\.(ts|tsx)$/.test(entry.name)) files.push(path);
      }
    }
    for (const dir of ["app", "components", "lib"]) await walk(dir);

    const offenders: string[] = [];
    for (const file of files) {
      if (file === join("lib", "site.ts")) continue;
      const source = await readFile(file, "utf8");
      if (/yash-gaur\.vyuhika\.com|linkedin\.com\/in|youtube\.com\/@/.test(source)) offenders.push(file);
    }
    expect(offenders).toEqual([]);
  });
});
