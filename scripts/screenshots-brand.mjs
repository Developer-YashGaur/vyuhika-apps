// Screenshots of every place the logo appears. Run the dev server first, then: npm run screenshots:brand
// The AI call is held back inside the browser, so the loading screen can be captured without using any quota.

import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const BASE = "http://localhost:3000";
const OUT = "screenshots";

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();

for (const width of [390, 1440]) {
  const page = await browser.newPage({ viewport: { width, height: 900 } });

  // Navbar (plus the hover glow on desktop) and the hero badge.
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${OUT}/brand-${width}-navbar.png`, clip: { x: 0, y: 0, width, height: 72 } });
  await page.screenshot({ path: `${OUT}/brand-${width}-hero.png` });
  if (width > 600) {
    await page.getByRole("link", { name: "Vyuhika Apps home" }).hover();
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${OUT}/brand-${width}-navbar-hover.png`, clip: { x: 0, y: 0, width: 420, height: 72 } });
  }

  // Footer.
  const footer = page.locator("footer");
  await footer.scrollIntoViewIfNeeded();
  await page.waitForTimeout(600);
  await footer.screenshot({ path: `${OUT}/brand-${width}-footer.png` });

  // Resume Matcher loading screen (the analysis request is held so it stays on screen).
  await page.route("**/api/analyze", () => {}); // never answers during the screenshot
  await page.goto(`${BASE}/apps/resume-matcher`, { waitUntil: "networkidle" });
  for (const b of await page.getByRole("button", { name: "Load sample" }).all()) await b.click();
  await page.getByRole("button", { name: "Analyze match" }).click();
  await page.getByRole("status").first().waitFor();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${OUT}/brand-${width}-loading.png` });

  // 404 page.
  await page.goto(`${BASE}/this-page-does-not-exist`, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT}/brand-${width}-404.png` });

  await page.close();
}

// The share images, as a browser shows them (at their real size).
const og = await browser.newPage({ viewport: { width: 1200, height: 630 } });
for (const name of ["vyuhika", "resume-matcher"]) {
  await og.goto(`${BASE}/og/${name}.png`);
  await og.screenshot({ path: `${OUT}/brand-og-${name}.png` });
}

await browser.close();
console.log("Saved brand screenshots to", OUT);
