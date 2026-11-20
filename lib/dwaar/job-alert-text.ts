// The words in the "new jobs for you" email. Kept apart from the template so the plain-text and HTML versions say the same thing.

export type AlertJob = { title: string; company: string; location: string; url: string };

export const JOB_ALERT_SUBJECT = "New jobs that match your Dwaar alert";

export function jobsPageUrl(assetBaseUrl: string): string {
  return `${assetBaseUrl.replace(/\/+$/, "")}/apps/dwaar/jobs`;
}

// The jobs come from the database as JSON. Only well-formed https entries are used.
export function parseAlertJobs(value: unknown): AlertJob[] {
  if (!Array.isArray(value)) return [];
  const jobs: AlertJob[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const { title, company, location, url } = item as Record<string, unknown>;
    if (typeof title !== "string" || typeof company !== "string" || typeof url !== "string") continue;
    if (!/^https:\/\/[^\s]+$/.test(url)) continue;
    jobs.push({ title: title.slice(0, 160), company: company.slice(0, 120), location: typeof location === "string" ? location.slice(0, 120) : "", url });
  }
  return jobs.slice(0, 5);
}

export function jobAlertText(keywords: string, jobs: AlertJob[], assetBaseUrl: string): string {
  return [
    `New jobs for your alert: ${keywords}`,
    "",
    ...jobs.map((j) => `- ${j.title} at ${j.company}${j.location ? ` (${j.location})` : ""}\n  ${j.url}`),
    "",
    `See all jobs and ask for a referral: ${jobsPageUrl(assetBaseUrl)}`,
    "",
    "You get this because you turned on job alerts in Dwaar Plus. You can change or turn them off on the Latest jobs page.",
    "",
    "Vyuhika Apps: Intelligence, built in public.",
  ].join("\n");
}
