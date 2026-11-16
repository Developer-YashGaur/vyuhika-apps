import { FEEDBACK_TYPES, type LetterFeedbackDebug } from "@/lib/feedback/rules";
import type { Feedback } from "@/lib/feedback/schema";
import { site } from "@/lib/site";

// Small text helpers for the feedback emails, plus the plain-text versions of both emails
// (sent alongside the HTML for clients and people that prefer plain text).

export const SUBJECT_EXCERPT_CHARS = 50;

// The brand line at the end of every plain-text email (the HTML version shows the logo beside it).
export const BRAND_LINE = `Vyuhika Apps: ${site.tagline}`;

export function feedbackTypeLabel(type: Feedback["type"]): string {
  return FEEDBACK_TYPES.find((t) => t.value === type)?.label ?? type;
}

// Shortens text to at most `max` characters, adding "…" when it was cut.
export function excerpt(text: string, max: number): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max).trimEnd()}…`;
}

// The labelled lines of the cover letter app's debug block (the HTML email shows the same rows).
// Only settings, counts and yes/no answers: this is all the schema lets through.
export function letterDebugRows(debug: LetterFeedbackDebug): [string, string][] {
  const yesNo = (value: boolean) => (value ? "yes" : "no");
  return [
    ["Tone", debug.tone],
    ["Length", debug.length],
    ["Words in letter", String(debug.wordCount)],
    ["Blanks left", String(debug.blanks)],
    ["Company filled in", yesNo(debug.companyFilled)],
    ["Role filled in", yesNo(debug.roleFilled)],
    ["Highlight filled in", yesNo(debug.highlightFilled)],
    ["Highlight handling", debug.highlightHandling],
    ["Server notes", debug.notes.join(", ") || "none"],
  ];
}

export const LETTER_DEBUG_TITLE = "Settings and counts shared by the visitor (their resume, job text and letter are never included)";

// e.g. "[Vyuhika] Bug: The upload button does nothing on my phone…"
// Line breaks and repeated spaces are collapsed, since a subject must be one line.
export function notificationSubject(feedback: Feedback): string {
  const oneLine = feedback.message.replace(/\s+/g, " ");
  return `[Vyuhika] ${feedbackTypeLabel(feedback.type)}: ${excerpt(oneLine, SUBJECT_EXCERPT_CHARS)}`;
}

export const CONFIRMATION_SUBJECT = "Thanks, we got your feedback";

// e.g. "13 Nov 2026, 10:49 UTC". Always UTC, so every email shows the same clock.
export function formatEmailTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return `${new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  }).format(date)} UTC`;
}

export function notificationText(feedback: Feedback, receivedAt: Date): string {
  const lines = [
    `New feedback: ${feedbackTypeLabel(feedback.type)}`,
    "",
    feedback.message,
    "",
    `Page: ${feedback.context.path}`,
    `Sent: ${formatEmailTime(feedback.context.timestamp)}`,
    `Received: ${formatEmailTime(receivedAt.toISOString())}`,
    `Screen: ${feedback.context.browser}`,
    `Reply to: ${feedback.email ?? "Not given"}`,
  ];
  if (feedback.letterDebug) {
    lines.push("", `${LETTER_DEBUG_TITLE}:`, ...letterDebugRows(feedback.letterDebug).map(([name, value]) => `${name}: ${value}`));
  }
  if (feedback.debug) {
    lines.push(
      "",
      "Result shared by the visitor (their resume and job text are never included):",
      `Score: ${feedback.debug.score} / 100`,
      `Summary: ${feedback.debug.summary}`,
      `Matched: ${feedback.debug.matchedKeywords.join(", ") || "none"}`,
      `Missing: ${feedback.debug.missingKeywords.join(", ") || "none"}`,
    );
  }
  lines.push("", "Sent automatically from the feedback form on Vyuhika Apps.", "", "--", BRAND_LINE);
  return lines.join("\n");
}

export const LETTER_CONFIRMATION_LINE =
  "You also shared your letter settings and counts (not your resume, job text or letter).";

export function confirmationText(feedback: Feedback, siteUrl: string, excerptChars: number): string {
  const lines = [
    "Thanks, we got your feedback",
    "",
    "Thank you for taking the time to tell us what you think. Here's a short summary of what you sent.",
    "",
    `${feedbackTypeLabel(feedback.type)} on ${feedback.context.path}`,
    excerpt(feedback.message, excerptChars),
  ];
  if (feedback.debug) lines.push("You also shared your match score and keywords (not your resume or the job text).");
  if (feedback.letterDebug) lines.push(LETTER_CONFIRMATION_LINE);
  lines.push(
    "",
    "We read every message. If you asked a question, we'll reply to this address.",
    "",
    `Back to Vyuhika Apps: ${siteUrl}`,
    "",
    "--",
    BRAND_LINE,
    "You're receiving this email because you sent feedback on Vyuhika Apps and included your email address. We won't add you to any mailing list.",
    `Built by ${site.owner.name}: ${site.owner.portfolio}`,
  );
  return lines.join("\n");
}
