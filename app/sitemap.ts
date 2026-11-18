import type { MetadataRoute } from "next";
import { HOME_UPDATED, appContent } from "@/lib/app-content";
import { apps, appHref, isExternal } from "@/lib/apps";
import { sitePages } from "@/lib/legal";
import { site } from "@/lib/site";

// /sitemap.xml: the home page, every live app on this site and the About, Terms, Privacy, Refunds, Cookies and Contact pages. Coming-soon apps have no page yet, external apps
// (like Koshvia) live on another site, and /dev/ is never listed.
// lastModified is the real date each page's words last changed (HOME_UPDATED and `updated` in lib/app-content.ts),
// not the build date, so Google is not told that every page changes on every deploy.
export default function sitemap(): MetadataRoute.Sitemap {
  const live = apps.filter((app) => app.status === "live" && !isExternal(app));
  return [
    { url: site.url, lastModified: HOME_UPDATED },
    ...live.map((app) => ({ url: `${site.url}${appHref(app)}`, lastModified: appContent[app.slug].updated })),
    ...sitePages.map((page) => ({ url: `${site.url}${page.path}`, lastModified: page.updated })),
  ];
}
