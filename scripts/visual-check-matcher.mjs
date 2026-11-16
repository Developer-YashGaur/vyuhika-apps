// Visual check for the Resume Matcher: takes screenshots of every state, then compares two sets pixel by pixel.
// Used to prove a refactor changed nothing on screen. The API is faked inside the browser (no Gemini calls).
//
// Usage (dev server running):
//   node scripts/visual-check-matcher.mjs capture screenshots/visual/before
//   ...make the change...
//   node scripts/visual-check-matcher.mjs capture screenshots/visual/after
//   node scripts/visual-check-matcher.mjs compare screenshots/visual/before screenshots/visual/after
//
// To get the same picture every time, animations are frozen at the same point:
// - the browser runs on a fake clock that only moves when we say so (Framer Motion, timers, the dot canvas);
// - Math.random always gives the same numbers (the dot canvas places its dots randomly);
// - CSS animations (aurora, glowing borders, logo pulse) are paused at their start for each screenshot.

import { mkdir, readdir } from "node:fs/promises";
import { chromium } from "playwright";
import sharp from "sharp";

const BASE = process.env.URL ?? "http://localhost:3000";
const START = new Date("2026-01-01T00:00:00Z");

// A pixel counts as different only if a colour channel moved by more than this (out of 255).
const CHANNEL_TOLERANCE = 16;
// A screenshot passes if at most this share of its pixels are different.
const MAX_DIFF_SHARE = 0.001; // 0.1%

