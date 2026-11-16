import type { MetadataRoute } from "next";
import { apps, appHref, isExternal } from "@/lib/apps";
import { site } from "@/lib/site";

// /sitemap.xml: the home page and every live app on this site. Coming-soon apps have no page yet, external apps
// (like Koshvia) live on another site, and /dev/ is never listed.
export default function sitemap(): MetadataRoute.Sitemap {
  const paths = ["/", ...apps.filter((app) => app.status === "live" && !isExternal(app)).map(appHref)];
  return paths.map((path) => ({ url: `${site.url}${path === "/" ? "" : path}` }));
}
