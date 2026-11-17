import type { Metadata } from "next";

// Dwaar is not public yet: its pages are not linked from the home page and ask search engines to skip them.
// Remove `robots` here (and add Dwaar to lib/apps.ts) only when the owner approves the launch.
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
