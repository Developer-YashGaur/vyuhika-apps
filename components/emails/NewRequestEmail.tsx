import { Heading, Link, Section, Text } from "@react-email/components";
import EmailLayout, { colors } from "@/components/emails/EmailLayout";
import { inboxUrl } from "@/lib/dwaar/request-email-text";

// Sent to confirmed referral providers when a candidate asks for a referral at their company.
// It says only the role and the company. The candidate's details stay behind the sign-in on the employee desk.

type Props = { jobTitle: string; company: string; assetBaseUrl: string };

export default function NewRequestEmail({ jobTitle, company, assetBaseUrl }: Props) {
  const link = inboxUrl(assetBaseUrl);
  return (
    <EmailLayout
      preview={`A candidate asked for a referral at ${company}`}
      assetBaseUrl={assetBaseUrl}
      headerImage="header.png"
      headerAlt="Vyuhika Apps"
      footer={
        <>
          You get this because you are a confirmed referral provider at {company} on Dwaar. We send at most 3 of these emails a
          day.
        </>
      }
    >
      <Heading
        as="h1"
        className="email-title"
        style={{ margin: 0, fontSize: "28px", lineHeight: "36px", fontWeight: 700, color: colors.ink }}
      >
        Someone is asking for a referral
      </Heading>
      <Text style={{ margin: "14px 0 0", fontSize: "16px", lineHeight: "26px", color: colors.mist }}>
        {`A candidate asked for a referral at ${company}.`}
      </Text>

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
          Role
        </Text>
        <Text style={{ margin: "6px 0 0", fontSize: "20px", lineHeight: "28px", fontWeight: 700, color: colors.ink }}>
          {jobTitle}
        </Text>
      </Section>

      <Section style={{ marginTop: "24px" }}>
        <Link
          href={link}
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
          Open your employee desk
        </Link>
      </Section>

      <Text style={{ margin: "22px 0 0", fontSize: "15px", lineHeight: "24px", color: colors.mist }}>
        You decide whether to accept. If you accept, the candidate can send you one message inside Dwaar and you can reply there. Email addresses are never shared.
      </Text>
    </EmailLayout>
  );
}
