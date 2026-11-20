import { Heading, Link, Section, Text } from "@react-email/components";
import EmailLayout, { colors } from "@/components/emails/EmailLayout";
import { jobsPageUrl, type AlertJob } from "@/lib/dwaar/job-alert-text";

// Sent to Plus members who turned on job alerts. Up to 5 new jobs that match their words.
type Props = { keywords: string; jobs: AlertJob[]; assetBaseUrl: string };

export default function JobAlertEmail({ keywords, jobs, assetBaseUrl }: Props) {
  return (
    <EmailLayout
      preview={`New jobs for ${keywords}`}
      assetBaseUrl={assetBaseUrl}
      headerImage="header.png"
      headerAlt="Vyuhika Apps"
      footer={<>You get this because you turned on job alerts in Dwaar Plus. You can change or turn them off on the Latest jobs page.</>}
    >
      <Heading as="h1" className="email-title" style={{ margin: 0, fontSize: "28px", lineHeight: "36px", fontWeight: 700, color: colors.ink }}>
        New jobs for you
      </Heading>
      <Text style={{ margin: "14px 0 0", fontSize: "16px", lineHeight: "26px", color: colors.mist }}>{`Your alert: ${keywords}`}</Text>
      {jobs.map((j) => (
        <Section key={j.url} style={{ marginTop: "16px", border: `1px solid ${colors.cardBorder}`, borderRadius: "12px", padding: "14px 16px" }}>
          <Link href={j.url} style={{ fontSize: "17px", fontWeight: 700, color: colors.ink, textDecoration: "none" }}>
            {j.title}
          </Link>
          <Text style={{ margin: "4px 0 0", fontSize: "14px", color: colors.mist }}>{`${j.company}${j.location ? ` · ${j.location}` : ""}`}</Text>
        </Section>
      ))}
      <Section style={{ marginTop: "24px" }}>
        <Link href={jobsPageUrl(assetBaseUrl)} style={{ display: "inline-block", backgroundColor: colors.cyan, color: "#031018", fontWeight: 700, fontSize: "16px", textDecoration: "none", padding: "14px 26px", borderRadius: "999px" }}>
          See all jobs
        </Link>
      </Section>
    </EmailLayout>
  );
}
