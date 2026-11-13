import { Column, Heading, Row, Section, Text } from "@react-email/components";
import EmailLayout, { MultilineText, colors } from "@/components/emails/EmailLayout";
import type { Feedback } from "@/lib/feedback/schema";
import { feedbackTypeLabel, formatEmailTime } from "@/lib/feedback/email-text";

// Internal email to support@: everything needed to understand and reproduce the feedback.
// Only receives the validated Feedback object, which can't hold resume or job text.

// Solid badge colours with dark text, readable in every client.
export const badgeColors: Record<Feedback["type"], string> = {
  bug: "#fb7185",
  "wrong-result": "#fbbf24",
  idea: "#22d3ee",
  other: "#c4b5fd",
};

type Props = { feedback: Feedback; assetBaseUrl: string; receivedAt: Date };

export default function FeedbackNotificationEmail({ feedback, assetBaseUrl, receivedAt }: Props) {
  const label = feedbackTypeLabel(feedback.type);
  const details: [string, string][] = [
    ["Page", feedback.context.path],
    ["Sent", formatEmailTime(feedback.context.timestamp)],
    ["Received", formatEmailTime(receivedAt.toISOString())],
    ["Screen", feedback.context.browser],
    ["Reply to", feedback.email ?? "Not given"],
  ];

  return (
    <EmailLayout
      preview={`${label} on ${feedback.context.path}: ${feedback.message.slice(0, 90)}`}
      assetBaseUrl={assetBaseUrl}
      headerImage="header.png"
      headerAlt="Vyuhika Apps"
      footer="Sent automatically from the feedback form on Vyuhika Apps. Reply to this email to answer the visitor (only if they left an email)."
    >
      <Text
        style={{
          display: "inline-block",
          margin: 0,
          padding: "4px 12px",
          borderRadius: "999px",
          backgroundColor: badgeColors[feedback.type],
          color: colors.space,
          fontSize: "12px",
          lineHeight: "18px",
          fontWeight: 700,
          letterSpacing: "0.3px",
        }}
      >
        {label}
      </Text>
      <Heading
        as="h1"
        className="email-title"
        style={{ margin: "16px 0 0", fontSize: "26px", lineHeight: "34px", fontWeight: 700, color: colors.ink }}
      >
        New feedback
      </Heading>

      <Section
        bgcolor="#080c22"
        style={{
          marginTop: "20px",
          backgroundColor: "#080c22",
          border: `1px solid ${colors.cardBorder}`,
          borderLeft: `3px solid ${colors.violet}`,
          borderRadius: "12px",
          padding: "16px 18px",
        }}
      >
        <Text style={{ margin: 0, fontSize: "16px", lineHeight: "26px", color: colors.ink }}>
          <MultilineText text={feedback.message} />
        </Text>
      </Section>

      <Section style={{ marginTop: "24px" }}>
        {details.map(([name, value]) => (
          <Row key={name}>
            <Column style={{ width: "96px", verticalAlign: "top", padding: "6px 0" }}>
              <Text style={{ margin: 0, fontSize: "13px", lineHeight: "20px", color: colors.mist }}>{name}</Text>
            </Column>
            <Column style={{ verticalAlign: "top", padding: "6px 0" }}>
              <Text style={{ margin: 0, fontSize: "14px", lineHeight: "20px", color: colors.ink, wordBreak: "break-word" }}>
                {value}
              </Text>
            </Column>
          </Row>
        ))}
      </Section>

      {feedback.debug && (
        <Section
          bgcolor="#0f1638"
          style={{
            marginTop: "24px",
            backgroundColor: "#0f1638",
            border: `1px solid ${colors.cardBorder}`,
            borderRadius: "12px",
            padding: "18px",
          }}
        >
          <Text style={{ margin: 0, fontSize: "13px", lineHeight: "20px", color: colors.mist }}>
            Result shared by the visitor (their resume and job text are never included)
          </Text>
          <Text style={{ margin: "10px 0 0", fontSize: "30px", lineHeight: "36px", fontWeight: 800, color: colors.cyan }}>
            {feedback.debug.score}
            <span style={{ fontSize: "16px", color: colors.mist, fontWeight: 600 }}> / 100</span>
          </Text>
          <Text style={{ margin: "6px 0 0", fontSize: "14px", lineHeight: "22px", color: colors.ink }}>
            {feedback.debug.summary}
          </Text>
          <KeywordLine title="Matched" words={feedback.debug.matchedKeywords} color={colors.cyan} />
          <KeywordLine title="Missing" words={feedback.debug.missingKeywords} color={colors.violetLight} />
        </Section>
      )}
    </EmailLayout>
  );
}

function KeywordLine({ title, words, color }: { title: string; words: string[]; color: string }) {
  return (
    <Text style={{ margin: "14px 0 0", fontSize: "13px", lineHeight: "26px", color: colors.mist }}>
      <strong style={{ color: colors.ink }}>{title}: </strong>
      {words.length === 0
        ? "none"
        : words.map((w) => (
            <span
              key={w}
              style={{
                display: "inline-block",
                margin: "0 6px 6px 0",
                padding: "0 10px",
                border: `1px solid ${color}`,
                borderRadius: "999px",
                color,
                lineHeight: "22px",
              }}
            >
              {w}
            </span>
          ))}
    </Text>
  );
}
