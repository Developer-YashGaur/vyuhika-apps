// The Vyuhika Apps logo (the "hex ring": a solid hexagon with a node on each corner and a V-shaped
// window that points down to a glowing core node). The files are made by `npm run brand`
// (scripts/generate-brand.ts) and live in public/brand/.

export const BRAND_COLORS = {
  space: "#050816", // deep-space background
  cyan: "#22d3ee",
  violet: "#8b5cf6",
  ink: "#eef2fb", // text on dark
  // Deeper shades used on light backgrounds, where the neon colours are too faint.
  cyanDeep: "#0891b2",
  violetDeep: "#7c3aed",
} as const;

export const LOGO_LAYOUTS = ["icon", "horizontal", "stacked"] as const;

export const LOGO_VARIANTS = [
  { id: "color", label: "Full colour, for dark backgrounds" },
  { id: "flat", label: "Flat colour (no gradients), for dark backgrounds" },
  { id: "light", label: "Colour, for light backgrounds" },
  { id: "white", label: "One colour, white" },
  { id: "dark", label: "One colour, deep space" },
] as const;

export type LogoLayout = (typeof LOGO_LAYOUTS)[number];
export type LogoVariant = (typeof LOGO_VARIANTS)[number]["id"];

// Public URL of a logo file, e.g. /brand/vyuhika-horizontal-color.svg
export function logoSrc(layout: LogoLayout, variant: LogoVariant = "color"): string {
  return `/brand/vyuhika-${layout}-${variant}.svg`;
}

// Every image the site and emails use, so tests can check they all exist.
export const BRAND_FILES = {
  appIcon: "/brand/vyuhika-app-icon.svg", // icon on a deep-space tile (favicon source)
  ogDefault: "/og/vyuhika.png",
  ogResumeMatcher: "/og/resume-matcher.png",
  manifestIcons: ["/icons/icon-192.png", "/icons/icon-512.png", "/icons/icon-maskable-512.png"],
  email: ["/email/header.png", "/email/header.gif", "/email/logo-icon.png"],
  kit: ["/brand/kit/avatar-1024.png", "/brand/kit/icon-512.png", "/brand/kit/banner-1200x300.png"],
} as const;

export const OG_IMAGE_SIZE = { width: 1200, height: 630 } as const;