const sizes = [
  { name: "390", viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  { name: "1440", viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
];

const fakeResult = {
  score: 62,
  summary: "Strong React and TypeScript, but missing Next.js, AWS and Docker.",
  matchedKeywords: ["React", "TypeScript", "REST APIs", "SQL", "Git", "Agile"],
  missingKeywords: ["Next.js", "GraphQL", "AWS", "Docker"],
  suggestions: [
    { title: "Add Next.js", detail: "If you have used it, say so." },
    { title: "Name cloud tools", detail: "If you have used AWS or Docker, add them." },
    { title: "Show testing", detail: "Link Jest to the job's testing ask." },
  ],
};

const fakeError = {
  error: { code: "ai-failed", message: "Our AI couldn't analyze this right now. Please try again in a moment." },
};

// Each state: what to do on a freshly loaded page before the screenshot.
const states = {
  empty: async () => {},

  filled: async (page) => {
    await loadSamples(page);
  },

  "upload-error": async (page) => {
    await page.locator('input[type="file"]').setInputFiles({ name: "photo.png", mimeType: "image/png", buffer: Buffer.from("png") });
    await page.locator(".upload-error").waitFor();
    await page.clock.runFor(500);
  },

  // The fake API never answers, so the loading screen stays up.
  loading: async (page) => {
    await page.route("**/api/analyze", () => {});
    await loadSamples(page);
    await page.getByRole("button", { name: "Analyze match" }).click();
    await settle(page, () => page.getByText("This takes a few seconds.").isVisible(), 8000);
  },

  error: async (page) => {
    await analyzeWith(page, { status: 502, json: fakeError }, () =>
      page.getByRole("heading", { name: "We couldn't analyze this" }).isVisible(),
    );
  },

  results: async (page) => {
    await analyzeWith(page, { json: fakeResult }, () =>
      page.evaluate(() => document.querySelector(".gauge-ring")?.closest("div.relative")?.textContent?.startsWith("62%")),
    );
  },
};

async function loadSamples(page) {
  for (const button of await page.getByRole("button", { name: "Load sample" }).all()) await button.click();
  await page.clock.runFor(1000);
}

async function analyzeWith(page, reply, isDone) {
  await page.route("**/api/analyze", (route) => route.fulfill(reply));
  await loadSamples(page);
  const answered = page.waitForResponse("**/api/analyze");
  await page.getByRole("button", { name: "Analyze match" }).click();
  await answered;
  await settle(page, isDone, 15_000);
  await page.evaluate(() => window.scrollTo(0, 0));
  await settle(page, () => page.evaluate(() => window.scrollY === 0), 1000);
}

// Moves the fake clock in small steps, with short real pauses so React can keep up, until `isDone()`.
// Then it moves the clock on to exactly `totalMs`, so every run ends at the same moment
// (the dot canvas and any finished animation then look identical).
async function settle(page, isDone, totalMs) {
  let elapsed = 0;
  while (!(await isDone())) {
    if (elapsed >= totalMs) throw new Error(`Page did not settle within ${totalMs} ms of fake time`);
    await page.waitForTimeout(50);
    await page.clock.runFor(100);
    elapsed += 100;
  }
  await page.waitForTimeout(50);
  await page.clock.runFor(totalMs - elapsed + 100);
}

async function capture(outDir) {
  await mkdir(outDir, { recursive: true });
  const browser = await chromium.launch();

  // Warm-up visit: right after the dev server starts, the first page can be missing the
  // Next.js dev badge (bottom left), which would show up as a false difference.
  const warmUp = await browser.newPage();
  await warmUp.goto(`${BASE}/apps/resume-matcher`, { waitUntil: "networkidle" });
  await warmUp.waitForTimeout(2000);
  await warmUp.close();

  for (const { name, ...options } of sizes) {
    for (const [state, act] of Object.entries(states)) {
      const context = await browser.newContext(options);
      // The same "random" numbers on every run (mulberry32 with a fixed seed).
      await context.addInitScript(() => {
        let seed = 12345;
        Math.random = () => {
          seed = (seed + 0x6d2b79f5) | 0;
          let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
          t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
          return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
      });
      await context.clock.install({ time: START });
      await context.clock.pauseAt(START);

      const page = await context.newPage();
      page.on("pageerror", (err) => console.log(`[${name} ${state}] page error:`, err.message));
      await page.goto(`${BASE}/apps/resume-matcher`, { waitUntil: "networkidle" });
      await page.evaluate(() => document.fonts.ready);
      await page.clock.runFor(2000);

      await act(page);

      await page.screenshot({ path: `${outDir}/${name}-${state}.png`, fullPage: true, animations: "disabled", caret: "hide" });
      console.log(`saved ${outDir}/${name}-${state}.png`);
      await context.close();
    }
  }

  await browser.close();
}

async function compare(beforeDir, afterDir) {
  const diffDir = `${afterDir}-diff`;
  await mkdir(diffDir, { recursive: true });
  let failures = 0;

  for (const file of (await readdir(beforeDir)).filter((f) => f.endsWith(".png")).sort()) {
    const a = await sharp(`${beforeDir}/${file}`).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const b = await sharp(`${afterDir}/${file}`).ensureAlpha().raw().toBuffer({ resolveWithObject: true });

    if (a.info.width !== b.info.width || a.info.height !== b.info.height) {
      console.log(`FAIL ${file}: size changed ${a.info.width}x${a.info.height} → ${b.info.width}x${b.info.height}`);
      failures++;
      continue;
    }

    // Diff image: the "after" screenshot dimmed, with changed pixels in bright red.
    const diff = Buffer.alloc(a.data.length);
    let changed = 0;
    for (let i = 0; i < a.data.length; i += 4) {
      const delta = Math.max(
        Math.abs(a.data[i] - b.data[i]),
        Math.abs(a.data[i + 1] - b.data[i + 1]),
        Math.abs(a.data[i + 2] - b.data[i + 2]),
      );
      const isChanged = delta > CHANNEL_TOLERANCE;
      if (isChanged) changed++;
      diff[i] = isChanged ? 255 : b.data[i] * 0.3;
      diff[i + 1] = isChanged ? 0 : b.data[i + 1] * 0.3;
      diff[i + 2] = isChanged ? 0 : b.data[i + 2] * 0.3;
      diff[i + 3] = 255;
    }

    const share = changed / (a.info.width * a.info.height);
    const pass = share <= MAX_DIFF_SHARE;
    if (!pass) failures++;
    console.log(`${pass ? "PASS" : "FAIL"} ${file}: ${changed} of ${a.info.width * a.info.height} pixels differ (${(share * 100).toFixed(3)}%)`);
    if (changed > 0) {
      await sharp(diff, { raw: { width: a.info.width, height: a.info.height, channels: 4 } }).png().toFile(`${diffDir}/${file}`);
    }
  }

  console.log(failures === 0 ? "All screenshots match." : `${failures} screenshot(s) differ. Diff images are in ${diffDir}/`);
  process.exitCode = failures === 0 ? 0 : 1;
}

const [command, dirA, dirB] = process.argv.slice(2);
if (command === "capture" && dirA) await capture(dirA);
else if (command === "compare" && dirA && dirB) await compare(dirA, dirB);
else console.log("Usage: capture <dir> | compare <beforeDir> <afterDir>");
