import type { ReactNode } from "react";
import { Body, Container, Head, Html, Img, Link, Preview, Section, Text } from "@react-email/components";

// Shared frame for every Vyuhika email: dark deep-space background, wordmark, header image and footer.
//
// Email rules followed here (so it works in Gmail, Apple Mail and Outlook):
// - Table-based layout (React Email's Section/Container render tables), 600px wide.
// - Inline styles only, plus solid `bgcolor` fallbacks; no CSS animation, JavaScript or SVG.
// - Images use absolute public URLs and always have alt text.

export const colors = {
  space: "#050816", // page background
  card: "#0d1330", // content card
  cardBorder: "#232b52",
  ink: "#eef2fb", // main text (contrast ≈ 17:1 on the card)
  mist: "#aab4cf", // secondary text (≈ 8.5:1)
  cyan: "#22d3ee",
  violet: "#8b5cf6",
  violetLight: "#c4b5fd",
};

export const font =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Helvetica, Arial, sans-serif";

type Props = {
  preview: string; // the grey line shown after the subject in the inbox
  assetBaseUrl: string;
  headerImage: "header.png" | "header.gif";
  headerAlt: string;
  footer: ReactNode;
  children: ReactNode;
};

export default function EmailLayout({ preview, assetBaseUrl, headerImage, headerAlt, footer, children }: Props) {
  return (
    <Html lang="en" dir="ltr">
      <Head>
        {/* Tells Apple Mail and others the email is designed for a dark background, so they don't invert it. */}
        <meta name="color-scheme" content="dark light" />
        <meta name="supported-color-schemes" content="dark light" />
        <style>{`
          @media (max-width: 620px) {
            .email-pad { padding-left: 20px !important; padding-right: 20px !important; }
            .email-title { font-size: 24px !important; line-height: 32px !important; }
          }
        `}</style>
      </Head>
      <Preview>{preview}</Preview>
      <Body style={{ margin: 0, padding: 0, backgroundColor: colors.space, fontFamily: font }}>
        {/* Full-width background table: `bgcolor` is the fallback for clients that drop CSS. */}
        <Section bgcolor={colors.space} style={{ width: "100%", backgroundColor: colors.space, padding: "24px 0" }}>
          <Container
            bgcolor={colors.space}
            style={{ width: "100%", maxWidth: "600px", backgroundColor: colors.space, margin: "0 auto" }}
          >
            {/* Wordmark as real text, so the brand shows even when images are blocked. */}
            <Section className="email-pad" style={{ padding: "8px 32px 20px" }}>
              <Text
                style={{
                  margin: 0,
                  fontSize: "26px",
                  lineHeight: "32px",
                  fontWeight: 800,
                  letterSpacing: "-0.5px",
                  color: colors.ink,
                  textShadow: "0 0 18px rgba(34, 211, 238, 0.65)",
                }}
              >
                Vyuhika
              </Text>
              <Text style={{ margin: "4px 0 0", fontSize: "13px", lineHeight: "18px", color: colors.mist }}>
                Intelligence, built in public.
              </Text>
            </Section>

            <Img
              src={`${assetBaseUrl}/email/${headerImage}`}
              width="600"
              height="200"
              alt={headerAlt}
              style={{
                display: "block",
                width: "100%",
                maxWidth: "600px",
                height: "auto",
                border: 0,
                borderRadius: "16px 16px 0 0",
                backgroundColor: colors.space,
                // How the alt text looks when images are blocked: centred in the reserved space.
                color: colors.mist,
                fontFamily: font,
                fontSize: "14px",
                lineHeight: "20px",
                textAlign: "center",
              }}
            />

            <Section
              bgcolor={colors.card}
              className="email-pad"
              style={{
                backgroundColor: colors.card,
                border: `1px solid ${colors.cardBorder}`,
                borderTop: `2px solid ${colors.cyan}`,
                borderRadius: "0 0 16px 16px",
                padding: "32px",
              }}
            >
              {children}
            </Section>

            <Section className="email-pad" style={{ padding: "24px 32px 8px" }}>
              <Text style={{ margin: 0, fontSize: "12px", lineHeight: "18px", color: colors.mist }}>{footer}</Text>
              <Text style={{ margin: "8px 0 0", fontSize: "12px", lineHeight: "18px", color: colors.mist }}>
                <Link href={assetBaseUrl} style={{ color: colors.cyan, textDecoration: "underline" }}>
                  {assetBaseUrl.replace(/^https?:\/\//, "")}
                </Link>
              </Text>
            </Section>
          </Container>
        </Section>
      </Body>
    </Html>
  );
}

// Shows text with its line breaks kept. Each line is rendered as React text, so it's always escaped.
export function MultilineText({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <>
      {lines.map((line, i) => (
        <span key={i}>
          {line}
          {i < lines.length - 1 && <br />}
        </span>
      ))}
    </>
  );
}
