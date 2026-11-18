// The company details and the list of site-wide pages (About, Terms, Privacy, Refunds, Cookies, Contact).
// The footer, the sitemap and each page's title all read from here, so a title or date is changed in one place.
// Details that the owner still has to confirm are written as PLACEHOLDERS below, shown in square brackets on the pages.

export const company = {
  legalName: "Vyuhika Technologies",
  brand: "Vyuhika Apps",
  email: "support@vyuhika.com",
  // TO CONFIRM BEFORE YOU RELY ON THESE PAGES: replace each value with the real one (keep the square brackets away).
  address: "Virtual",
  cin: "NA",
  grievanceOfficer: "NA",
  courts: "NA",
};

export type SitePage = { slug: string; path: string; title: string; description: string; updated: string };

export const sitePages: SitePage[] = [
  {
    slug: "about",
    path: "/about",
    title: "About Vyuhika Apps",
    description: "Vyuhika Apps is a set of useful web tools built in public by Vyuhika Technologies. See who builds them and what we are working on.",
    updated: "2026-11-18",
  },
  {
    slug: "terms",
    path: "/terms",
    title: "Terms of Use",
    description: "The rules for using Vyuhika Apps, Resume Matcher, Cover Letter Writer and Dwaar, in plain words.",
    updated: "2026-11-18",
  },
  {
    slug: "privacy",
    path: "/privacy",
    title: "Privacy Policy",
    description: "What Vyuhika Apps collects, why, who it is shared with, how long it is kept, and how you can ask us to delete it.",
    updated: "2026-11-18",
  },
  {
    slug: "refunds",
    path: "/refunds",
    title: "Refund and Cancellation Policy",
    description: "When you can get a refund for a paid feature on Vyuhika Apps, and how to ask for one.",
    updated: "2026-11-18",
  },
  {
    slug: "cookies",
    path: "/cookies",
    title: "Cookies and Tracking",
    description: "Which cookies and measurement tools Vyuhika Apps uses, and how to control them.",
    updated: "2026-11-18",
  },
  {
    slug: "contact",
    path: "/contact",
    title: "Contact and Grievance Officer",
    description: "How to reach Vyuhika Apps, who our Grievance Officer is, and how we handle complaints.",
    updated: "2026-11-18",
  },
];

export function sitePage(slug: string): SitePage {
  const page = sitePages.find((p) => p.slug === slug);
  if (!page) throw new Error(`No site page "${slug}"`);
  return page;
}
