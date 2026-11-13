// Screenshots of the navbar, the "Built by" section and the footer. Run the dev server first, then:
//   npm run screenshots:links

import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const BASE = "http://localhost:3000";
const OUT = "screenshots";

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();

for (const width of [390, 1440]) {
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);

  // Navbar, with keyboard focus on the About link to check its focus ring.
  const about = page.getByRole("link", { name: /^About/ });
  await about.focus();
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Tab"); // focus via keyboard, so :focus-visible applies
  await page.screenshot({ path: `${OUT}/links-${width}-navbar.png`, clip: { x: 0, y: 0, width, height: 80 } });

  // "Built by" section (scrolled into view so it reveals), with focus on the portfolio button.
  const section = page.locator("#about");
  await section.scrollIntoViewIfNeeded();
  await page.waitForTimeout(1200);
  await page.getByRole("link", { name: /Visit my portfolio/ }).focus();
  await section.screenshot({ path: `${OUT}/links-${width}-built-by.png` });

  // Footer, with focus on the portfolio link.
  const footer = page.locator("footer");
  await footer.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  await footer.getByRole("link", { name: /Yash Gaur/ }).focus();
  await footer.screenshot({ path: `${OUT}/links-${width}-footer.png` });

  // The bottom of the page as a whole, to see the section and footer together.
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT}/links-${width}-bottom.png` });

  await page.close();
}

await browser.close();
console.log("Saved link screenshots to", OUT);
