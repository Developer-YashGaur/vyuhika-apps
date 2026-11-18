import type { Metadata } from "next";

// Dwaar is live. Only its public front page (dwaarPublicMetadata) may be found by search engines.
// Every page behind sign-in (profile, requests, inbox, chat, ...) and the draft privacy notice ask search engines to skip them.
export const dwaarPublicMetadata: Metadata = {
  title: { absolute: "Dwaar: ask for a job referral | Vyuhika Apps" },
  description: "Ask employees at a company for a job referral. Add your resume, check your match score and chat with the employee who accepts.",
  alternates: { canonical: "https://apps.vyuhika.com/apps/dwaar" },
};

export const dwaarMetadata: Metadata = {
  title: { absolute: "Dwaar by Vyuhika Apps" },
  description: "Dwaar connects job seekers with employees who can refer them. Early access.",
  robots: { index: false, follow: false },
};

export const dwaarPrivacyMetadata: Metadata = {
  title: { absolute: "Dwaar privacy notice (draft) | Vyuhika Apps" },
  description: "What Dwaar collects, why, and how you can delete it.",
  robots: { index: false, follow: false },
};
