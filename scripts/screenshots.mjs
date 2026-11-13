// Takes desktop and mobile screenshots of the home page.
// Usage: start the dev server (npm run dev), then run: npm run screenshots
import { chromium } from "playwright";

const url = process.env.URL ?? "http://localhost:3000";
const sizes = [
  { name: "390", width: 390, height: 844, isMobile: true, hasTouch: true },
  { name: "1440", width: 1440, height: 900 },
  { name: "1920", width: 1920, height: 1080 },
  { name: "2560", width: 2560, height: 1440 },
];

const browser = await chromium.launch({
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
});

for (const { name, ...viewport } of sizes) {
  const { isMobile, hasTouch, ...size } = viewport;
  const page = await browser.newPage({ viewport: size, isMobile, hasTouch, deviceScaleFactor: 2 });
  page.on("console", (msg) => msg.type() === "error" && console.log(`[${name}] console error:`, msg.text()));
  page.on("pageerror", (err) => console.log(`[${name}] page error:`, err.message));

  await page.goto(url, { waitUntil: "networkidle" });
  // On desktop, wait for the lazy-loaded 3D orb (a second <canvas>) to appear.
  if (!isMobile) {
    await page
      .waitForFunction(() => document.querySelectorAll("canvas").length > 1, null, { timeout: 20000 })
      .catch(() => console.log(`[${name}] 3D orb did not load; the CSS fallback is showing`));
  }
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `screenshots/home-${name}-hero.png` });

  // Scroll down step by step so the scroll-reveal animations run.
  const height = await page.evaluate(() => document.body.scrollHeight);
  for (let y = 0; y < height; y += size.height / 2) {
    await page.mouse.wheel(0, size.height / 2);
    await page.waitForTimeout(250);
  }
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `screenshots/home-${name}-scrolled.png` });

  // Hover the big card to check the spotlight, tilt and glow.
  if (!isMobile) {
    const card = page.locator(".bento-card").first();
    const box = await card.boundingBox();
    await page.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.35, { steps: 8 });
    await page.waitForTimeout(800);
    await page.screenshot({ path: `screenshots/home-${name}-card-hover.png` });
  }

  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(800);
  await page.screenshot({ path: `screenshots/home-${name}-full.png`, fullPage: true });
  await page.close();
}

await browser.close();
console.log("Saved screenshots to screenshots/");
