// Screenshots of the feedback email templates from the dev preview. Run the dev server first, then:
//   npm run screenshots:emails

import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const BASE = "http://localhost:3000/dev/emails";
const OUT = "screenshots";
const views = [
  { name: "notification", query: "template=notification&sample=wrong-result" },
  { name: "notification-bug", query: "template=notification&sample=bug" },
  { name: "confirmation", query: "template=confirmation&sample=wrong-result" },
];

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
for (const width of [390, 1280]) {
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  for (const view of views) {
    await page.goto(`${BASE}?${view.query}`, { waitUntil: "networkidle" });
    await page.screenshot({ path: `${OUT}/email-${width}-${view.name}.png`, fullPage: true });
  }
  // Images blocked, as many inboxes do by default: alt text and wordmark should still read well.
  await page.route("**/email/header.*", (route) => route.abort());
  await page.goto(`${BASE}?template=confirmation&sample=wrong-result`, { waitUntil: "networkidle" });
  await page.screenshot({ path: `${OUT}/email-${width}-confirmation-no-images.png`, fullPage: true });
  await page.close();
}
await browser.close();
console.log("Saved email screenshots to", OUT);
