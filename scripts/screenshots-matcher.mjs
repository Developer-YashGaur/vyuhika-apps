// Screenshots of the Resume Matcher: empty, uploaded file, loading and results states,
// at phone and desktop widths. It also checks the upload error messages.
// Usage: start the dev server (npm run dev), then run: npm run screenshots:matcher
import { chromium } from "playwright";

const url = (process.env.URL ?? "http://localhost:3000") + "/apps/resume-matcher";
const sizes = [
  { name: "390", width: 390, height: 844, isMobile: true, hasTouch: true },
  { name: "1440", width: 1440, height: 900 },
  { name: "1920", width: 1920, height: 1080 },
  { name: "2560", width: 2560, height: 1440 },
];

const browser = await chromium.launch();

for (const { name, isMobile, hasTouch, ...size } of sizes) {
  const page = await browser.newPage({ viewport: size, isMobile, hasTouch, deviceScaleFactor: isMobile ? 2 : 1 });
  page.on("pageerror", (err) => console.log(`[${name}] page error:`, err.message));
  page.on("console", (msg) => msg.type() === "error" && console.log(`[${name}] console error:`, msg.text()));
  const shot = (state, fullPage = true) =>
    page.screenshot({ path: `screenshots/matcher-${name}-${state}.png`, fullPage });
  const fileInput = page.locator('input[type="file"]');

  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  await shot("empty");

  // Error checks: a scanned PDF and an unsupported file type.
  await fileInput.setInputFiles("tests/fixtures/scanned.pdf");
  const alert = page.locator(".upload-error");
  await alert.waitFor({ timeout: 15000 });
  console.log(`[${name}] scanned PDF message:`, await alert.innerText());
  await fileInput.setInputFiles({ name: "photo.png", mimeType: "image/png", buffer: Buffer.from("png") });
  await page.waitForTimeout(300);
  console.log(`[${name}] wrong type message:`, await alert.innerText());
  await shot("upload-error", false);

  // Upload a real PDF; its text should appear in the resume box.
  await fileInput.setInputFiles("tests/fixtures/sample-resume.pdf");
  await page.getByRole("button", { name: /Remove sample-resume\.pdf/ }).waitFor({ timeout: 15000 });
  const text = await page.locator("#resume").inputValue();
  console.log(`[${name}] PDF text extracted:`, text.length, "chars, starts with:", JSON.stringify(text.slice(0, 30)));
  await page.getByRole("button", { name: "Load sample" }).nth(1).click();
  await page.waitForTimeout(400);
  await shot("uploaded");

  const button = page.getByRole("button", { name: "Analyze match" });
  console.log(`[${name}] analyze enabled after upload:`, !(await button.isDisabled()));
  await button.click();
  await page.waitForTimeout(1500);
  await shot("loading", false);

  await page.getByRole("button", { name: "Try again" }).waitFor({ timeout: 10000 });
  await page.waitForTimeout(3000); // let the gauge and cards finish animating
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);
  await shot("results");
  await page.close();
}

await browser.close();
console.log("Saved screenshots to screenshots/");
