import type { MetadataRoute } from "next";
import { BRAND_COLORS } from "@/lib/brand/logo";
import { site } from "@/lib/site";

// Web app manifest: how the site looks when it's added to a phone's home screen.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Vyuhika Apps",
    short_name: "Vyuhika",
    description: `Useful AI tools, some free and some paid. ${site.tagline}`,
    start_url: "/",
    display: "standalone",
    background_color: BRAND_COLORS.space,
    theme_color: BRAND_COLORS.space,
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
