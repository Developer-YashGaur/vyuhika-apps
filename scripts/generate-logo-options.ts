// Generates the logo option SVGs in public/brand/options/.
// Run with: npm run logo:options
//
// The symbols are hand-written SVG geometry (below). The wordmark "VYUHIKA" and the "APPS" label are set in
// Chakra Petch (SIL Open Font License) and converted to outlined paths with opentype.js, so the logo never
// depends on a font being installed.
//
// The code lives in main() because tsx runs this .ts file as CommonJS (no top-level await).

import { mkdir, readFile, writeFile } from "node:fs/promises";
import opentype from "opentype.js";
import {
  LOGO_DIR,
  LOGO_OPTIONS,
  LOGO_VARIANTS,
  logoFileName,
  type LogoLayout,
  type LogoSlug,
  type LogoVariant,
} from "@/lib/brand/options";

const OUT = `public/${LOGO_DIR}`;
const FONT_DIR = "node_modules/@fontsource/chakra-petch/files";

// ---------- Colours ----------

type Palette = {
  gradient: boolean; // use gradients (otherwise flat colours)
  top: string; // gradient start (top) or flat colour for nodes
  bottom: string; // gradient end (bottom) or flat colour for links and solid shapes
  core: string; // the glowing core node
  coreEdge: string; // the core's outer colour (gradient edge or ring)
  halo: string | null; // soft glow around the core (none in one-colour versions)
  word: string; // "VYUHIKA"
  label: string; // "APPS"
};

const palettes: Record<LogoVariant, Palette> = {
  color: {
    gradient: true,
    top: "#22d3ee",
    bottom: "#8b5cf6",
    core: "#ffffff",
    coreEdge: "#22d3ee",
    halo: "#22d3ee",
    word: "#eef2fb",
    label: "#22d3ee",
  },
  flat: {
    gradient: false,
    top: "#22d3ee",
    bottom: "#8b5cf6",
    core: "#ffffff",
    coreEdge: "#22d3ee",
    halo: "#22d3ee",
    word: "#eef2fb",
    label: "#22d3ee",
  },
  // Deeper shades of the brand colours: #22d3ee on white is too faint to read.
  light: {
    gradient: false,
    top: "#0891b2",
    bottom: "#7c3aed",
    core: "#0e7490",
    coreEdge: "#0e7490",
    halo: null, // a pale halo on a light background reads as a muddy disc
    word: "#050816",
    label: "#0e7490",
  },
  "mono-white": one("#ffffff"),
  "mono-black": one("#050816"),
};

function one(color: string): Palette {
  return { gradient: false, top: color, bottom: color, core: color, coreEdge: color, halo: null, word: color, label: color };
}

// ---------- Symbols (64 × 64 grid) ----------
//
// Sizes are chosen for 16 px: 1 unit = 0.25 px there, so lines are at least 4 units (1 px)
// and nodes at least 5 units in radius (2.5 px across).

type Paint = {
  link: string; // stroke for connecting lines
  node: string; // fill for ordinary nodes
  highlight: string; // fill for nodes that sit on a solid shape, so they stand out from it
  mass: (part: "upper" | "lower") => string; // fill for solid shapes
  core: string;
  defs: string[];
  coreGlow: (cx: number, cy: number, r: number, haloR: number) => string;
};

function makePaint(p: Palette, id: string): Paint {
  const defs: string[] = [];
  let link = p.bottom;
  let node = p.top;
  let mass = (part: "upper" | "lower") => (part === "upper" ? p.top : p.bottom);
  let core = p.core;

  if (p.gradient) {
    // One vertical gradient (cyan at the top, violet at the bottom) shared by lines, nodes and shapes.
    defs.push(
      `<linearGradient id="${id}-g" x1="0" y1="4" x2="0" y2="60" gradientUnits="userSpaceOnUse">` +
        `<stop offset="0" stop-color="${p.top}"/><stop offset="1" stop-color="${p.bottom}"/></linearGradient>`,
      `<radialGradient id="${id}-core"><stop offset="0.35" stop-color="${p.core}"/><stop offset="1" stop-color="${p.coreEdge}"/></radialGradient>`,
    );
    link = `url(#${id}-g)`;
    node = `url(#${id}-g)`;
    mass = () => `url(#${id}-g)`;
    core = `url(#${id}-core)`;
    if (p.halo) {
      defs.push(
        `<radialGradient id="${id}-halo"><stop offset="0" stop-color="${p.halo}" stop-opacity="0.6"/><stop offset="1" stop-color="${p.halo}" stop-opacity="0"/></radialGradient>`,
      );
    }
  }

  const coreGlow = (cx: number, cy: number, r: number, haloR: number) => {
    const halo = !p.halo
      ? ""
      : p.gradient
        ? `<circle cx="${cx}" cy="${cy}" r="${haloR}" fill="url(#${id}-halo)"/>`
        : `<circle cx="${cx}" cy="${cy}" r="${round(r + (haloR - r) * 0.6)}" fill="${p.halo}" opacity="0.2"/>`;
    // Flat versions get a thin ring in the edge colour, so the white core reads as "glowing".
    const ring =
      !p.gradient && p.core !== p.coreEdge
        ? ` stroke="${p.coreEdge}" stroke-width="2"`
        : "";
    return `${halo}<circle cx="${cx}" cy="${cy}" r="${r}" fill="${core}"${ring}/>`;
  };

  // On a cyan-to-violet shape, near-white nodes read best; flat and one-colour versions keep their node colour.
  const highlight = p.gradient ? "#ecfeff" : p.top;
  return { link, node, highlight, mass, core, defs, coreGlow };
}

