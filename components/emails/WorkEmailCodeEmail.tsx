import { Heading, Section, Text } from "@react-email/components";
import EmailLayout, { colors, font } from "@/components/emails/EmailLayout";
import { CODE_MINUTES } from "@/lib/dwaar/work-email-text";

// Sent to a referral provider's work email with the 6-digit code that proves they own the mailbox.
// It has no buttons or links to click, on purpose: the person types the code on the Dwaar page themselves.

type Props = { code: string; assetBaseUrl: string };

export default function WorkEmailCodeEmail({ code, assetBaseUrl }: Props) {
  return (
    <EmailLayout
      preview={`Your Dwaar code is ${code}`}
      assetBaseUrl={assetBaseUrl}
      headerImage="header.png"
      headerAlt="Vyuhika Apps"
      footer={
        <>
          You are receiving this because someone asked to confirm this address as a work email on Dwaar. If that was not
          you, ignore this email and nothing will happen.
        </>
      }
    >
      <Heading
        as="h1"
        className="email-title"
        style={{ margin: 0, fontSize: "28px", lineHeight: "36px", fontWeight: 700, color: colors.ink }}
      >
        Confirm your work email
      </Heading>
      <Text style={{ margin: "14px 0 0", fontSize: "16px", lineHeight: "26px", color: colors.mist }}>
        Type this code on the Dwaar page to confirm that this address is yours.
      </Text>

      <Section
        bgcolor="#080c22"
        style={{
          marginTop: "22px",
          backgroundColor: "#080c22",
          border: `1px solid ${colors.cardBorder}`,
          borderTop: `3px solid ${colors.cyan}`,
          borderRadius: "12px",
          padding: "22px 18px",
          textAlign: "center",
        }}
      >
        <Text
          style={{
            margin: 0,
            fontFamily: `ui-monospace, SFMono-Regular, Menlo, Consolas, ${font}`,
            fontSize: "40px",
            lineHeight: "48px",
            fontWeight: 700,
            letterSpacing: "10px",
            color: colors.ink,
          }}
        >
          {code}
        </Text>
      </Section>

      <Text style={{ margin: "22px 0 0", fontSize: "15px", lineHeight: "24px", color: colors.mist }}>
        {`The code works for ${CODE_MINUTES} minutes. Never share it with anyone. Dwaar will never ask you for it by message or phone.`}
      </Text>
    </EmailLayout>
  );
}
