// Screenshots of the feedback button and panel. Run the dev server first, then: npm run screenshots:feedback
// The API calls are faked inside the browser, so this uses no Gemini quota and sends no emails.

import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const BASE = "http://localhost:3000";
const OUT = "screenshots";

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

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();

for (const width of [390, 1440]) {
  const page = await browser.newPage({ viewport: { width, height: width < 640 ? 844 : 900 } });
  let feedbackReply = { status: 200, body: { ok: true } };
  let lastFeedback = null;
  await page.route("**/api/analyze", (route) => route.fulfill({ json: fakeResult }));
  await page.route("**/api/feedback", (route) => {
    lastFeedback = route.request().postDataJSON();
    return route.fulfill({ status: feedbackReply.status, json: feedbackReply.body });
  });

  // 1. The button on the home page.
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${OUT}/feedback-${width}-button.png` });

  // 2. The open panel, filled in.
  const fab = page.getByRole("button", { name: "Send feedback" });
  await fab.click();
  const dialog = page.getByRole("dialog");
  await dialog.waitFor();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/feedback-${width}-open.png` });

  // Keyboard checks: focus stays inside, Esc closes and returns focus to the button.
  for (let i = 0; i < 15; i++) await page.keyboard.press("Tab");
  const focusInside = await page.evaluate(() => !!document.activeElement?.closest("dialog"));
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
  const focusBack = await page.evaluate(() => document.activeElement?.getAttribute("aria-label"));
  console.log(`${width}: focus trapped=${focusInside}, after Esc focus on "${focusBack}"`);

  // 3. Error state, then success state.
  await fab.click();
  await dialog.getByRole("textbox", { name: "Your message" }).fill("The upload button does nothing on my phone.");
  await dialog.getByRole("textbox", { name: /Email/ }).fill("priya@example");
  await dialog.getByRole("button", { name: "Send" }).click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/feedback-${width}-invalid.png` });
  await dialog.getByRole("textbox", { name: /Email/ }).fill("priya@example.com");

  feedbackReply = { status: 503, body: { error: { message: "We couldn't send your feedback right now. Please try again later." } } };
  await dialog.getByRole("button", { name: "Send" }).click();
  await dialog.getByRole("alert").waitFor();
  await page.screenshot({ path: `${OUT}/feedback-${width}-error.png` });

  feedbackReply = { status: 200, body: { ok: true } };
  await dialog.getByRole("button", { name: "Send" }).click();
  await dialog.getByText("Thanks, it really helps").waitFor();
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/feedback-${width}-success.png` });
  await dialog.getByRole("button", { name: "Close" }).first().click();

  // 4. "Wrong result" on the Resume Matcher, after an analysis.
  await page.goto(`${BASE}/apps/resume-matcher`, { waitUntil: "networkidle" });
  for (const b of await page.getByRole("button", { name: "Load sample" }).all()) await b.click();
  await page.getByRole("button", { name: "Analyze match" }).click();
  await page.getByText("Suggested improvements").waitFor();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}/feedback-${width}-matcher-results.png` });
  await fab.click();
  await dialog.getByText("Wrong result").click();
  await dialog.getByRole("checkbox").check();
  await dialog.getByRole("textbox", { name: "Your message" }).fill("Docker is listed as missing, but I mention containers.");
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/feedback-${width}-wrong-result.png` });
  await dialog.getByRole("button", { name: "Send" }).click();
  await dialog.getByText("Thanks, it really helps").waitFor();
  console.log(`${width}: sent fields =`, Object.keys(lastFeedback).join(", "), "| debug =", JSON.stringify(lastFeedback.debug));
  console.log(`${width}: context =`, JSON.stringify(lastFeedback.context));

  await page.close();
}

await browser.close();
console.log("Saved feedback screenshots to", OUT);
