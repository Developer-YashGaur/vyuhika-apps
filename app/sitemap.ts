import type { MetadataRoute } from "next";
import { apps, appHref } from "@/lib/apps";
import { site } from "@/lib/site";

// /sitemap.xml: the home page and every live app. Coming-soon apps have no page yet, and /dev/ is never listed.
export default function sitemap(): MetadataRoute.Sitemap {
  const paths = ["/", ...apps.filter((app) => app.status === "live").map(appHref)];
  return paths.map((path) => ({ url: `${site.url}${path === "/" ? "" : path}` }));
}
