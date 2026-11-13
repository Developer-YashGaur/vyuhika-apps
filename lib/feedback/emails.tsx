import { render } from "@react-email/components";
import FeedbackConfirmationEmail, { CONFIRMATION_EXCERPT_CHARS } from "@/components/emails/FeedbackConfirmationEmail";
import FeedbackNotificationEmail from "@/components/emails/FeedbackNotificationEmail";
import {
  CONFIRMATION_SUBJECT,
  confirmationText,
  notificationSubject,
  notificationText,
} from "@/lib/feedback/email-text";
import type { Feedback } from "@/lib/feedback/schema";

// Turns feedback into ready-to-send emails: subject, HTML (from the React Email templates) and plain text.
// React escapes everything it renders, so user text can never become HTML or script.

export type BuiltEmail = { subject: string; html: string; text: string };

export async function buildNotificationEmail(
  feedback: Feedback,
  assetBaseUrl: string,
  receivedAt = new Date(),
): Promise<BuiltEmail> {
  return {
    subject: notificationSubject(feedback),
    html: await render(
      <FeedbackNotificationEmail feedback={feedback} assetBaseUrl={assetBaseUrl} receivedAt={receivedAt} />,
    ),
    text: notificationText(feedback, receivedAt),
  };
}

export async function buildConfirmationEmail(feedback: Feedback, assetBaseUrl: string): Promise<BuiltEmail> {
  return {
    subject: CONFIRMATION_SUBJECT,
    html: await render(<FeedbackConfirmationEmail feedback={feedback} assetBaseUrl={assetBaseUrl} />),
    text: confirmationText(feedback, assetBaseUrl, CONFIRMATION_EXCERPT_CHARS),
  };
}
