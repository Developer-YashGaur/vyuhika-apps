// Screenshots of the text under each app's tool (what it does, how it works, FAQ...), the "More tools" row and the footer.
// Run the production server (npm run build, then npm start) or the dev server first, then:
//   npm run screenshots:guide
// Set URL if the server is not on port 3000.

import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const BASE = process.env.URL ?? "http://localhost:3000";
const OUT = "screenshots";

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();

for (const slug of ["resume-matcher", "cover-letter-writer"]) {
  for (const width of [390, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    await page.goto(`${BASE}/apps/${slug}`, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(800);
    // The new content: from "What it does" down to the end of the page.
    const top = await page.locator("#what-it-does").evaluate((el) => el.getBoundingClientRect().top + window.scrollY);
    const height = await page.evaluate(() => document.documentElement.scrollHeight);
    await page.screenshot({ path: `${OUT}/guide-${slug}-${width}.png`, fullPage: true, clip: { x: 0, y: top - 40, width, height: height - top + 40 } });
    await page.close();
  }
}

await browser.close();
console.log("Saved guide screenshots to", OUT);
