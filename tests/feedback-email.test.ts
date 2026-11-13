import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createConfirmationLimiter, deliverFeedback, type EmailMessage } from "@/lib/feedback/deliver";
import { getEmailSettings, type EmailSettings } from "@/lib/email/settings";
import { excerpt, formatEmailTime, notificationSubject } from "@/lib/feedback/email-text";
import { buildConfirmationEmail, buildNotificationEmail } from "@/lib/feedback/emails";
import { sampleFeedback } from "@/lib/feedback/email-samples";
import type { Feedback } from "@/lib/feedback/schema";
import { sampleJobDescription, sampleResume } from "@/lib/samples";

// Email templates and delivery. The sender is always a fake: no real email is sent.

const settings: EmailSettings = {
  from: "Vyuhika Apps <no_reply@vyuhika.com>",
  feedbackTo: "support@vyuhika.com",
  assetBaseUrl: "https://apps.vyuhika.com",
};

const bug = sampleFeedback.bug;
const wrongResult = sampleFeedback["wrong-result"];

// Collects every email the fake sender is asked to send.
function fakeSender(results: boolean[] = [true, true]) {
  const sent: EmailMessage[] = [];
  const send = async (email: EmailMessage) => {
    sent.push(email);
    return results[sent.length - 1] ?? true;
  };
  return { sent, send };
}

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

