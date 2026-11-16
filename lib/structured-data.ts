import { appContent } from "@/lib/app-content";
import { apps } from "@/lib/apps";
import { BRAND_FILES } from "@/lib/brand/logo";
import { site } from "@/lib/site";

// Structured data (JSON-LD) that tells Google what each page is. Shown to search engines only, never to visitors.
//
// What goes where:
// - Home page: WebSite and Organization.
// - Each app page: SoftwareApplication (a free web app), FAQPage (the same FAQ as the page, from lib/app-content.ts)
//   and BreadcrumbList.
// Nothing else, on purpose: NEVER add ratings, reviews, vote counts or user counts. We have none, and made-up
// ones can get the site penalised by Google. tests/structured-data.test.ts fails if one appears.
//
// To change the words: edit lib/app-content.ts (FAQ) or the app's name and description in lib/apps.ts.

export const ORGANIZATION_NAME = "Vyuhika Apps";

// Currency for the free price (price 0). INR for now: the owner is in India. Change it here if that should be USD or another code.
export const PRICE_CURRENCY = "INR";

const absolute = (path: string) => `${site.url}${path}`;

export type JsonLd = Record<string, unknown>;

export function homeStructuredData(): JsonLd[] {
  return [
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: ORGANIZATION_NAME,
      url: site.url,
      description: `Useful digital tools, some free and some paid. ${site.tagline}`,
      inLanguage: "en",
    },
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: ORGANIZATION_NAME,
      url: site.url,
      logo: absolute(BRAND_FILES.logo),
    },
  ];
}

export function appStructuredData(slug: string): JsonLd[] {
  const app = apps.find((a) => a.slug === slug);
  const content = appContent[slug];
  if (!app || !content) throw new Error(`No app content for "${slug}"`);
  const url = absolute(`/apps/${slug}`);

  return [
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: app.name,
      description: app.description,
      url,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      inLanguage: "en",
      offers: { "@type": "Offer", price: "0", priceCurrency: PRICE_CURRENCY },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: content.faq.map(({ question, answer }) => ({
        "@type": "Question",
        name: question,
        acceptedAnswer: { "@type": "Answer", text: answer },
      })),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: ORGANIZATION_NAME, item: site.url },
        { "@type": "ListItem", position: 2, name: app.name, item: url },
      ],
    },
  ];
}
