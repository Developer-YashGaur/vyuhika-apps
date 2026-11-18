import type { Metadata, Viewport } from "next";
import { BRAND_COLORS, BRAND_FILES, OG_IMAGE_SIZE } from "@/lib/brand/logo";
import { site } from "@/lib/site";

// Page titles, descriptions and share images (Open Graph and Twitter cards).
// Kept here, not in the layout, so tests can check them.

const siteName = "Vyuhika Apps";
const description = `Useful digital tools, some free and some paid. ${site.tagline}`;

// Optional: lets Google Search Console check that you own the site, with a meta tag. It is only added when the
// GOOGLE_SITE_VERIFICATION environment variable is set (the code from Search Console, nothing else).
export function siteVerification(code: string | undefined): Metadata["verification"] {
  const trimmed = code?.trim();
  return trimmed ? { google: trimmed } : undefined;
}

export const siteMetadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: siteName, template: `%s | ${siteName}` },
  description,
  applicationName: siteName,
  verification: siteVerification(process.env.GOOGLE_SITE_VERIFICATION),
  openGraph: {
    type: "website",
    siteName,
    url: "/",
    title: siteName,
    description,
    locale: "en",
    images: [{ url: BRAND_FILES.ogDefault, ...OG_IMAGE_SIZE, alt: `${siteName}: ${site.tagline}` }],
  },
  twitter: {
    card: "summary_large_image",
    title: siteName,
    description,
    images: [{ url: BRAND_FILES.ogDefault, alt: `${siteName}: ${site.tagline}` }],
  },
};

// The browser's address bar and the phone status bar match the deep-space background.
export const siteViewport: Viewport = {
  themeColor: BRAND_COLORS.space,
  colorScheme: "dark",
};

// One page's metadata: title, description, canonical address and share cards. Open Graph and Twitter settings
// replace the site's rather than merge with them, so each page lists them in full.
// Titles are written out in full (absolute), so the site-name suffix is not added and they stay near 60 characters.
function pageMetadata(page: { path: string; title: string; description: string; image: string; imageAlt: string }): Metadata {
  const { path, title, description, image, imageAlt } = page;
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: `${site.url}${path}` },
    openGraph: {
      type: "website",
      siteName,
      url: path || "/",
      title,
      description,
      locale: "en",
      images: [{ url: image, ...OG_IMAGE_SIZE, alt: imageAlt }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [{ url: image, alt: imageAlt }],
    },
  };
}

export const homeMetadata = pageMetadata({
  path: "",
  title: "Vyuhika Apps: Useful Web Tools, Built in Public",
  description:
    "Free and paid web tools built in public by Yash Gaur: Resume Matcher, Cover Letter Writer, Dwaar for job referrals, and Koshvia for budgets.",
  image: BRAND_FILES.ogDefault,
  imageAlt: `${siteName}: ${site.tagline}`,
});

export const resumeMatcherMetadata = pageMetadata({
  path: "/apps/resume-matcher",
  title: "Free Resume Matcher: Compare Resume to Job Description",
  description:
    "Paste your resume and a job description to get a match score, the keywords you are missing and three changes to make. Free, no signup.",
  image: BRAND_FILES.ogResumeMatcher,
  imageAlt: "Resume Matcher by Vyuhika Apps",
});

export const coverLetterWriterMetadata = pageMetadata({
  path: "/apps/cover-letter-writer",
  title: "Free Cover Letter Writer: From Resume and Job Description",
  description:
    "Write a cover letter from your resume and a job description. It only uses facts from your resume and leaves blanks for your own examples. Free.",
  image: BRAND_FILES.ogCoverLetterWriter,
  imageAlt: "Cover Letter Writer by Vyuhika Apps",
});

// Dwaar's public front page. The pages behind sign-in stay out of search engines (see lib/dwaar/metadata.ts).
export const dwaarFrontMetadata = pageMetadata({
  path: "/apps/dwaar",
  title: "Dwaar: Ask for a Job Referral | Vyuhika Apps",
  description: "Ask employees at a company for a job referral. Add your resume, check your match score and chat with the employee who accepts.",
  image: BRAND_FILES.ogDwaar,
  imageAlt: "Dwaar by Vyuhika Apps: ask for a job referral",
});

// Metadata for the About, Terms, Privacy, Refunds, Cookies and Contact pages (the list is in lib/legal.ts).
export function sitePageMetadata(page: { path: string; title: string; description: string }): Metadata {
  return pageMetadata({
    path: page.path,
    title: `${page.title} | Vyuhika Apps`,
    description: page.description,
    image: BRAND_FILES.ogDefault,
    imageAlt: `${siteName}: ${site.tagline}`,
  });
}
