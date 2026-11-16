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

const matcherTitle = "Resume Matcher";
const matcherDescription =
  "Paste your resume and a job description. See your match score, the keywords you're missing, and what to change. Free.";

export const resumeMatcherMetadata: Metadata = {
  title: matcherTitle,
  description: matcherDescription,
  // Open Graph and Twitter settings replace the site's, not merge with them, so they're complete here.
  openGraph: {
    type: "website",
    siteName,
    url: "/apps/resume-matcher",
    title: `${matcherTitle} | ${siteName}`,
    description: matcherDescription,
    locale: "en",
    images: [{ url: BRAND_FILES.ogResumeMatcher, ...OG_IMAGE_SIZE, alt: "Resume Matcher by Vyuhika Apps" }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${matcherTitle} | ${siteName}`,
    description: matcherDescription,
    images: [{ url: BRAND_FILES.ogResumeMatcher, alt: "Resume Matcher by Vyuhika Apps" }],
  },
};

const letterTitle = "Cover Letter Writer";
const letterDescription =
  "Paste your resume and a job description. Get a tailored cover letter that only uses what your resume shows, with blanks where you add your own examples. Free.";

export const coverLetterWriterMetadata: Metadata = {
  title: letterTitle,
  description: letterDescription,
  openGraph: {
    type: "website",
    siteName,
    url: "/apps/cover-letter-writer",
    title: `${letterTitle} | ${siteName}`,
    description: letterDescription,
    locale: "en",
    images: [{ url: BRAND_FILES.ogCoverLetterWriter, ...OG_IMAGE_SIZE, alt: "Cover Letter Writer by Vyuhika Apps" }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${letterTitle} | ${siteName}`,
    description: letterDescription,
    images: [{ url: BRAND_FILES.ogCoverLetterWriter, alt: "Cover Letter Writer by Vyuhika Apps" }],
  },
};
