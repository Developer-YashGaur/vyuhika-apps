// Checks the Cover Letter Writer form page in a real browser, with the API faked (no Gemini calls),
// and takes screenshots of every state at phone and desktop width into screenshots/cover-letter-*.png.
// It also presses the keys: arrow keys on the radio groups, Tab order and the button's disabled rules.
// Usage: start the dev server (npm run dev), then run: node scripts/check-cover-letter-page.mjs
import assert from "node:assert/strict";
import { chromium } from "playwright";

const url = (process.env.URL ?? "http://localhost:3000") + "/apps/cover-letter-writer";
const sizes = [
  { name: "390", viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  { name: "1440", viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
];

const fakeAnswer = {
  letter: `Dear Hiring Manager,

Speed and accessibility sit at the heart of the dashboard you are building at Nimbus Cloud. For the past 4 years I have built fast, accessible web apps with React and TypeScript, and that is the work I want to do next.

At ShopLane, where I have worked since 2022, I built the checkout flow that 20,000 shoppers use every day, and at ShopLane I [add a real example of working with Next.js here].

I would welcome the chance to talk about how I could help your team.

Kind regards,
Priya Sharma`,
  gaps: [{ need: "Next.js", placeholder: "[add a real example of working with Next.js here]" }],
  notes: [],
  highlightHandling: "not-provided",
  highlightEvidence: "",
};

const browser = await chromium.launch();
let requestBody = null;

for (const { name, ...options } of sizes) {
  const context = await browser.newContext(options);
  const page = await context.newPage();
  const problems = [];
  page.on("pageerror", (err) => problems.push(`page error: ${err.message}`));
  // The faked 502 in the "error" state makes the browser log one line; that one is expected.
  page.on("console", (msg) => msg.type() === "error" && !msg.text().includes("502") && problems.push(`console error: ${msg.text()}`));
  const shot = (state, fullPage = true) => page.screenshot({ path: `screenshots/cover-letter-${name}-${state}.png`, fullPage });
  const button = page.getByRole("button", { name: "Write my cover letter" });
  const loadSamples = async () => {
    for (const link of await page.getByRole("button", { name: "Load sample" }).all()) await link.click();
  };

  // People click the whole pill (the radio itself is visually hidden).
  const pick = (group, label) => group.locator("label", { hasText: label }).click();

  async function fresh(route) {
    await page.unrouteAll();
    await page.route("**/api/cover-letter", route);
    await page.goto(url, { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);
  }

  // ---- empty ----
  await fresh(() => {});
  await shot("empty");
  assert.equal(await page.getByRole("heading", { name: "Cover Letter Writer", level: 1 }).count(), 1);
  assert.equal(await button.isDisabled(), true, "button starts disabled");
  assert.match(await page.locator("#write-hint").innerText(), /Add at least 200 characters/);
  assert.equal(await page.locator('meta[name="robots"]').getAttribute("content"), "noindex, nofollow");

  // ---- radio groups: names, defaults and arrow keys ----
  const tone = page.getByRole("group", { name: "Tone" });
  const length = page.getByRole("group", { name: "Length" });
  assert.equal(await tone.getByRole("radio").count(), 3);
  assert.equal(await length.getByRole("radio").count(), 2);
  assert.ok(await tone.getByRole("radio", { name: /Professional/ }).isChecked(), "Professional is the default");
  assert.ok(await length.getByRole("radio", { name: /Short/ }).isChecked(), "Short is the default");
  // Each radio is announced with its one-line hint.
  assert.match(await tone.getByRole("radio", { name: /Friendly/ }).evaluate((el) => el.getAttribute("aria-describedby")), /tone-friendly-hint/);
  assert.equal(await page.locator("#tone-friendly-hint").innerText(), "Warm and conversational");

  await tone.getByRole("radio", { name: /Professional/ }).focus();
  await page.keyboard.press("ArrowRight");
  assert.ok(await tone.getByRole("radio", { name: /Friendly/ }).isChecked(), "ArrowRight selects Friendly");
  await page.keyboard.press("ArrowRight");
  assert.ok(await tone.getByRole("radio", { name: /Confident/ }).isChecked(), "ArrowRight selects Confident");
  await page.keyboard.press("ArrowLeft");
  assert.ok(await tone.getByRole("radio", { name: /Friendly/ }).isChecked(), "ArrowLeft goes back");
  await page.keyboard.press("ArrowLeft");
  assert.ok(await tone.getByRole("radio", { name: /Professional/ }).isChecked());
  await length.getByRole("radio", { name: /Short/ }).focus();
  await page.keyboard.press("ArrowDown");
  assert.ok(await length.getByRole("radio", { name: /Medium/ }).isChecked(), "ArrowDown selects Medium");
  await shot("focus-ring", false); // the focused pill must show a ring
  await page.keyboard.press("ArrowUp");
  assert.ok(await length.getByRole("radio", { name: /Short/ }).isChecked());
  // The focused radio draws its ring on the pill.
  const ring = await length.getByRole("radio", { name: /Short/ }).evaluate((el) => getComputedStyle(el.closest("label")).outlineStyle);
  assert.equal(ring, "solid", "focus ring shows on the pill");

  // ---- the optional counters ----
  await page.getByLabel("Company name").fill("Nimbus Cloud");
  assert.equal(await page.locator("#company-name-count").innerText(), "12 / 100");
  await page.getByLabel("Anything to highlight?").fill("x".repeat(600)); // the browser stops at 500
  assert.equal(await page.locator("#highlight-count").innerText(), "500 / 500");
  await page.getByLabel("Company name").fill("");
  await page.getByLabel("Anything to highlight?").fill("");

  // ---- short resume: hint shows and Short is preselected, Medium can still be chosen ----
  await pick(length, /Medium/);
  await page.getByRole("button", { name: "Load sample" }).first().click();
  const sampleLength = (await page.locator("#resume").inputValue()).length;
  assert.ok(sampleLength < 1200, `sample resume is short (${sampleLength})`);
  await page.getByText("Your resume is short, so Short usually gives a better letter.").waitFor();
  assert.ok(await length.getByRole("radio", { name: /Short/ }).isChecked(), "Short is preselected for a short resume");
  await pick(length, /Medium/);
  await page.locator("#resume").pressSequentially(" more");
  assert.ok(await length.getByRole("radio", { name: /Medium/ }).isChecked(), "Medium stays chosen after typing");
  await pick(length, /Short/);
  await page.getByRole("button", { name: "Load sample" }).nth(1).click();
  await page.waitForTimeout(300);
  await shot("hint");

  // ---- button rules ----
  assert.equal(await button.isEnabled(), true, "enabled with both samples");
  await page.locator("#job-description").fill("j".repeat(199));
  assert.equal(await button.isDisabled(), true, "199 characters is not enough");
  await page.locator("#job-description").fill("j".repeat(15_001));
  assert.equal(await button.isDisabled(), true, "15,001 characters is too many");
  assert.match(await page.locator("#write-hint").innerText(), /up to 15,000 characters/);
  await page.locator("#job-description").fill("j".repeat(15_000));
  assert.equal(await button.isEnabled(), true, "15,000 is fine");

  // ---- filled (long resume, so no hint) ----
  await fresh(() => {});
  await loadSamples();
  await page.locator("#resume").fill(`${await page.locator("#resume").inputValue()}\n\n${await page.locator("#resume").inputValue()}`);
  await page.getByLabel("Company name").fill("Nimbus Cloud");
  await page.getByLabel("Role title").fill("Senior Frontend Engineer");
  await page.getByLabel("Anything to highlight?").fill("My work on the checkout flow used by 20,000 daily shoppers.");
  await pick(tone, /Confident/);
  await pick(length, /Medium/);
  assert.equal(await page.getByText("Your resume is short").count(), 0, "no hint for a longer resume");
  await page.waitForTimeout(300);
  await shot("filled");

  // ---- loading (the API never answers) ----
  await fresh(() => {});
  await loadSamples();
  await button.click();
  await page.getByText("This takes a few seconds.").waitFor();
  await page.waitForTimeout(500);
  await shot("loading", false);

  // ---- error ----
  await fresh((route) =>
    route.fulfill({
      status: 502,
      json: { error: { code: "ai-failed", message: "Our AI couldn't write this letter right now. Please try again in a moment." } },
    }),
  );
  await loadSamples();
  await button.click();
  await page.getByRole("heading", { name: "We couldn't write this letter" }).waitFor();
  await page.waitForTimeout(500);
  await shot("error", false);
  await page.getByRole("button", { name: "Edit your details" }).click();
  await button.waitFor();
  assert.ok((await page.locator("#resume").inputValue()).length > 200, "text is kept after an error");

  // ---- temporary result ----
  await fresh((route) => {
    requestBody = route.request().postDataJSON();
    return route.fulfill({ json: fakeAnswer });
  });
  await loadSamples();
  await page.getByLabel("Company name").fill("Nimbus Cloud");
  await pick(tone, /Friendly/);
  await button.click();
  await page.getByRole("heading", { name: "Your cover letter" }).waitFor();
  await page.waitForTimeout(600);
  await page.evaluate(() => window.scrollTo(0, 0));
  assert.match(await page.locator("p.whitespace-pre-wrap").innerText(), /^Dear Hiring Manager,/);
  await shot("result");
  assert.deepEqual(Object.keys(requestBody).sort(), ["companyName", "jobDescription", "length", "resume", "tone"]);
  assert.equal(requestBody.tone, "friendly");
  assert.equal(requestBody.length, "short");
  await page.getByRole("button", { name: "Start over" }).click();
  await button.waitFor();
  assert.equal(await page.locator("#resume").inputValue(), "", "Start over clears the form");

  assert.deepEqual(problems, [], `[${name}] browser problems`);
  console.log(`[${name}] all checks passed`);
  await context.close();
}

await browser.close();
