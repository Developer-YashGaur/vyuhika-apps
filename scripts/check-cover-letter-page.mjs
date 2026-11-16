// Checks the Cover Letter Writer form page in a real browser, with the API faked (no Gemini calls),
// and takes screenshots of every state at phone and desktop width into screenshots/cover-letter-*.png.
// It also presses the keys: arrow keys on the radio groups, Tab order and the button's disabled rules,
// and drives the result view: Next blank, gap cards, Copy, Download, Regenerate and the "Replace your edits?" panel
// (Regenerate, Edit inputs and Start over), and the feedback panel (the "settings and counts" checkbox,
// what is sent, and when it is cleared). The feedback route is faked too, so no email is sent.
// Usage: start the dev server (npm run dev), then run: node scripts/check-cover-letter-page.mjs
import assert from "node:assert/strict";
import { chromium } from "playwright";

const url = (process.env.URL ?? "http://localhost:3000") + "/apps/cover-letter-writer";
const sizes = [
  { name: "390", viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  { name: "1440", viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
];

const blankNext = "[add a real example of working with Next.js here]";
const blankCloud = "[add a real example of working with AWS or Docker here]";
const fakeAnswer = {
  letter: `Dear Hiring Manager,

Speed and accessibility sit at the heart of the dashboard you are building at Nimbus Cloud. For the past 4 years I have built fast, accessible web apps with React and TypeScript, and that is the work I want to do next.

At ShopLane, where I have worked since 2022, I built the checkout flow that 20,000 shoppers use every day. I improved page speed by rewriting the product list with virtualised rendering, and I worked with the backend team to design REST APIs for orders and payments.

Your role asks for Next.js, and at ShopLane I ${blankNext}. It also asks for cloud tools, and I ${blankCloud}.

Before ShopLane, I built marketing sites with HTML, CSS and JavaScript at PixelCraft Studio, wrote SQL reports for the sales team, and worked in two-week Agile sprints using Git.

I would welcome the chance to talk about how I could help your team build a faster, more accessible dashboard.

Kind regards,
Priya Sharma`,
  gaps: [
    { need: "Next.js or a server-rendered framework", placeholder: blankNext },
    { need: "AWS and Docker", placeholder: blankCloud },
  ],
  notes: ["highlight-not-addressed", "length", "cliche"],
  highlightHandling: "gap",
  highlightEvidence: "",
};
const secondLetter = "Dear Hiring Manager,\n\nA brand new second draft that is short and has no blanks.\n\nKind regards,\nPriya Sharma";
const rawNames = ["highlight-not-addressed", "cliche", "placement", "resume-mention"];

const browser = await chromium.launch();

for (const { name, ...options } of sizes) {
  const context = await browser.newContext({ ...options, permissions: ["clipboard-read", "clipboard-write"] });
  const page = await context.newPage();
  const problems = [];
  page.on("pageerror", (err) => problems.push(`page error: ${err.message}`));
  // The faked 502 in the "error" state makes the browser log one line; that one is expected.
  page.on("console", (msg) => msg.type() === "error" && !/502|429/.test(msg.text()) && problems.push(`console error: ${msg.text()}`));
  // Privacy: no letter or resume text in the console, and nothing sent to the feedback route.
  const logged = [];
  const feedbackCalls = [];
  const feedbackSent = []; // the reports this script sends on purpose (the route is faked)
  page.on("console", (msg) => logged.push(msg.text()));
  page.on("request", (req) => req.url().includes("/api/feedback") && feedbackCalls.push(req.url()));
  const shot = (state, fullPage = true) => page.screenshot({ path: `screenshots/cover-letter-${name}-${state}.png`, fullPage });
  const button = page.getByRole("button", { name: "Write my cover letter" });
  const loadSamples = async () => {
    for (const link of await page.getByRole("button", { name: "Load sample" }).all()) await link.click();
  };

  // People click the whole pill (the radio itself is visually hidden).
  const pick = (group, label) => group.locator("label", { hasText: label }).click();

  // The feedback panel: open it, pick a type, and look for the "settings and counts" checkbox.
  const settingsBox = page.getByRole("checkbox", { name: /Include my settings and counts/ });
  const feedbackDialog = page.getByRole("dialog");
  async function openFeedback(type) {
    await page.getByRole("button", { name: "Send feedback" }).click();
    await feedbackDialog.waitFor();
    await feedbackDialog.locator("label", { hasText: type }).click();
    await page.waitForTimeout(250);
  }
  async function closeFeedback() {
    await page.keyboard.press("Escape");
    await feedbackDialog.waitFor({ state: "hidden" });
  }

  async function fresh(route) {
    await page.unrouteAll();
    await page.route("**/api/feedback", (route) => {
      feedbackSent.push(route.request().postDataJSON());
      return route.fulfill({ json: { ok: true } });
    });
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
  assert.equal(await page.locator('meta[name="robots"]').count(), 0, "the page can be indexed");
  assert.equal(await page.locator('meta[property="og:image"]').getAttribute("content"), "https://apps.vyuhika.com/og/cover-letter-writer.png");

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

  // ---- result view ----
  let reply = { json: fakeAnswer };
  const bodies = [];
  await fresh((route) => {
    bodies.push(route.request().postDataJSON());
    return route.fulfill(reply);
  });
  await loadSamples();
  await page.getByLabel("Company name").fill("Nimbus Cloud");
  await pick(tone, /Friendly/);
  await button.click();
  await page.getByRole("heading", { name: "Your cover letter" }).waitFor();
  await page.waitForTimeout(1200);
  const letterBox = page.locator("#letter-text");
  const status = page.locator('p[aria-live="polite"].sr-only');
  const selected = () => letterBox.evaluate((el) => el.value.slice(el.selectionStart, el.selectionEnd));
  const bodyText = () => page.locator("body").innerText();

  assert.equal(await page.evaluate(() => document.activeElement?.id), "letter-heading", "focus moves to the result heading");
  assert.deepEqual(Object.keys(bodies[0]).sort(), ["companyName", "jobDescription", "length", "resume", "tone"]);
  assert.equal(bodies[0].tone, "friendly");
  assert.match(await page.locator("body").innerText(), /Friendly tone/);
  assert.match(await page.locator("body").innerText(), /Short length/);
  assert.match(await bodyText(), /Check every fact before you send\. This letter is a draft written from your resume\./);
  assert.match(await bodyText(), /2 blanks still to fill/);
  assert.match(await bodyText(), /Your resume doesn't show what you wanted to highlight, so we left it out/);
  assert.match(await bodyText(), /a bit shorter or longer than you picked/);
  assert.match(await bodyText(), /A few lines may need a quick polish/);
  for (const raw of rawNames) assert.ok(!(await bodyText()).includes(raw), `raw check name "${raw}" is never shown`);
  assert.equal(await page.getByRole("button", { name: "Copy" }).isEnabled(), true, "Copy works with blanks left");
  assert.equal(await page.getByRole("button", { name: "Download .txt" }).isEnabled(), true, "Download works with blanks left");
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(800); // smooth scrolling settles
  await shot("result-blanks");

  // ---- feedback panel: the checkbox only shows for "Wrong result", and only because a result exists ----
  await openFeedback("Bug");
  assert.equal(await settingsBox.count(), 0, "no checkbox for a Bug report");
  await feedbackDialog.locator("label", { hasText: "Wrong result" }).click();
  await settingsBox.waitFor();
  assert.equal(await settingsBox.isChecked(), false, "the checkbox starts unticked");
  assert.equal(await settingsBox.isEnabled(), true);
  assert.equal(
    await feedbackDialog.locator("label.feedback-check").innerText(),
    "Include my settings and counts to help debug (your resume, job text and letter are never included)",
  );
  assert.equal(await feedbackDialog.getByText(/match score|score and keywords/).count(), 0, "no matcher wording");
  await feedbackDialog.getByRole("textbox", { name: "Your message" }).fill("The letter has the wrong length for what I picked.");
  await settingsBox.focus();
  await page.keyboard.press("Space");
  assert.equal(await settingsBox.isChecked(), true, "Space ticks it (keyboard friendly)");
  await page.waitForTimeout(400);
  await page.screenshot({ path: `screenshots/cover-letter-${name}-feedback-panel.png` });
  await closeFeedback();
  assert.deepEqual(feedbackCalls, [], "nothing is sent just by looking at the panel");

  // The letter box grows with its text and never gets its own scrollbar.
  const noInnerScroll = () => letterBox.evaluate((el) => el.scrollHeight <= el.clientHeight + 1);
  assert.ok(await noInnerScroll(), "letter box is as tall as its text");
  const heightBefore = (await letterBox.boundingBox()).height;
  await letterBox.evaluate((el) => {
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length); // (Control+End differs between systems)
  });
  await page.keyboard.type("\n\n\n\n\n\n\n\nextra");
  assert.ok((await letterBox.boundingBox()).height > heightBefore, "box grows as the person types");
  assert.ok(await noInnerScroll());
  for (let i = 0; i < "\n\n\n\n\n\n\n\nextra".length; i++) await page.keyboard.press("Backspace"); // back to the AI's text
  assert.equal(await letterBox.inputValue(), fakeAnswer.letter, "the test typing was removed again");

  // Next blank walks through the blanks, wraps round, and announces itself.
  const next = page.getByRole("button", { name: "Next blank" });
  await next.click();
  assert.equal(await selected(), blankNext);
  assert.match(await status.innerText(), /Blank 1 of 2 selected/);
  assert.equal(await page.evaluate(() => document.activeElement?.id), "letter-text", "focus moves to the letter");
  await next.click();
  assert.equal(await selected(), blankCloud);
  assert.match(await status.innerText(), /Blank 2 of 2 selected: add a real example of working with AWS or Docker here/);
  await page.waitForTimeout(700); // smooth scroll
  await shot("next-blank", false); // the selected blank must be on screen
  const onScreen = await letterBox.evaluate((el) => {
    const rect = el.getBoundingClientRect();
    return rect.top < window.innerHeight && rect.bottom > 0;
  });
  assert.ok(onScreen);
  await next.click();
  assert.equal(await selected(), blankNext, "wraps round to the first blank");

  // Clicking a gap card selects that blank.
  await page.getByRole("button", { name: /AWS and Docker/ }).click();
  assert.equal(await selected(), blankCloud);
  await page.getByRole("button", { name: /Next\.js or a server-rendered framework/ }).click();
  assert.equal(await selected(), blankNext);

  // Copy: the label changes, "Copied" is announced and the clipboard holds the letter.
  await page.getByRole("button", { name: "Copy", exact: true }).click();
  await page.getByRole("button", { name: "Copied", exact: true }).waitFor();
  assert.equal(await status.innerText(), "Copied");
  assert.equal(await page.evaluate(() => navigator.clipboard.readText()), await letterBox.inputValue());
  await page.getByRole("button", { name: "Copy", exact: true }).waitFor({ timeout: 4000 });

  // Download: made in the browser, named after the company.
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Download .txt" }).click()]);
  assert.equal(download.suggestedFilename(), "cover-letter-nimbus-cloud.txt");
  const { readFile } = await import("node:fs/promises");
  assert.equal(await readFile(await download.path(), "utf8"), await letterBox.inputValue());

  // Fill both blanks by typing over the selection: the chip, the cards and Next blank follow.
  await page.getByRole("button", { name: /Next\.js or a server-rendered framework/ }).click();
  assert.equal(await selected(), blankNext);
  await page.keyboard.type("I moved the checkout app to Next.js with server rendering");
  assert.match(await bodyText(), /1 blank still to fill/);
  await next.click();
  assert.equal(await selected(), blankCloud);
  await page.keyboard.type("I ship through AWS and Docker pipelines every week");
  assert.match(await bodyText(), /All blanks filled/);
  assert.equal(await page.getByText("Filled in").count(), 2);
  assert.equal(await next.isDisabled(), true);
  assert.match(await bodyText(), /Blanks are things the job asks for that your resume doesn't show\. Add a real example, or delete the sentence\./);
  assert.equal(await page.getByRole("button", { name: "Copy", exact: true }).isEnabled(), true);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(800);
  await shot("result-filled");
  const edited = await letterBox.inputValue();

  // Sending a report: the blank count is the one at the moment of sending (0 now, it was 2), and only the
  // safe summary goes along. Nothing from the letter, the form or the gaps.
  await openFeedback("Wrong result");
  await feedbackDialog.getByRole("textbox", { name: "Your message" }).fill("The letter has the wrong length for what I picked.");
  await settingsBox.check();
  await feedbackDialog.getByRole("button", { name: "Send" }).click();
  await feedbackDialog.getByText("Thanks, it really helps").waitFor();
  assert.equal(feedbackSent.length, 1);
  assert.equal(feedbackSent[0].type, "wrong-result");
  assert.equal(feedbackSent[0].context.path, "/apps/cover-letter-writer");
  assert.deepEqual(feedbackSent[0].debug, {
    tone: "friendly",
    length: "short",
    wordCount: fakeAnswer.letter.trim().split(/\s+/).length,
    blanks: 0,
    companyFilled: true,
    roleFilled: false,
    highlightFilled: false,
    highlightHandling: "gap",
    notes: ["length", "cliche", "highlight-not-addressed"], // the server's order, not the order they came in
  });
  const sentJson = JSON.stringify(feedbackSent[0]);
  for (const text of ["Dear Hiring Manager", "Nimbus", "ShopLane", "Priya", "checkout", "Next.js", "AWS", "moved the checkout app", "Docker"]) {
    assert.ok(!sentJson.includes(text), `the report never contains "${text}"`);
  }
  await feedbackDialog.getByRole("button", { name: "Close" }).first().click();
  await feedbackDialog.waitFor({ state: "hidden" });

  // Edit inputs and Start over share the "Replace your edits?" panel once the letter was edited.
  // (Keep my edits and Escape stay on the result, and focus goes back to the button that was pressed.)
  const replacePanel = page.getByRole("alertdialog", { name: "Replace your edits?" });
  const editInputs = page.getByRole("button", { name: "Edit inputs" });
  const startOver = page.getByRole("button", { name: "Start over" });
  await editInputs.click();
  await replacePanel.waitFor();
  assert.match(await replacePanel.innerText(), /Going back to the form drops the changes you made to this letter/);
  assert.equal(await replacePanel.getByRole("button", { name: "Edit inputs anyway" }).count(), 1);
  assert.equal(await replacePanel.getByRole("button", { name: "Start over anyway" }).count(), 0);
  assert.equal(await page.evaluate(() => document.activeElement?.textContent), "Keep my edits", "the safe button has focus");
  await page.keyboard.press("Escape");
  await replacePanel.waitFor({ state: "detached" });
  assert.equal(await page.evaluate(() => document.activeElement?.textContent), "Edit inputs", "focus returns to Edit inputs");
  assert.equal(await letterBox.inputValue(), edited, "still on the result with the edits");
  await startOver.click();
  await replacePanel.waitFor();
  assert.match(await replacePanel.innerText(), /Starting over clears the form and drops the changes/);
  await page.keyboard.press("Tab"); // Keep my edits -> the confirm button
  assert.equal(await page.evaluate(() => document.activeElement?.textContent), "Start over anyway", "reachable with the keyboard");
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Enter"); // Keep my edits
  await replacePanel.waitFor({ state: "detached" });
  assert.equal(await page.evaluate(() => document.activeElement?.textContent), "Start over", "focus returns to Start over");
  assert.equal(await letterBox.inputValue(), edited);
  assert.equal(await page.getByRole("heading", { name: "Your cover letter" }).count(), 1, "still on the result");

  // Regenerate after edits asks first (an accessible panel, not window.confirm); Escape keeps the edits.
  let nativeDialogs = 0;
  page.on("dialog", (d) => {
    nativeDialogs++;
    d.dismiss();
  });
  const regenerate = page.getByRole("button", { name: "Regenerate" });
  await regenerate.click();
  const panel = page.getByRole("alertdialog", { name: "Replace your edits?" });
  await panel.waitFor();
  assert.equal(await page.evaluate(() => document.activeElement?.textContent), "Keep my edits", "the safe button has focus");
  assert.equal(bodies.length, 1, "nothing was requested yet");
  await page.keyboard.press("Escape");
  await panel.waitFor({ state: "detached" });
  assert.equal(await page.evaluate(() => document.activeElement?.textContent), "Regenerate", "focus returns to Regenerate");
  assert.equal(bodies.length, 1);
  assert.equal(await letterBox.inputValue(), edited);

  // A failed regenerate (429 in the letter wording) keeps the letter and the edits on screen.
  reply = {
    status: 429,
    json: { error: { code: "rate-limited", message: "You've written a lot of letters in a short time. Please wait a minute and try again." } },
  };
  await regenerate.click();
  await panel.waitFor();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(800);
  await shot("replace-panel");
  await page.getByRole("button", { name: "Replace my edits" }).click();
  const alert = page.getByRole("alert").filter({ hasText: "Please wait a minute" });
  await alert.waitFor();
  assert.equal(bodies.length, 2, "the same inputs were sent again");
  assert.deepEqual(bodies[1], bodies[0], "regenerate sends the same inputs");
  assert.match(await alert.innerText(), /Your current letter and your edits are still here/);
  assert.equal(await letterBox.inputValue(), edited, "edits are kept after a failed regenerate");
  assert.match(await bodyText(), /All blanks filled/);
  assert.equal(await regenerate.isEnabled(), true, "Regenerate can be tried again");
  await page.waitForTimeout(800);
  await shot("regen-error");

  // A successful regenerate (after "Replace my edits") swaps in the new letter, gaps and notes.
  reply = { json: { letter: secondLetter, gaps: [], notes: [], highlightHandling: "not-provided", highlightEvidence: "" } };
  await regenerate.click();
  await panel.waitFor();
  await page.getByRole("button", { name: "Replace my edits" }).click();
  await page.getByText("Nothing to fill in.").waitFor();
  assert.equal(await letterBox.inputValue(), secondLetter);
  assert.equal(bodies.length, 3);
  assert.match(await status.innerText(), /New letter ready/);
  assert.equal(await page.getByRole("alert").filter({ hasText: "still here" }).count(), 0, "the old error is gone");
  assert.ok(!(await bodyText()).includes("quick polish"), "old notes are gone");
  // With no edits, Regenerate does not ask.
  await regenerate.click();
  await page.waitForTimeout(500);
  assert.equal(bodies.length, 4, "no confirm panel when the letter was not edited");
  assert.equal(await panel.count(), 0);
  assert.equal(nativeDialogs, 0, "window.confirm is never used");

  // Edit inputs goes back to the form with everything still filled in; Start over clears it.
  // A letter that was not edited has nothing to lose, so neither asks first.
  await page.getByRole("button", { name: "Edit inputs" }).click();
  await button.waitFor();
  assert.equal(await replacePanel.count(), 0, "no panel for Edit inputs when the letter was not edited");
  assert.ok((await page.locator("#resume").inputValue()).length > 200);
  assert.equal(await page.getByLabel("Company name").inputValue(), "Nimbus Cloud");
  assert.ok(await tone.getByRole("radio", { name: /Friendly/ }).isChecked());
  await button.click();
  await page.getByRole("heading", { name: "Your cover letter" }).waitFor();

  // After Edit inputs and again after Start over, the feedback panel has no checkbox: the summary was cleared.
  // (Edit inputs first, with an edited letter this time: the panel asks, and "Edit inputs anyway" goes back.)
  await letterBox.evaluate((el) => el.focus());
  await page.keyboard.type(" Edited once.");
  await page.getByRole("button", { name: "Edit inputs" }).click();
  await replacePanel.waitFor();
  await replacePanel.getByRole("button", { name: "Edit inputs anyway" }).click();
  await button.waitFor();
  assert.equal(await page.getByLabel("Company name").inputValue(), "Nimbus Cloud", "Edit inputs keeps the form filled in");
  await openFeedback("Wrong result");
  assert.equal(await settingsBox.count(), 0, "no checkbox after Edit inputs");
  await closeFeedback();

  // A new request clears it too: while the letter is being written there is no checkbox.
  await page.unroute("**/api/cover-letter");
  await page.route("**/api/cover-letter", () => {}); // never answers
  await button.click();
  await page.getByText("This takes a few seconds.").waitFor();
  await openFeedback("Wrong result");
  assert.equal(await settingsBox.count(), 0, "no checkbox while a new letter is being written");
  await closeFeedback();
  await page.unroute("**/api/cover-letter");
  await page.route("**/api/cover-letter", (route) => route.fulfill({ json: fakeAnswer }));
  await page.reload({ waitUntil: "networkidle" });
  await loadSamples();
  await page.getByLabel("Company name").fill("Nimbus Cloud");
  await button.click();
  await page.getByRole("heading", { name: "Your cover letter" }).waitFor();
  await openFeedback("Wrong result");
  await settingsBox.waitFor(); // a new result: the checkbox is back
  await closeFeedback();

  await letterBox.evaluate((el) => el.focus());
  await page.keyboard.type(" Edited again.");
  await page.getByRole("button", { name: "Start over" }).click();
  await replacePanel.waitFor();
  await replacePanel.getByRole("button", { name: "Start over anyway" }).click();
  await button.waitFor();
  assert.equal(await page.locator("#resume").inputValue(), "", "Start over clears the form");
  assert.equal(await page.getByLabel("Company name").inputValue(), "");
  await openFeedback("Wrong result");
  assert.equal(await settingsBox.count(), 0, "no checkbox after Start over");
  await closeFeedback();
  assert.equal(feedbackSent.length, 1, "only the one report this script sent on purpose");

  // Download without a company name uses the plain file name.
  reply = { json: fakeAnswer };
  await loadSamples();
  await button.click();
  await page.getByRole("heading", { name: "Your cover letter" }).waitFor();
  const [plain] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Download .txt" }).click()]);
  assert.equal(plain.suggestedFilename(), "cover-letter.txt");

  // Privacy: nothing was logged and nothing went to the feedback route.
  assert.equal(feedbackCalls.length, feedbackSent.length, "no call to /api/feedback except the report sent on purpose");
  assert.ok(!logged.some((line) => /Dear Hiring Manager|Priya|ShopLane/.test(line)), "no letter or resume text in the console");
  assert.equal(await page.evaluate(() => JSON.stringify([localStorage, sessionStorage]).includes("Hiring Manager")), false);

  assert.deepEqual(problems, [], `[${name}] browser problems`);
  console.log(`[${name}] all checks passed`);
  await context.close();
}

await browser.close();
