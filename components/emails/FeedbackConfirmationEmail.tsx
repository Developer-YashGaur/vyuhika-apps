import { Button, Heading, Section, Text } from "@react-email/components";
import EmailLayout, { MultilineText, colors } from "@/components/emails/EmailLayout";
import type { Feedback } from "@/lib/feedback/schema";
import { excerpt, feedbackTypeLabel } from "@/lib/feedback/email-text";

// Confirmation to the visitor, sent only when they left an email address.
// It repeats only a short excerpt of their message, so the form can't be used to send long texts to others.

export const CONFIRMATION_EXCERPT_CHARS = 200;

type Props = { feedback: Feedback; assetBaseUrl: string };

export default function FeedbackConfirmationEmail({ feedback, assetBaseUrl }: Props) {
  return (
    <EmailLayout
      preview="Thanks for your feedback. We read every message."
      assetBaseUrl={assetBaseUrl}
      headerImage="header.gif"
      headerAlt="Vyuhika: a softly glowing neural network orb on a deep-space background"
      footer="You're receiving this email because you sent feedback on Vyuhika Apps and included your email address. We won't add you to any mailing list."
    >
      <Heading
        as="h1"
        className="email-title"
        style={{ margin: 0, fontSize: "28px", lineHeight: "36px", fontWeight: 700, color: colors.ink }}
      >
        Thanks, we got your feedback
      </Heading>
      <Text style={{ margin: "14px 0 0", fontSize: "16px", lineHeight: "26px", color: colors.mist }}>
        Thank you for taking the time to tell us what you think. Here&apos;s a short summary of what you sent.
      </Text>

      <Section
        bgcolor="#080c22"
        style={{
          marginTop: "22px",
          backgroundColor: "#080c22",
          border: `1px solid ${colors.cardBorder}`,
          borderLeft: `3px solid ${colors.cyan}`,
          borderRadius: "12px",
          padding: "16px 18px",
        }}
      >
        <Text style={{ margin: 0, fontSize: "13px", lineHeight: "20px", color: colors.mist }}>
          {feedbackTypeLabel(feedback.type)} on {feedback.context.path}
        </Text>
        <Text style={{ margin: "8px 0 0", fontSize: "15px", lineHeight: "24px", color: colors.ink }}>
          <MultilineText text={excerpt(feedback.message, CONFIRMATION_EXCERPT_CHARS)} />
        </Text>
        {feedback.debug && (
          <Text style={{ margin: "10px 0 0", fontSize: "13px", lineHeight: "20px", color: colors.mist }}>
            You also shared your match score and keywords (not your resume or the job text).
          </Text>
        )}
      </Section>

      <Text style={{ margin: "22px 0 0", fontSize: "16px", lineHeight: "26px", color: colors.ink }}>
        We read every message. If you asked a question, we&apos;ll reply to this address.
      </Text>

      <Section style={{ marginTop: "28px" }}>
        <Button
          href={assetBaseUrl}
          style={{
            display: "inline-block",
            padding: "14px 28px",
            borderRadius: "999px",
            backgroundColor: colors.cyan,
            border: "1px solid #67e8f9",
            color: colors.space,
            fontSize: "16px",
            lineHeight: "20px",
            fontWeight: 700,
            textDecoration: "none",
            boxShadow: "0 0 24px rgba(34, 211, 238, 0.55), 0 0 48px rgba(139, 92, 246, 0.35)",
          }}
        >
          Back to Vyuhika Apps
        </Button>
      </Section>
    </EmailLayout>
  );
}
