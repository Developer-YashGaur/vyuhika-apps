import { appContent } from "@/lib/app-content";
import { apps, appHref, isExternal } from "@/lib/apps";
import { sitePages } from "@/lib/legal";
import { site } from "@/lib/site";

// /llms.txt: a plain-text summary of the site for AI assistants and AI search tools (the same idea as robots.txt, but
// for readers instead of crawlers). Built from the same lists as the sitemap, so it always matches the real pages.
export function llmsText(): string {
  const live = apps.filter((a) => a.status === "live");
  const lines = [
    `# ${site.name} Apps`,
    "",
    `> ${site.tagline} Vyuhika Apps is a set of useful web tools, some free and some paid, built in public by ${site.owner.name} at Vyuhika Technologies (India).`,
    "",
    "## Apps",
    "",
    ...live.map((a) => {
      const url = isExternal(a) ? a.externalUrl : `${site.url}${appHref(a)}`;
      const more = appContent[a.slug]?.whatItDoes;
      return `- [${a.name}](${url}): ${a.description}${more ? "" : ""}`;
    }),
    "",
    "## About and policies",
    "",
    ...sitePages.map((p) => `- [${p.title}](${site.url}${p.path}): ${p.description}`),
    "",
    "## Facts",
    "",
    "- Resume Matcher and Cover Letter Writer are free and need no signup.",
    "- Dwaar helps job seekers ask employees at a company for a referral. Employees must confirm their work email. Dwaar does not promise a referral or a job.",
    "- Match scores are AI estimates, not the way any real employer scores a candidate.",
    `- Contact: support@vyuhika.com. Site: ${site.url}`,
    "",
  ];
  return lines.join("\n");
}
