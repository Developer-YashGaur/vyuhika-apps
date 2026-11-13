// Screenshots of the logo preview page (/dev/logo). Run the dev server first, then:
//   npm run screenshots:logo
//
// Saves the full page, each option's section, and the small-size strip enlarged 4× with hard pixel
// edges (nearest neighbour), so you can judge exactly what survives at 16 px.

import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";
import sharp from "sharp";

const URL = "http://localhost:3000/dev/logo";
const OUT = "screenshots";

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();

// 1× pixel density, so a 16 px icon really is 16 pixels.
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
await page.goto(URL, { waitUntil: "networkidle" });
await page.screenshot({ path: `${OUT}/logo-1440-full.png`, fullPage: true });

const strip = page.locator("section").first();
const stripPng = await strip.screenshot();
const { width, height } = await sharp(stripPng).metadata();
await sharp(stripPng).resize(width * 4, height * 4, { kernel: "nearest" }).toFile(`${OUT}/logo-small-sizes-4x.png`);

for (const slug of ["a-v-formation", "b-hex-ring", "c-converging-chevron"]) {
  await page.locator(`section[aria-labelledby="${slug}-heading"]`).screenshot({ path: `${OUT}/logo-${slug}.png` });
}

// Retina (2×) view of the small strip, as most laptops and phones would show it.
const retina = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
await retina.goto(URL, { waitUntil: "networkidle" });
await retina.locator("section").first().screenshot({ path: `${OUT}/logo-small-sizes-2x.png` });

// Phone width, to check the page itself works on mobile.
const phone = await browser.newPage({ viewport: { width: 390, height: 844 } });
await phone.goto(URL, { waitUntil: "networkidle" });
await phone.screenshot({ path: `${OUT}/logo-390.png` });

await browser.close();
console.log("Saved logo screenshots to", OUT);
