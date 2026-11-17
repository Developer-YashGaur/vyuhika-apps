import { Heading, Link, Section, Text } from "@react-email/components";
import EmailLayout, { colors } from "@/components/emails/EmailLayout";
import type { StatusEmailContent } from "@/lib/dwaar/status-email-text";

// One template for the status emails: your request was accepted, a new chat message, a reply. The words come from
// lib/dwaar/status-email-text.ts. It shows the role and company, a button to the chat, and a short privacy note.

export default function StatusEmail({ content, assetBaseUrl }: { content: StatusEmailContent; assetBaseUrl: string }) {
  return (
    <EmailLayout preview={content.preview} assetBaseUrl={assetBaseUrl} headerImage="header.png" headerAlt="Vyuhika Apps" footer={<>{content.footer}</>}>
      <Heading
        as="h1"
        className="email-title"
        style={{ margin: 0, fontSize: "28px", lineHeight: "36px", fontWeight: 700, color: colors.ink }}
      >
        {content.heading}
      </Heading>
      <Text style={{ margin: "14px 0 0", fontSize: "16px", lineHeight: "26px", color: colors.mist }}>{content.intro}</Text>

      <Section
        bgcolor="#080c22"
        style={{
          marginTop: "22px",
          backgroundColor: "#080c22",
          border: `1px solid ${colors.cardBorder}`,
          borderTop: `3px solid ${colors.cyan}`,
          borderRadius: "12px",
          padding: "18px",
        }}
      >
        <Text style={{ margin: 0, fontSize: "13px", letterSpacing: "2px", textTransform: "uppercase", color: colors.mist }}>
          {content.roleLabel}
        </Text>
        <Text style={{ margin: "6px 0 0", fontSize: "20px", lineHeight: "28px", fontWeight: 700, color: colors.ink }}>
          {content.jobTitle}
        </Text>
        <Text style={{ margin: "6px 0 0", fontSize: "15px", lineHeight: "22px", color: colors.mist }}>{content.company}</Text>
      </Section>

      <Section style={{ marginTop: "24px" }}>
        <Link
          href={content.link}
          style={{
            display: "inline-block",
            backgroundColor: colors.cyan,
            color: "#031018",
            fontWeight: 700,
            fontSize: "16px",
            textDecoration: "none",
            padding: "14px 26px",
            borderRadius: "999px",
          }}
        >
          {content.buttonLabel}
        </Link>
      </Section>

      <Text style={{ margin: "22px 0 0", fontSize: "15px", lineHeight: "24px", color: colors.mist }}>{content.note}</Text>
    </EmailLayout>
  );
}
