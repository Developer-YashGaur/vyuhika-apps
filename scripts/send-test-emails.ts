// Sends one real test of each feedback email template through Resend.
// Run with: npm run email:test            (sends to FEEDBACK_TO_EMAIL)
//      or:  npm run email:test -- you@example.com
//
// Images point at EMAIL_ASSET_BASE_URL, so they only show once public/email/ is deployed there.
//
// The code lives in main() because tsx runs this .ts file as CommonJS, which doesn't allow
// `await` at the top level.

import { Resend } from "resend";
import { getEmailSettings } from "@/lib/email/settings";
import { sampleFeedback } from "@/lib/feedback/email-samples";
import { buildConfirmationEmail, buildNotificationEmail } from "@/lib/feedback/emails";

async function main() {
  const settings = getEmailSettings();
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!settings || !apiKey) {
    throw new Error(
      "Missing settings. Add RESEND_API_KEY, EMAIL_FROM, FEEDBACK_TO_EMAIL and EMAIL_ASSET_BASE_URL to .env.local.",
    );
  }

  const to = process.argv[2]?.trim() || settings.feedbackTo;
  const resend = new Resend(apiKey);
  const feedback = sampleFeedback["wrong-result"];

  const emails = [
    { name: "notification", ...(await buildNotificationEmail(feedback, settings.assetBaseUrl)) },
    { name: "confirmation", ...(await buildConfirmationEmail(feedback, settings.assetBaseUrl)) },
  ];

  let failures = 0;
  for (const email of emails) {
    const { data, error } = await resend.emails.send({
      from: settings.from,
      to: [to],
      subject: `[Test] ${email.subject}`,
      html: email.html,
      text: email.text,
    });
    if (error) {
      failures++;
      console.error(`${email.name}: failed (${error.name}: ${error.message})`);
    } else {
      console.log(`${email.name}: sent to ${to} (id ${data?.id})`);
    }
  }

  if (failures > 0) throw new Error(`${failures} of ${emails.length} test emails failed.`);
}

main().catch((error: unknown) => {
  // Print only the message: never the whole error object, which could include request details.
  console.error(`Test emails not sent: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
