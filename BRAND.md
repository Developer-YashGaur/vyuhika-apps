# Vyuhika Apps brand guide

*Vyuha* means formation or arrangement in Sanskrit. The logo is a formation of connected nodes: a solid hexagon with a node on each corner and a V-shaped window that points down to one glowing core node.

All files are made by `npm run brand` (`scripts/generate-brand.ts`). Edit the script, not the files.

## Logo files (`public/brand/`)

| Layout | File name | Use for |
|---|---|---|
| Icon | `vyuhika-icon-*.svg` | Small spaces, avatars, app icons |
| Horizontal | `vyuhika-horizontal-*.svg` | Navbars, footers, email headers |
| Stacked | `vyuhika-stacked-*.svg` | Square spaces, splash screens |

Each comes in five versions:

| Version | Suffix | Background |
|---|---|---|
| Full colour (gradients) | `-color` | Dark (preferred) |
| Flat colour, no gradients | `-flat` | Dark, where gradients aren't supported |
| Colour for light backgrounds | `-light` | Light |
| One colour, white | `-white` | Dark or photos |
| One colour, deep space | `-dark` | Light, print, single-colour uses |

Other files:
- **App icon:** `vyuhika-app-icon.svg` is the icon on a deep-space tile, used for favicons.
- **Brand kit (`public/brand/kit/`):**
  - `avatar-1024.png`: social profiles. It keeps the icon inside a circle crop.
  - `icon-512.png`: transparent background.
  - `banner-1200x300.png`

## Colours

| Name | Hex | Use |
|---|---|---|
| Deep space | `#050816` | Backgrounds |
| Neon cyan | `#22d3ee` | Accents, the top of the logo gradient, the core glow |
| Violet | `#8b5cf6` | Accents, the bottom of the logo gradient |
| Ink | `#eef2fb` | Text on dark backgrounds |
| Deep cyan | `#0891b2` | Cyan on light backgrounds (the neon cyan is too faint on white) |
| Deep violet | `#7c3aed` | Violet on light backgrounds |

## Font

**Chakra Petch** (SIL Open Font License 1.1, via Google Fonts / Fontsource):
- Bold (700) for **VYUHIKA**, letter-spaced 0.06 em.
- SemiBold (600) for **APPS**, letter-spaced 0.3 em.

In logo files the letters are outlined shapes, so no font needs to be installed. The website uses Unbounded and Instrument Sans for its own headings and text.

## Usage rules

- **Clear space:** keep empty space around the logo at least the width of one corner node (about 1/6 of the icon's height) on every side.
- **Minimum size:**
  - icon: 16 px (favicons use the dark tile version)
  - horizontal lockup: 24 px tall
  - stacked lockup: 64 px tall
- **Backgrounds:** use `-color` or `-flat` on dark backgrounds, and `-light` or `-dark` on light ones. On busy photos, use `-white` with enough contrast.

Don't:
- stretch, squash, rotate or skew the logo
- recolour it outside the versions above, or add new gradients
- add outlines, drop shadows or effects (the site's hover glow is the only exception)
- rearrange the icon and wordmark, change the letter spacing or retype "VYUHIKA" in another font
- put the colour logo on mid-tone or clashing backgrounds where the nodes or the V window get lost
- use the icon smaller than 16 px
