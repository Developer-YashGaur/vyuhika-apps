import "server-only"; // keeps the Resend key out of browser code
import { Resend } from "resend";
import { getEmailSettings, type EmailSettings } from "@/lib/email/settings";
import { buildConfirmationEmail, buildNotificationEmail } from "@/lib/feedback/emails";
import type { Feedback } from "@/lib/feedback/schema";
import { DAY_MS, createRateLimiter } from "@/lib/rate-limit";

// Delivers feedback by email through Resend:
// 1. a notification to FEEDBACK_TO_EMAIL (reply-to set to the visitor, if they left an email);
// 2. then, only if that worked and the visitor left an email, a short confirmation to them.
// This is the only place that knows how feedback is delivered.

// At most this many confirmation emails per 24 hours, across all visitors. Confirmations go to an
// address the visitor typed in, so this caps how much the form could be used to email strangers.
// Like the other limits it's kept in memory, so it resets per server instance (see lib/rate-limit.ts).
export const CONFIRMATIONS_PER_DAY = 50;

export type ConfirmationLimiter = ReturnType<typeof createRateLimiter>;

export function createConfirmationLimiter(max = CONFIRMATIONS_PER_DAY): ConfirmationLimiter {
  return createRateLimiter([{ name: "day", max, windowMs: DAY_MS }]);
}

const confirmationLimiter = createConfirmationLimiter();

export type EmailMessage = {
  from: string;
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
};

// Sends one email; returns true on success. Passed in as a parameter so tests can fake it.
export type SendEmailFn = (email: EmailMessage) => Promise<boolean>;

export type DeliverResult =
  | { ok: true; confirmationSent: boolean }
  | { ok: false; reason: "not-configured" | "send-failed" };

// The real sender, using Resend. Returns null if RESEND_API_KEY is missing.
function createResendSender(): SendEmailFn | null {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return null;
  const resend = new Resend(apiKey);

  return async ({ from, to, subject, html, text, replyTo }) => {
    try {
      const { error } = await resend.emails.send({ from, to: [to], subject, html, text, replyTo });
      if (error) {
        // Log only the error type, never the message content or addresses.
        console.error("[feedback] Resend rejected the email", { name: error.name });
        return false;
      }
      return true;
    } catch (error) {
      console.error("[feedback] Could not reach Resend", { name: (error as Error)?.name });
      return false;
    }
  };
}

export async function deliverFeedback(
  feedback: Feedback,
  send: SendEmailFn | null = createResendSender(),
  settings: EmailSettings | null = getEmailSettings(),
  confirmations: ConfirmationLimiter = confirmationLimiter,
): Promise<DeliverResult> {
  if (!send || !settings) {
    console.error("[feedback] Email is not configured (RESEND_API_KEY, EMAIL_FROM, FEEDBACK_TO_EMAIL, EMAIL_ASSET_BASE_URL)");
    return { ok: false, reason: "not-configured" };
  }

  try {
    const notification = await buildNotificationEmail(feedback, settings.assetBaseUrl);
    const sent = await send({ from: settings.from, to: settings.feedbackTo, replyTo: feedback.email, ...notification });
    if (!sent) return { ok: false, reason: "send-failed" };

    if (!feedback.email) return { ok: true, confirmationSent: false };

    // One shared key: the cap is for the whole site, not per visitor.
    if (!confirmations.check("all").allowed) {
      console.warn("[feedback] Daily confirmation cap reached; skipping the confirmation email");
      return { ok: true, confirmationSent: false };
    }

    // Replies to the confirmation go to the support inbox.
    const confirmation = await buildConfirmationEmail(feedback, settings.assetBaseUrl);
    const confirmationSent = await send({
      from: settings.from,
      to: feedback.email,
      replyTo: settings.feedbackTo,
      ...confirmation,
    });
    // The team already has the feedback, so a failed confirmation doesn't fail the request.
    if (!confirmationSent) console.error("[feedback] Confirmation email failed");
    return { ok: true, confirmationSent };
  } catch (error) {
    console.error("[feedback] Could not build the email", { name: (error as Error)?.name });
    return { ok: false, reason: "send-failed" };
  }
}
