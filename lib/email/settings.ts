// Email settings, read from environment variables (.env.local locally, Vercel's settings in production).
// None of these are secret; the Resend API key is read separately in lib/feedback/deliver.ts.

export type EmailSettings = {
  from: string; // EMAIL_FROM, e.g. "Vyuhika Apps <no_reply@vyuhika.com>" (must use a domain verified in Resend)
  feedbackTo: string; // FEEDBACK_TO_EMAIL, where feedback notifications go
  assetBaseUrl: string; // EMAIL_ASSET_BASE_URL, the public site that serves /email/* images (no trailing slash)
};

// Returns null if any setting is missing, so callers can fail safely instead of crashing.
export function getEmailSettings(env: Record<string, string | undefined> = process.env): EmailSettings | null {
  const from = env.EMAIL_FROM?.trim();
  const feedbackTo = env.FEEDBACK_TO_EMAIL?.trim();
  const assetBaseUrl = env.EMAIL_ASSET_BASE_URL?.trim().replace(/\/+$/, "");
  if (!from || !feedbackTo || !assetBaseUrl) return null;
  return { from, feedbackTo, assetBaseUrl };
}
