import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

// /robots.txt: every crawler may read the site, except the API and the dev-only pages.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/dev/"] },
    sitemap: `${site.url}/sitemap.xml`,
  };
}
