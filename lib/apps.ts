// The list of apps shown on the marketplace home page.
// To add a new app, add one entry here.

export type Tier = "Free" | "Pro";
export type AppIconName = "match" | "letter" | "interview";

export type AppInfo = {
  slug: string;
  name: string;
  description: string;
  tier: Tier;
  icon: AppIconName;
  status: "live" | "coming-soon";
};

export const apps: AppInfo[] = [
  {
    slug: "resume-matcher",
    name: "Resume Matcher",
    description:
      "Paste your resume and a job description. See your match score, the skills you're missing, and what to change.",
    tier: "Free",
    icon: "match",
    status: "live",
  },
  {
    slug: "cover-letter-writer",
    name: "Cover Letter Writer",
    description:
      "Turn your resume and a job post into a short cover letter in your own voice.",
    tier: "Free",
    icon: "letter",
    status: "coming-soon",
  },
  {
    slug: "interview-coach",
    name: "Interview Coach",
    description:
      "Practice answers to questions for the role you're applying to, with feedback on each one.",
    tier: "Pro",
    icon: "interview",
    status: "coming-soon",
  },
];

export function appHref(app: AppInfo): string {
  return `/apps/${app.slug}`;
}
