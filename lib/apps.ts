// The list of apps shown on the marketplace home page.
// To add a new app, add one entry here.
// An app is either internal (a page at /apps/<slug> on this site) or external (it has an `externalUrl`
// on another site, and its card opens that site in a new tab).

export type Category = "Careers" | "Finance" | "Daily life" | "Developer tools" | "Business";

// "freemium" means free to start, with a paid tier.
export type Pricing = "free" | "pro" | "freemium";

export type AppIconName = "match" | "letter" | "interview" | "wallet";

export type AppInfo = {
  slug: string;
  name: string;
  description: string;
  category: Category;
  pricing: Pricing;
  icon: AppIconName;
  status: "live" | "coming-soon";
  externalUrl?: string; // set for apps that live on another site (https only)
};

export const apps: AppInfo[] = [
  {
    slug: "resume-matcher",
    name: "Resume Matcher",
    description:
      "Paste your resume and a job description. See your match score, the skills you're missing, and what to change.",
    category: "Careers",
    pricing: "free",
    icon: "match",
    status: "live",
  },
  {
    slug: "cover-letter-writer",
    name: "Cover Letter Writer",
    description:
      "Upload your resume, paste a job, and get a draft that only uses facts from your resume, with blanks where you add your own examples.",
    category: "Careers",
    pricing: "free",
    icon: "letter",
    status: "live",
  },
  {
    slug: "koshvia",
    name: "Koshvia",
    description:
      "Track your personal and business budgets and investments in one place. Free to start, with a paid tier for more.",
    category: "Finance",
    pricing: "freemium",
    icon: "wallet",
    status: "live",
    externalUrl: "https://koshvia.vyuhika.com",
  },
  {
    slug: "interview-coach",
    name: "Interview Coach",
    description:
      "Practice answers to questions for the role you're applying to, with feedback on each one.",
    category: "Careers",
    pricing: "pro",
    icon: "interview",
    status: "coming-soon",
  },
];

export function isExternal(app: AppInfo): boolean {
  return app.externalUrl !== undefined;
}

// Where the card goes: the other site for an external app, otherwise the app's page on this site.
export function appHref(app: AppInfo): string {
  return app.externalUrl ?? `/apps/${app.slug}`;
}

// The words on the pricing badge.
export function pricingLabel(pricing: Pricing): string {
  return { free: "Free", pro: "Pro", freemium: "Free + Pro" }[pricing];
}