describe("templates render", () => {
  it("the notification renders HTML and plain text with every detail", async () => {
    const email = await buildNotificationEmail(wrongResult, settings.assetBaseUrl, new Date("2026-11-13T10:52:14Z"));
    expect(email.html).toMatch(/^<!DOCTYPE html/i);
    expect(email.html).toContain("New feedback");
    expect(email.html).toContain("Wrong result");
    expect(email.html).toContain("/apps/resume-matcher");
    expect(email.html).toContain("https://apps.vyuhika.com/email/header.png");
    expect(email.html).toMatch(/alt="Vyuhika: a glowing neural network orb/);
    expect(email.text).toContain("Score: 62 / 100");
    expect(email.text).toContain("Matched: React, TypeScript, REST APIs, SQL, Git, Agile");
    expect(email.text).toContain("Received: 13 Nov 2026, 10:52 UTC");
  });

  it("the confirmation renders with the animated header, a button and the footer", async () => {
    const email = await buildConfirmationEmail(wrongResult, settings.assetBaseUrl);
    expect(email.subject).toBe("Thanks, we got your feedback");
    expect(email.html).toContain("https://apps.vyuhika.com/email/header.gif");
    expect(email.html).toContain('href="https://apps.vyuhika.com"');
    expect(email.html).toContain("Back to Vyuhika Apps");
    expect(email.html).toContain("because you sent feedback on Vyuhika Apps");
    expect(email.text).toContain("Back to Vyuhika Apps: https://apps.vyuhika.com");
  });

  it("uses no scripts, SVG or CSS animation", async () => {
    for (const email of [
      await buildNotificationEmail(wrongResult, settings.assetBaseUrl),
      await buildConfirmationEmail(wrongResult, settings.assetBaseUrl),
    ]) {
      expect(email.html).not.toMatch(/<script|<svg|@keyframes|animation:/i);
    }
  });
});

describe("user content is escaped", () => {
  // Built directly (skipping the form's HTML stripping) to prove the templates escape on their own.
  const attack: Feedback = {
    ...bug,
    message: '<script>alert("hacked")</script><img src=x onerror=alert(1)> & "quotes"',
    context: { ...bug.context, browser: "<b>Evil</b> browser" },
  };

  it("in the notification", async () => {
    const { html } = await buildNotificationEmail(attack, settings.assetBaseUrl);
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<img src=x");
    expect(html).not.toContain("<b>Evil</b>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("in the confirmation", async () => {
    const { html } = await buildConfirmationEmail(attack, settings.assetBaseUrl);
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });
});

describe("resume and job text can't appear", () => {
  it("even if an object carrying them reaches the templates, they are not rendered", async () => {
    const sneaky = { ...wrongResult, resume: sampleResume, jobDescription: sampleJobDescription } as Feedback;
    const built = [
      await buildNotificationEmail(sneaky, settings.assetBaseUrl),
      await buildConfirmationEmail(sneaky, settings.assetBaseUrl),
    ];
    const longLines = [...sampleResume.split("\n"), ...sampleJobDescription.split("\n")]
      .map((l) => l.trim())
      .filter((l) => l.length > 25);
    for (const { html, text } of built) {
      for (const line of longLines) {
        expect(html).not.toContain(line);
        expect(text).not.toContain(line);
      }
    }
  });
});

describe("subject lines", () => {
  it("uses the type and the first 50 characters, on one line", () => {
    const long: Feedback = { ...bug, message: `  The upload button\n\ndoes   nothing ${"on my phone ".repeat(10)}` };
    const subject = notificationSubject(long);
    expect(subject.startsWith("[Vyuhika] Bug: The upload button does nothing on my phone")).toBe(true);
    expect(subject).not.toMatch(/[\r\n]/);
    expect(subject.endsWith("…")).toBe(true);
    expect(subject.length).toBeLessThanOrEqual("[Vyuhika] Bug: ".length + 51);
  });

  it("keeps short messages whole", () => {
    expect(notificationSubject({ ...bug, type: "idea", message: "Add dark mode toggle" })).toBe(
      "[Vyuhika] Idea: Add dark mode toggle",
    );
  });

  it("excerpt and time helpers behave", () => {
    expect(excerpt("hello world", 5)).toBe("hello…");
    expect(excerpt("  hi  ", 5)).toBe("hi");
    expect(formatEmailTime("2026-01-05T08:03:00.000Z")).toBe("5 Jan 2026, 08:03 UTC");
  });
});

describe("deliverFeedback", () => {
  it("sends the notification, then a confirmation when the visitor left an email", async () => {
    const { sent, send } = fakeSender();
    expect(await deliverFeedback(wrongResult, send, settings)).toEqual({ ok: true, confirmationSent: true });
    expect(sent).toHaveLength(2);
    expect(sent[0]).toMatchObject({
      from: settings.from,
      to: "support@vyuhika.com",
      replyTo: "priya@example.com",
      subject: expect.stringMatching(/^\[Vyuhika\] Wrong result: /),
    });
    expect(sent[1]).toMatchObject({
      from: settings.from,
      to: "priya@example.com",
      replyTo: "support@vyuhika.com",
      subject: "Thanks, we got your feedback",
    });
    for (const email of sent) {
      expect(email.html.length).toBeGreaterThan(500);
      expect(email.text.length).toBeGreaterThan(50);
    }
  });

  it("skips the confirmation when there is no email", async () => {
    const { sent, send } = fakeSender();
    expect(await deliverFeedback({ ...bug, email: undefined }, send, settings)).toEqual({
      ok: true,
      confirmationSent: false,
    });
    expect(sent).toHaveLength(1);
    expect(sent[0].replyTo).toBeUndefined();
  });

  it("doesn't send the confirmation if the notification failed", async () => {
    const { sent, send } = fakeSender([false]);
    expect(await deliverFeedback(bug, send, settings)).toEqual({ ok: false, reason: "send-failed" });
    expect(sent).toHaveLength(1);
  });

  it("still succeeds if only the confirmation fails (the team has the feedback)", async () => {
    const { send } = fakeSender([true, false]);
    expect(await deliverFeedback(bug, send, settings)).toEqual({ ok: true, confirmationSent: false });
  });

  it("returns a safe error without sending when settings are missing", async () => {
    const { sent, send } = fakeSender();
    expect(await deliverFeedback(bug, send, null)).toEqual({ ok: false, reason: "not-configured" });
    expect(await deliverFeedback(bug, null, settings)).toEqual({ ok: false, reason: "not-configured" });
    expect(sent).toHaveLength(0);
  });
});

describe("daily cap on confirmation emails", () => {
  it("defaults to 50 a day", async () => {
    const limiter = createConfirmationLimiter();
    for (let i = 0; i < 50; i++) expect(limiter.check("all").allowed).toBe(true);
    expect(limiter.check("all").allowed).toBe(false);
  });

  it("once the cap is reached, still notifies support but skips the confirmation", async () => {
    const limiter = createConfirmationLimiter(2);
    const { sent, send } = fakeSender([true, true, true, true, true, true]);

    for (let i = 0; i < 2; i++) {
      expect(await deliverFeedback(bug, send, settings, limiter)).toEqual({ ok: true, confirmationSent: true });
    }
    expect(await deliverFeedback(bug, send, settings, limiter)).toEqual({ ok: true, confirmationSent: false });

    // 2 × (notification + confirmation), then the notification alone.
    expect(sent.map((e) => e.to)).toEqual([
      "support@vyuhika.com",
      "priya@example.com",
      "support@vyuhika.com",
      "priya@example.com",
      "support@vyuhika.com",
    ]);
  });

  it("feedback without an email doesn't use up the cap", async () => {
    const limiter = createConfirmationLimiter(1);
    const { send } = fakeSender();
    await deliverFeedback({ ...bug, email: undefined }, send, settings, limiter);
    await deliverFeedback({ ...bug, email: undefined }, send, settings, limiter);
    expect(await deliverFeedback(bug, send, settings, limiter)).toEqual({ ok: true, confirmationSent: true });
  });

  it("the cap is shared by everyone, not counted per visitor", async () => {
    const limiter = createConfirmationLimiter(1);
    const { send } = fakeSender();
    await deliverFeedback(bug, send, settings, limiter);
    const otherVisitor = { ...bug, email: "someone.else@example.com" };
    expect(await deliverFeedback(otherVisitor, send, settings, limiter)).toEqual({ ok: true, confirmationSent: false });
  });
});

describe("getEmailSettings", () => {
  it("reads all three variables and trims a trailing slash from the base URL", () => {
    expect(
      getEmailSettings({
        EMAIL_FROM: "Vyuhika Apps <no_reply@vyuhika.com>",
        FEEDBACK_TO_EMAIL: "support@vyuhika.com",
        EMAIL_ASSET_BASE_URL: "https://apps.vyuhika.com/",
      }),
    ).toEqual(settings);
  });

  it("returns null when any variable is missing", () => {
    expect(getEmailSettings({ EMAIL_FROM: "a@b.co", FEEDBACK_TO_EMAIL: "c@d.co" })).toBeNull();
    expect(getEmailSettings({})).toBeNull();
  });
});