const round = (n: number) => Math.round(n * 100) / 100;

// A. V formation: five nodes in a V, converging on the core at the bottom.
function symbolA(paint: Paint): string {
  const L1 = [10, 10];
  const L2 = [21, 30];
  const C = [32, 50];
  const R2 = [43, 30];
  const R1 = [54, 10];
  return [
    `<polyline points="${[L1, L2, C, R2, R1].map((p) => p.join(",")).join(" ")}" fill="none" stroke="${paint.link}" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>`,
    ...[L1, L2, R2, R1].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="5.5" fill="${paint.node}"/>`),
    paint.coreGlow(C[0], C[1], 7.5, 13),
  ].join("\n  ");
}

// B. Hex ring: a solid hexagon with a node on each corner and a V-shaped window cut inside it.
// The V points down to the glowing core node on the bottom corner.
function symbolB(paint: Paint, id: string): string {
  const corners = [-90, -30, 30, 90, 150, 210].map((a) => [
    round(32 + 25 * Math.cos((a * Math.PI) / 180)),
    round(30 + 25 * Math.sin((a * Math.PI) / 180)),
  ]);
  const core = corners[3]; // bottom corner
  return [
    // The mask keeps the hexagon and cuts a V window out of it, clear of the edges.
    `<mask id="${id}-v" maskUnits="userSpaceOnUse" x="0" y="0" width="64" height="64">` +
      `<rect width="64" height="64" fill="#fff"/>` +
      `<polyline points="22,19 32,36 42,19" fill="none" stroke="#000" stroke-width="6.5" stroke-linecap="round" stroke-linejoin="round"/></mask>`,
    `<polygon points="${corners.map((p) => p.join(",")).join(" ")}" fill="${paint.mass("lower")}" stroke="${paint.mass("lower")}" stroke-width="3" stroke-linejoin="round" mask="url(#${id}-v)"/>`,
    ...corners.filter((_, i) => i !== 3).map(([x, y]) => `<circle cx="${x}" cy="${y}" r="5.5" fill="${paint.highlight}"/>`),
    paint.coreGlow(core[0], core[1], 7.5, 9),
  ].join("\n  ");
}

// C. Converging chevron: each arm is two thick capsules flowing into the core node.
function symbolC(paint: Paint): string {
  // Points along the left arm, from the tip (12, 9) towards the core (32, 50).
  const tip = [12, 9];
  const core = [32, 50];
  const len = Math.hypot(core[0] - tip[0], core[1] - tip[1]);
  const at = (t: number) => [round(tip[0] + ((core[0] - tip[0]) * t) / len), round(tip[1] + ((core[1] - tip[1]) * t) / len)];
  const mirror = ([x, y]: number[]) => [round(64 - x), y];
  const capsule = (a: number[], b: number[], part: "upper" | "lower") =>
    `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="${paint.mass(part)}" stroke-width="9" stroke-linecap="round"/>`;

  const upper = [at(0), at(10)];
  const lower = [at(24), at(28)];
  return [
    capsule(upper[0], upper[1], "upper"),
    capsule(lower[0], lower[1], "lower"),
    capsule(mirror(upper[0]), mirror(upper[1]), "upper"),
    capsule(mirror(lower[0]), mirror(lower[1]), "lower"),
    paint.coreGlow(core[0], core[1], 8, 12),
  ].join("\n  ");
}

function symbol(slug: LogoSlug, paint: Paint, id: string): string {
  if (slug === "a-v-formation") return symbolA(paint);
  if (slug === "b-hex-ring") return symbolB(paint, id);
  return symbolC(paint);
}

// ---------- Wordmark (outlined text) ----------

type Font = ReturnType<typeof opentype.parse>;
// d is drawn from x = 0; dx is how far to move it so the ink starts exactly at x = 0.
type Outlined = { d: string; width: number; height: number; dx: number };

async function loadFont(weight: 600 | 700): Promise<Font> {
  const buf = await readFile(`${FONT_DIR}/chakra-petch-latin-${weight}-normal.woff`);
  return opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer);
}

// Outlines `text` so its capital letters are `capHeight` tall, with extra letter spacing (in em).
// The top of the capitals is at y = 0; shift by `dx` so the ink starts at x = 0.
function outline(font: Font, text: string, capHeight: number, tracking: number): Outlined {
  const h = font.charToGlyph("H").getBoundingBox();
  const fontSize = (capHeight * font.unitsPerEm) / (h.y2 - h.y1);
  const scale = fontSize / font.unitsPerEm;
  const glyphs = font.stringToGlyphs(text);

  // Each letter is outlined on its own and the path strings are joined
  // (joining paths with path.extend() wrote "NaN" coordinates in opentype.js 2.0).
  const parts: string[] = [];
  const box = { x1: Infinity, x2: -Infinity };
  let x = 0;
  glyphs.forEach((glyph, i) => {
    const glyphPath = glyph.getPath(x, capHeight, fontSize);
    parts.push(glyphPath.toPathData({ decimalPlaces: 2, flipY: false })); // options objects default to flipping
    const b = glyphPath.getBoundingBox();
    if (Number.isFinite(b.x1)) {
      box.x1 = Math.min(box.x1, b.x1);
      box.x2 = Math.max(box.x2, b.x2);
    }
    const kern = i < glyphs.length - 1 ? font.getKerningValue(glyph, glyphs[i + 1]) * scale : 0;
    x += (glyph.advanceWidth ?? 0) * scale + kern + tracking * fontSize;
  });
  const d = parts.join("");
  if (d.includes("NaN")) throw new Error(`Outlining "${text}" produced invalid path data`);
  return { d, width: round(box.x2 - box.x1), height: capHeight, dx: -box.x1 };
}

// ---------- Files ----------

function svgFile(width: number, height: number, idPrefix: string, defs: string[], body: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${round(width)} ${round(height)}" width="${round(width)}" height="${round(height)}" role="img" aria-labelledby="${idPrefix}-title">
  <title id="${idPrefix}-title">Vyuhika Apps</title>${defs.length ? `\n  <defs>\n    ${defs.join("\n    ")}\n  </defs>` : ""}
  ${body}
</svg>
`;
}

function build(
  slug: LogoSlug,
  layout: LogoLayout,
  variant: LogoVariant,
  fonts: { bold: Font; semi: Font },
): string {
  const p = palettes[variant];
  const id = `${slug}-${layout}-${variant}`;
  const paint = makePaint(p, id);
  const icon = symbol(slug, paint, id);

  if (layout === "icon") return svgFile(64, 64, id, paint.defs, icon);

  if (layout === "horizontal") {
    // Icon on the left; "VYUHIKA" with "APPS" below it, centred on the icon.
    const word = outline(fonts.bold, "VYUHIKA", 24, 0.06);
    const label = outline(fonts.semi, "APPS", 10.5, 0.3);
    const gap = 7.5;
    const top = 32 - (word.height + gap + label.height) / 2;
    const x = 80;
    const width = x + Math.max(word.width, label.width);
    const body = [
      `<g>\n  ${icon}\n  </g>`,
      `<path transform="translate(${round(x + word.dx)} ${round(top)})" fill="${p.word}" d="${word.d}"/>`,
      `<path transform="translate(${round(x + label.dx)} ${round(top + word.height + gap)})" fill="${p.label}" d="${label.d}"/>`,
    ].join("\n  ");
    return svgFile(width, 64, id, paint.defs, body);
  }

  // Stacked: icon centred above "VYUHIKA" and "APPS".
  const word = outline(fonts.bold, "VYUHIKA", 17, 0.06);
  const label = outline(fonts.semi, "APPS", 7.5, 0.3);
  const width = Math.max(64, word.width, label.width);
  const wordTop = 78;
  const labelTop = wordTop + word.height + 7;
  const body = [
    `<g transform="translate(${round((width - 64) / 2)} 0)">\n  ${icon}\n  </g>`,
    `<path transform="translate(${round((width - word.width) / 2 + word.dx)} ${wordTop})" fill="${p.word}" d="${word.d}"/>`,
    `<path transform="translate(${round((width - label.width) / 2 + label.dx)} ${labelTop})" fill="${p.label}" d="${label.d}"/>`,
  ].join("\n  ");
  return svgFile(width, labelTop + label.height, id, paint.defs, body);
}

async function main() {
  const fonts = { bold: await loadFont(700), semi: await loadFont(600) };
  await mkdir(OUT, { recursive: true });

  let count = 0;
  for (const option of LOGO_OPTIONS) {
    for (const layout of ["icon", "horizontal", "stacked"] as const) {
      for (const variant of LOGO_VARIANTS) {
        await writeFile(`${OUT}/${logoFileName(option.slug, layout, variant.id)}`, build(option.slug, layout, variant.id, fonts));
        count++;
      }
    }
  }
  console.log(`Wrote ${count} SVG files to ${OUT}`);
}

main().catch((error: unknown) => {
  console.error(`Logo generation failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
