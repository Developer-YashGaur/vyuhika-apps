// Checks the visitor counting in a real browser, against a PRODUCTION build (events are silent in development).
// Vercel's script reads events from a queue (window.vaq) that we can look at, so we see exactly what would be sent.
// All APIs are faked inside the browser (no Gemini calls, no emails), and nothing is sent to Vercel or to Koshvia.
// Usage: npm run build, then (in another terminal) PORT=3100 npm start, then: node scripts/check-analytics-events.mjs
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium } from "playwright";

const BASE = process.env.URL ?? "http://localhost:3100";

// Text a visitor types or uploads. None of it may appear in any event.
const SECRETS = [
  "Priya Sharma", "ShopLane", "PixelCraft", "Nimbus Cloud", "Senior Frontend Engineer", "checkout flow",
  "priya-private-cv-2026", "priya.private@example.com", "My secret feedback message", "Dear Hiring Manager",
];

const dir = await mkdtemp(join(tmpdir(), "analytics-check-"));
const cvPath = join(dir, "priya-private-cv-2026.txt");
await writeFile(cvPath, await readFile("tests/fixtures/resume.txt", "utf8"));

const fakeAnalysis = {
  score: 62, summary: "Good match.", matchedKeywords: ["React"], missingKeywords: ["AWS"],
  suggestions: [{ title: "a", detail: "b" }, { title: "c", detail: "d" }, { title: "e", detail: "f" }],
};
const fakeLetter = (n) => ({
  letter: `Dear Hiring Manager,\n\nDraft ${n} for Priya Sharma at ShopLane.\n\nKind regards,\nPriya Sharma`,
  gaps: [], notes: [], highlightEvidence: "", highlightHandling: "not-provided",
});

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const problems = [];
let letters = 0;
await context.route("https://koshvia.vyuhika.com/**", (route) => route.fulfill({ contentType: "text/html", body: "<title>blocked in test</title>" }));
await context.route("**/api/analyze", (route) => route.fulfill({ json: fakeAnalysis }));
await context.route("**/api/cover-letter", (route) => route.fulfill({ json: fakeLetter(++letters) }));
await context.route("**/api/feedback", (route) => route.fulfill({ json: { ok: true } }));
await context.route("**/_vercel/**", (route) => route.fulfill({ status: 204, body: "" })); // nothing goes to Vercel

const page = await context.newPage();
page.on("pageerror", (err) => problems.push(`page error: ${err.message}`));

// Every custom event queued so far, as { name, data }.
const events = () => page.evaluate(() => (window.vaq ?? []).filter((entry) => entry[0] === "event").map(([, e]) => ({ name: e.name, data: e.data })));
const lastEvent = async () => (await events()).at(-1);

// --- Home: nothing counted by looking. The external card counts on click (and on middle click).
await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
await page.waitForTimeout(800);
assert.deepEqual(await events(), [], "no custom event just from viewing the home page");
assert.equal(await page.evaluate(() => window.vam), "production", "production mode, so events are really queued");
assert.deepEqual(await context.cookies(), [], "no cookies are set");

const koshvia = page.getByRole("link", { name: /Open Koshvia/ });
const [tab] = await Promise.all([context.waitForEvent("page"), koshvia.click()]);
await tab.close();
assert.deepEqual(await events(), [{ name: "external_app_clicked", data: { app: "koshvia" } }]);
await page.getByRole("link", { name: /Open Resume Matcher/ }).hover();
await page.getByRole("link", { name: /Open Resume Matcher/ }).click({ trial: true });
assert.equal((await events()).length, 1, "an internal card counts nothing");

// --- Resume Matcher: file type, then the analysis, then feedback.
await page.goto(`${BASE}/apps/resume-matcher`, { waitUntil: "networkidle" });
assert.deepEqual(await events(), [], "a fresh page starts with no events");
await page.setInputFiles('input[type="file"]', cvPath);
await page.getByText("priya-private-cv-2026.txt").first().waitFor();
assert.deepEqual(await lastEvent(), { name: "resume_file_selected", data: { file_type: "txt" } }, "the file type only, never the name");

