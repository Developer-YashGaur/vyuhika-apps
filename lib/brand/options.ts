// The logo options being explored, and the file names for every version of each.
// Used by the generator (scripts/generate-logo-options.ts), the /dev/logo preview and the tests.
// The SVG files live in public/brand/options/.

export const LOGO_OPTIONS = [
  {
    slug: "a-v-formation",
    letter: "A",
    name: "V formation",
    idea: "Five nodes in a V, joined by lines, converging on one glowing core node.",
  },
  {
    slug: "b-hex-ring",
    letter: "B",
    name: "Hex ring",
    idea: "A solid hexagon with a node on each corner and a V-shaped window cut inside it. The V points down to the glowing core node.",
  },
  {
    slug: "c-converging-chevron",
    letter: "C",
    name: "Converging chevron",
    idea: "Each arm of the V is a formation of two thick capsule segments flowing into a bright core node. The boldest at small sizes.",
  },
] as const;

export const LOGO_LAYOUTS = ["icon", "horizontal", "stacked"] as const;

// color: gradients, for dark backgrounds. flat: the same without gradients (fallback).
// light: deeper brand shades for light backgrounds. mono-*: a single colour.
export const LOGO_VARIANTS = [
  { id: "color", label: "Colour (dark backgrounds)", background: "dark" },
  { id: "flat", label: "Flat fallback (dark backgrounds)", background: "dark" },
  { id: "light", label: "Colour (light backgrounds)", background: "light" },
  { id: "mono-white", label: "One colour, white", background: "dark" },
  { id: "mono-black", label: "One colour, deep space", background: "light" },
] as const;

export type LogoSlug = (typeof LOGO_OPTIONS)[number]["slug"];
export type LogoLayout = (typeof LOGO_LAYOUTS)[number];
export type LogoVariant = (typeof LOGO_VARIANTS)[number]["id"];

export function logoFileName(slug: LogoSlug, layout: LogoLayout, variant: LogoVariant): string {
  return `${slug}-${layout}-${variant}.svg`;
}

export const LOGO_DIR = "brand/options"; // inside public/