await page.setInputFiles('input[type="file"]', []).catch(() => {});
for (const b of await page.getByRole("button", { name: "Load sample" }).all()) await b.click().catch(() => {});
await page.locator("#job-description").fill(await page.locator("#job-description").inputValue() || "j".repeat(300));
await page.getByRole("button", { name: "Analyze match" }).click();
await page.getByText("Good match.").waitFor();
const afterAnalysis = await events();
assert.deepEqual(afterAnalysis.at(-1), { name: "resume_analyzed", data: { app: "resume-matcher" } }, "counted after a successful analysis");

// A failed analysis counts nothing.
await page.reload({ waitUntil: "networkidle" });
await page.unroute("**/api/analyze");
await page.route("**/api/analyze", (route) => route.fulfill({ status: 502, json: { error: { code: "ai-failed", message: "Try again." } } }));
for (const b of await page.getByRole("button", { name: "Load sample" }).all()) await b.click();
await page.getByRole("button", { name: "Analyze match" }).click();
await page.getByRole("heading", { name: /couldn't|could not|went wrong|analy/i }).first().waitFor();
assert.deepEqual(await events(), [], "no event after a failed analysis");

// Feedback: counted after it was sent, with the type and a fixed page word; never the message or the email.
await page.getByRole("button", { name: "Send feedback" }).click();
const dialog = page.getByRole("dialog");
await dialog.locator("label", { hasText: "Idea" }).click();
await dialog.getByRole("textbox", { name: "Your message" }).fill("My secret feedback message about priya-private-cv-2026");
await dialog.getByRole("textbox", { name: /Email/ }).fill("priya.private@example.com");
await dialog.getByRole("button", { name: "Send" }).click();
await dialog.getByText("Thanks, it really helps").waitFor();
assert.deepEqual(await events(), [{ name: "feedback_sent", data: { type: "idea", page: "resume-matcher" } }]);

// --- Cover Letter Writer: each letter (first write and Regenerate) counts, with tone and length only.
await page.goto(`${BASE}/apps/cover-letter-writer`, { waitUntil: "networkidle" });
for (const b of await page.getByRole("button", { name: "Load sample" }).all()) await b.click();
await page.getByLabel("Company name").fill("Nimbus Cloud");
await page.getByLabel("Role title").fill("Senior Frontend Engineer");
await page.getByLabel("Anything to highlight?").fill("My checkout flow work");
await page.getByRole("group", { name: "Tone" }).locator("label", { hasText: "Friendly" }).click();
await page.getByRole("button", { name: "Write my cover letter" }).click();
await page.getByRole("heading", { name: "Your cover letter" }).waitFor();
assert.deepEqual(await events(), [{ name: "cover_letter_written", data: { app: "cover-letter-writer", tone: "friendly", length: "short" } }]);
await page.getByRole("button", { name: "Regenerate" }).click();
await page.waitForFunction(() => document.querySelector("#letter-text")?.value.includes("Draft 2"));
assert.equal((await events()).length, 2, "Regenerate counts as another letter");

// --- Nothing anywhere in the events is text from the visitor.
const all = JSON.stringify([...(await events()), ...afterAnalysis]);
for (const secret of SECRETS) assert.ok(!all.includes(secret), `no event contains "${secret}"`);
assert.ok(/^[a-z_]+$/.test(JSON.parse(all)[0].name));
for (const event of [...(await events()), ...afterAnalysis]) {
  for (const value of Object.values(event.data ?? {})) assert.match(value, /^[a-z-]+$/, "fixed words only");
}
assert.deepEqual(await context.cookies(), [], "still no cookies after using every app");
assert.deepEqual(problems, [], "browser problems");
console.log("analytics events: all checks passed");
await browser.close();
