// Generates every Vyuhika Apps brand file from one place:
//   public/brand/       logo SVGs: icon, horizontal and stacked lockups × 5 colour versions, plus the app-icon tile
//   public/brand/kit/   PNGs for social profiles: avatar (1024), transparent icon (512), banner (1200×300)
//   public/icons/       web manifest icons (192, 512, maskable 512)
//   public/og/          share images (1200×630) for the site and the Resume Matcher
//   public/email/       small logo PNG for email footers (the email header images are made by email:images)
//   app/                favicon.ico, icon.svg, apple-icon.png (Next.js picks these up automatically)
//   lib/brand/logo-sizes.ts   the lockups' sizes, for the <Logo> component
//
// Run with: npm run brand
//
// The symbol is hand-written SVG geometry. "VYUHIKA", "APPS" and the share-image text are set in Chakra Petch
// (SIL Open Font License) and converted to outlined paths with opentype.js, so nothing depends on an installed
// font. PNGs are rendered from the SVGs with sharp.
//
// The code lives in main() because tsx runs this .ts file as CommonJS (no top-level await).

import { mkdir, readFile, writeFile } from "node:fs/promises";
import opentype from "opentype.js";
import sharp from "sharp";
import { BRAND_COLORS, LOGO_LAYOUTS, LOGO_VARIANTS, type LogoLayout, type LogoVariant } from "@/lib/brand/logo";

const FONT_DIR = "node_modules/@fontsource/chakra-petch/files";
const { space, cyan, violet, ink, cyanDeep, violetDeep } = BRAND_COLORS;

// ---------- Colours ----------

type Palette = {
  gradient: boolean; // use gradients (otherwise flat colours)
  top: string; // gradient start (top), or the flat colour for nodes
  bottom: string; // gradient end (bottom), or the flat colour for the hexagon
  core: string; // the glowing core node
  coreEdge: string; // the core's outer colour (gradient edge or ring)
  halo: string | null; // soft glow around the core (none in one-colour and light versions)
  word: string; // "VYUHIKA"
  label: string; // "APPS"
};

const one = (color: string): Palette => ({
  gradient: false,
  top: color,
  bottom: color,
  core: color,
  coreEdge: color,
  halo: null,
  word: color,
  label: color,
});

const palettes: Record<LogoVariant, Palette> = {
  color: { gradient: true, top: cyan, bottom: violet, core: "#ffffff", coreEdge: cyan, halo: cyan, word: ink, label: cyan },
  flat: { gradient: false, top: cyan, bottom: violet, core: "#ffffff", coreEdge: cyan, halo: cyan, word: ink, label: cyan },
  // Deeper shades: #22d3ee on white is too faint to read. No halo: a pale disc on white looks muddy.
  light: { gradient: false, top: cyanDeep, bottom: violetDeep, core: "#0e7490", coreEdge: "#0e7490", halo: null, word: space, label: "#0e7490" },
  white: one("#ffffff"),
  dark: one(space),
};

// ---------- Symbol (64 × 64 grid) ----------
//
// Sized for 16 px: 1 unit = 0.25 px there, so the V window is 6.5 units (about 1.6 px) wide and the
// corner nodes are 5.5 units in radius.

type Paint = {
  node: string; // nodes on the corners (drawn on top of the hexagon)
  body: string; // the hexagon
  defs: string[];
  coreGlow: (cx: number, cy: number, r: number, haloR: number) => string;
};

const round = (n: number) => Math.round(n * 100) / 100;

function makePaint(p: Palette, id: string): Paint {
  const defs: string[] = [];
  let body = p.bottom;
  let core = p.core;
  // On the cyan-to-violet hexagon, near-white nodes read best; other versions keep their node colour.
  const node = p.gradient ? "#ecfeff" : p.top;

  if (p.gradient) {
    defs.push(
      `<linearGradient id="${id}-g" x1="0" y1="4" x2="0" y2="60" gradientUnits="userSpaceOnUse">` +
        `<stop offset="0" stop-color="${p.top}"/><stop offset="1" stop-color="${p.bottom}"/></linearGradient>`,
      `<radialGradient id="${id}-core"><stop offset="0.35" stop-color="${p.core}"/><stop offset="1" stop-color="${p.coreEdge}"/></radialGradient>`,
    );
    if (p.halo) {
      defs.push(
        `<radialGradient id="${id}-halo"><stop offset="0" stop-color="${p.halo}" stop-opacity="0.6"/><stop offset="1" stop-color="${p.halo}" stop-opacity="0"/></radialGradient>`,
      );
    }
    body = `url(#${id}-g)`;
    core = `url(#${id}-core)`;
  }

  const coreGlow = (cx: number, cy: number, r: number, haloR: number) => {
    const halo = !p.halo
      ? ""
      : p.gradient
        ? `<circle cx="${cx}" cy="${cy}" r="${haloR}" fill="url(#${id}-halo)"/>`
        : `<circle cx="${cx}" cy="${cy}" r="${round(r + (haloR - r) * 0.6)}" fill="${p.halo}" opacity="0.2"/>`;
    // Flat versions get a thin ring in the edge colour, so the white core still reads as "glowing".
    const ring = !p.gradient && p.core !== p.coreEdge ? ` stroke="${p.coreEdge}" stroke-width="2"` : "";
    return `${halo}<circle cx="${cx}" cy="${cy}" r="${r}" fill="${core}"${ring}/>`;
  };

  return { node, body, defs, coreGlow };
}

// A solid hexagon with a node on each corner and a V-shaped window cut inside it.
// The V points down to the glowing core node on the bottom corner.
function symbol(paint: Paint, id: string): string {
  const corners = [-90, -30, 30, 90, 150, 210].map((a) => [
    round(32 + 25 * Math.cos((a * Math.PI) / 180)),
    round(31 + 25 * Math.sin((a * Math.PI) / 180)), // centre at y 31 so the top node (r 5.5) isn't clipped
  ]);
  const core = corners[3]; // bottom corner
  return [
    // The mask keeps the hexagon and cuts a V window out of it, clear of the edges.
    `<mask id="${id}-v" maskUnits="userSpaceOnUse" x="0" y="0" width="64" height="64">` +
      `<rect width="64" height="64" fill="#fff"/>` +
      `<polyline points="22,20 32,37 42,20" fill="none" stroke="#000" stroke-width="6.5" stroke-linecap="round" stroke-linejoin="round"/></mask>`,
    `<polygon points="${corners.map((p) => p.join(",")).join(" ")}" fill="${paint.body}" stroke="${paint.body}" stroke-width="3" stroke-linejoin="round" mask="url(#${id}-v)"/>`,
    ...corners.filter((_, i) => i !== 3).map(([x, y]) => `<circle cx="${x}" cy="${y}" r="5.5" fill="${paint.node}"/>`),
    paint.coreGlow(core[0], core[1], 7.5, 9),
  ].join("\n  ");
}

// ---------- Outlined text ----------

type Font = ReturnType<typeof opentype.parse>;
// d is drawn from x = 0; dx is how far to move it so the ink starts exactly at x = 0.
type Outlined = { d: string; width: number; height: number; dx: number };

async function loadFont(weight: 500 | 600 | 700): Promise<Font> {
  const buf = await readFile(`${FONT_DIR}/chakra-petch-latin-${weight}-normal.woff`);
  return opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer);
}

// Writes SVG path data from opentype.js path commands. (opentype.js's own toPathData() can write "NaN":
// its rounding builds strings like "1.1e-13e+2" for numbers with a tiny leftover fraction.)
type PathCommand = { type: string; x?: number; y?: number; x1?: number; y1?: number; x2?: number; y2?: number };
function pathData(commands: PathCommand[]): string {
  const n = (v: number | undefined) => String(round(v ?? 0));
  return commands
    .map((c) => {
      if (c.type === "M" || c.type === "L") return `${c.type}${n(c.x)} ${n(c.y)}`;
      if (c.type === "C") return `C${n(c.x1)} ${n(c.y1)} ${n(c.x2)} ${n(c.y2)} ${n(c.x)} ${n(c.y)}`;
      if (c.type === "Q") return `Q${n(c.x1)} ${n(c.y1)} ${n(c.x)} ${n(c.y)}`;
      return "Z";
    })
    .join("");
}

// Outlines `text` so its capital letters are `capHeight` tall, with extra letter spacing (in em).
// The top of the capitals is at y = 0; shift by `dx` so the ink starts at x = 0.
function outline(font: Font, text: string, capHeight: number, tracking: number): Outlined {
  const h = font.charToGlyph("H").getBoundingBox();
  const fontSize = (capHeight * font.unitsPerEm) / (h.y2 - h.y1);
  const scale = fontSize / font.unitsPerEm;
  const glyphs = font.stringToGlyphs(text);

  // Each letter is outlined on its own and the path strings are joined.
  const parts: string[] = [];
  const box = { x1: Infinity, x2: -Infinity };
  let x = 0;
  glyphs.forEach((glyph, i) => {
    const glyphPath = glyph.getPath(x, capHeight, fontSize);
    parts.push(pathData(glyphPath.commands));
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

// A text path placed with its ink starting at (x, top).
const textPath = (t: Outlined, x: number, top: number, fill: string) =>
  `<path transform="translate(${round(x + t.dx)} ${round(top)})" fill="${fill}" d="${t.d}"/>`;

// ---------- Logo files ----------

type Fonts = { bold: Font; semi: Font; medium: Font };
type Built = { svg: string; width: number; height: number };

function svgFile(width: number, height: number, idPrefix: string, defs: string[], body: string, title = "Vyuhika Apps"): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${round(width)} ${round(height)}" width="${round(width)}" height="${round(height)}" role="img" aria-labelledby="${idPrefix}-title">
  <title id="${idPrefix}-title">${title}</title>${defs.length ? `\n  <defs>\n    ${defs.join("\n    ")}\n  </defs>` : ""}
  ${body}
</svg>
`;
}

function buildLogo(layout: LogoLayout, variant: LogoVariant, fonts: Fonts): Built {
  const p = palettes[variant];
  const id = `vyuhika-${layout}-${variant}`;
  const paint = makePaint(p, id);
  const icon = symbol(paint, id);

  if (layout === "icon") return { svg: svgFile(64, 64, id, paint.defs, icon), width: 64, height: 64 };

  if (layout === "horizontal") {
    // Icon on the left; "VYUHIKA" with "APPS" below it, centred on the icon.
    // "APPS" is a good share of the height so it stays readable at navbar size (about 32 px tall).
    const word = outline(fonts.bold, "VYUHIKA", 23, 0.06);
    const label = outline(fonts.semi, "APPS", 12.5, 0.28);
    const gap = 6.5;
    const top = 32 - (word.height + gap + label.height) / 2;
    const x = 80;
    const width = round(x + Math.max(word.width, label.width));
    const body = [`<g>\n  ${icon}\n  </g>`, textPath(word, x, top, p.word), textPath(label, x, top + word.height + gap, p.label)].join("\n  ");
    return { svg: svgFile(width, 64, id, paint.defs, body), width, height: 64 };
  }

  // Stacked: icon centred above "VYUHIKA" and "APPS".
  const word = outline(fonts.bold, "VYUHIKA", 17, 0.06);
  const label = outline(fonts.semi, "APPS", 7.5, 0.3);
  const width = round(Math.max(64, word.width, label.width));
  const wordTop = 78;
  const labelTop = wordTop + word.height + 7;
  const height = round(labelTop + label.height);
  const body = [
    `<g transform="translate(${round((width - 64) / 2)} 0)">\n  ${icon}\n  </g>`,
    textPath(word, (width - word.width) / 2, wordTop, p.word),
    textPath(label, (width - label.width) / 2, labelTop, p.label),
  ].join("\n  ");
  return { svg: svgFile(width, height, id, paint.defs, body), width, height };
}

// The icon on a deep-space rounded square: readable on light and dark browser tabs alike.
// `scale` is how much of the tile the icon fills; `radius` 0 gives a square (iOS rounds it itself).
function appIcon(scale: number, radius: number, id = "vyuhika-app-icon"): string {
  const paint = makePaint(palettes.color, id);
  const offset = round((64 - 64 * scale) / 2);
  return svgFile(
    64,
    64,
    id,
    paint.defs,
    `<rect width="64" height="64" rx="${radius}" fill="${space}"/>\n  <g transform="translate(${offset} ${offset}) scale(${scale})">\n  ${symbol(paint, id)}\n  </g>`,
  );
}

// Places another SVG file's content inside a bigger SVG, at (x, y) with the given width.
function nest(built: Built, x: number, y: number, width: number): string {
  const inner = built.svg.replace(/^<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");
  const height = round((built.height * width) / built.width);
  return `<svg x="${round(x)}" y="${round(y)}" width="${round(width)}" height="${height}" viewBox="0 0 ${built.width} ${built.height}">${inner}</svg>`;
}

// ---------- Share images and banners (deep-space scenes) ----------

// Aurora glows and a faint field of connected nodes, like the site background.
function scene(width: number, height: number, id: string): { defs: string; body: string } {
  let seed = 11;
  const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  const nodes = Array.from({ length: Math.round((width * height) / 9000) }, () => [round(rand() * width), round(rand() * height)]);
  const links: string[] = [];
  nodes.forEach((a, i) =>
    nodes.slice(i + 1).forEach((b) => {
      const d = Math.hypot(a[0] - b[0], a[1] - b[1]);
      if (d < 110) links.push(`<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="${cyan}" stroke-opacity="${round(0.12 * (1 - d / 110))}" stroke-width="1"/>`);
    }),
  );
  const defs = [
    `<radialGradient id="${id}-a1" cx="0.12" cy="0.1" r="0.7"><stop offset="0" stop-color="${cyan}" stop-opacity="0.24"/><stop offset="1" stop-color="${cyan}" stop-opacity="0"/></radialGradient>`,
    `<radialGradient id="${id}-a2" cx="0.85" cy="0.9" r="0.75"><stop offset="0" stop-color="${violet}" stop-opacity="0.32"/><stop offset="1" stop-color="${violet}" stop-opacity="0"/></radialGradient>`,
  ].join("");
  const body = [
    `<rect width="${width}" height="${height}" fill="${space}"/>`,
    `<rect width="${width}" height="${height}" fill="url(#${id}-a1)"/>`,
    `<rect width="${width}" height="${height}" fill="url(#${id}-a2)"/>`,
    ...links,
    ...nodes.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.6" fill="${ink}" fill-opacity="0.35"/>`),
  ].join("\n  ");
  return { defs, body };
}

// A big glowing icon for the right-hand side of share images.
function glowingIcon(icon: Built, cx: number, cy: number, size: number, id: string): string {
  return [
    `<circle cx="${cx}" cy="${cy}" r="${size * 0.75}" fill="url(#${id}-iconglow)"/>`,
    nest(icon, cx - size / 2, cy - size / 2, size),
  ].join("\n  ");
}
const iconGlowDef = (id: string) =>
  `<radialGradient id="${id}-iconglow"><stop offset="0" stop-color="${violet}" stop-opacity="0.45"/><stop offset="0.6" stop-color="${cyan}" stop-opacity="0.12"/><stop offset="1" stop-color="${cyan}" stop-opacity="0"/></radialGradient>`;

function ogDefault(fonts: Fonts, icon: Built): string {
  const id = "og";
  const { defs, body } = scene(1200, 630, id);
  const word = outline(fonts.bold, "VYUHIKA", 88, 0.06);
  const label = outline(fonts.semi, "APPS", 30, 0.32);
  const tagline = outline(fonts.semi, "Intelligence, built in public.", 40, 0.01);
  const url = outline(fonts.medium, "apps.vyuhika.com", 24, 0.04);
  const x = 96;
  return svgFile(1200, 630, id, [defs, iconGlowDef(id)], [
    body,
    glowingIcon(icon, 930, 300, 330, id),
    textPath(word, x, 168, ink),
    textPath(label, x + 4, 168 + 88 + 22, cyan),
    textPath(tagline, x, 380, ink),
    `<rect x="${x}" y="470" width="64" height="4" rx="2" fill="${cyan}"/>`,
    textPath(url, x, 510, "#aab4cf"),
  ].join("\n  "), "Vyuhika Apps: Intelligence, built in public.");
}

function ogResumeMatcher(fonts: Fonts, icon: Built, lockup: Built): string {
  const id = "og-rm";
  const { defs, body } = scene(1200, 630, id);
  const title1 = outline(fonts.bold, "Resume", 92, 0.01);
  const title2 = outline(fonts.bold, "Matcher", 92, 0.01);
  const sub = outline(fonts.medium, "Your match score, missing keywords and fixes.", 28, 0.01);
  const badge = outline(fonts.bold, "FREE", 20, 0.12);
  const url = outline(fonts.medium, "apps.vyuhika.com", 24, 0.04);
  const x = 96;
  return svgFile(1200, 630, id, [defs, iconGlowDef(id)], [
    body,
    glowingIcon(icon, 960, 300, 280, id),
    nest(lockup, x, 64, 230),
    textPath(title1, x, 178, ink),
    textPath(title2, x, 178 + 92 + 26, ink),
    textPath(sub, x, 440, "#c8d0e6"),
    `<rect x="${x}" y="512" width="${round(badge.width + 36)}" height="40" rx="20" fill="none" stroke="${cyan}" stroke-width="2"/>`,
    textPath(badge, x + 18, 522, cyan),
    textPath(url, x + badge.width + 64, 520, "#aab4cf"),
  ].join("\n  "), "Resume Matcher by Vyuhika Apps");
}

function banner(fonts: Fonts, icon: Built): string {
  const id = "banner";
  const { defs, body } = scene(1200, 300, id);
  const word = outline(fonts.bold, "VYUHIKA", 64, 0.06);
  const label = outline(fonts.semi, "APPS", 22, 0.32);
  const tagline = outline(fonts.medium, "Intelligence, built in public.", 24, 0.01);
  const iconSize = 150;
  const gap = 44;
  const textW = Math.max(word.width, tagline.width);
  const x0 = (1200 - (iconSize + gap + textW)) / 2;
  const tx = x0 + iconSize + gap;
  return svgFile(1200, 300, id, [defs, iconGlowDef(id)], [
    body,
    glowingIcon(icon, x0 + iconSize / 2, 150, iconSize, id),
    textPath(word, tx, 78, ink),
    textPath(label, tx + 3, 78 + 64 + 14, cyan),
    textPath(tagline, tx, 78 + 64 + 14 + 22 + 30, "#c8d0e6"),
  ].join("\n  "), "Vyuhika Apps: Intelligence, built in public.");
}

function avatar(icon: Built): string {
  const id = "avatar";
  const { defs, body } = scene(1024, 1024, id);
  // Social sites crop avatars to a circle, so the icon stays well inside it.
  return svgFile(1024, 1024, id, [defs, iconGlowDef(id)], [body, glowingIcon(icon, 512, 520, 600, id)].join("\n  "));
}

// ---------- PNG helpers ----------

const png = (svg: string, width: number, height = width) =>
  sharp(Buffer.from(svg), { density: 300 }).resize(width, height).png({ compressionLevel: 9 }).toBuffer();

// favicon.ico holding 16, 32 and 48 px PNGs (all current browsers read PNG-in-ICO).
async function icoFile(svg: string): Promise<Buffer> {
  const sizes = [16, 32, 48];
  const images = await Promise.all(sizes.map((s) => png(svg, s)));
  const header = Buffer.alloc(6 + 16 * sizes.length);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(sizes.length, 4);
  let offset = header.length;
  sizes.forEach((s, i) => {
    const e = 6 + 16 * i;
    header.writeUInt8(s, e); // width
    header.writeUInt8(s, e + 1); // height
    header.writeUInt8(0, e + 2); // colours in palette
    header.writeUInt8(0, e + 3); // reserved
    header.writeUInt16LE(1, e + 4); // colour planes
    header.writeUInt16LE(32, e + 6); // bits per pixel
    header.writeUInt32LE(images[i].length, e + 8);
    header.writeUInt32LE(offset, e + 12);
    offset += images[i].length;
  });
  return Buffer.concat([header, ...images]);
}

// ---------- Main ----------

async function main() {
  const fonts: Fonts = { bold: await loadFont(700), semi: await loadFont(600), medium: await loadFont(500) };
  for (const dir of ["public/brand/kit", "public/icons", "public/og", "public/email"]) await mkdir(dir, { recursive: true });

  // 1. Logo SVGs.
  const sizes: Record<string, { width: number; height: number }> = {};
  const logos: Record<string, Built> = {};
  for (const layout of LOGO_LAYOUTS) {
    for (const { id: variant } of LOGO_VARIANTS) {
      const built = buildLogo(layout, variant, fonts);
      logos[`${layout}-${variant}`] = built;
      await writeFile(`public/brand/vyuhika-${layout}-${variant}.svg`, built.svg);
    }
    sizes[layout] = { width: logos[`${layout}-color`].width, height: logos[`${layout}-color`].height };
  }
  const icon = logos["icon-color"];

  // 2. App icons: favicon, Apple touch icon, manifest icons.
  const tile = appIcon(0.86, 14);
  await writeFile("public/brand/vyuhika-app-icon.svg", tile);
  await writeFile("app/icon.svg", tile);
  await writeFile("app/favicon.ico", await icoFile(tile));
  await writeFile("app/apple-icon.png", await png(appIcon(0.72, 0, "vyuhika-apple"), 180));
  await writeFile("public/icons/icon-192.png", await png(appIcon(0.8, 14, "vyuhika-192"), 192));
  await writeFile("public/icons/icon-512.png", await png(appIcon(0.8, 14, "vyuhika-512"), 512));
  // Maskable: Android may crop to a circle, so the icon stays inside the middle 60%.
  await writeFile("public/icons/icon-maskable-512.png", await png(appIcon(0.58, 0, "vyuhika-maskable"), 512));

  // 3. Share images.
  await writeFile("public/og/vyuhika.png", await png(ogDefault(fonts, icon), 1200, 630));
  await writeFile("public/og/resume-matcher.png", await png(ogResumeMatcher(fonts, icon, logos["horizontal-color"]), 1200, 630));

  // 4. Brand kit.
  await writeFile("public/brand/kit/avatar-1024.png", await png(avatar(icon), 1024));
  await writeFile("public/brand/kit/icon-512.png", await png(icon.svg, 512)); // transparent background
  await writeFile("public/brand/kit/banner-1200x300.png", await png(banner(fonts, icon), 1200, 300));

  // 5. Email footer logo (shown at 28 px, saved at 2× for sharp screens).
  await writeFile("public/email/logo-icon.png", await png(icon.svg, 56));

  // 6. Sizes for the <Logo> component.
  await writeFile(
    "lib/brand/logo-sizes.ts",
    `// Made by scripts/generate-brand.ts (npm run brand). Do not edit by hand.\n// The natural size of each logo layout, used to keep its shape when it's resized.\n\nexport const LOGO_SIZES = ${JSON.stringify(sizes, null, 2)} as const;\n`,
  );

  console.log("Brand files written: public/brand, public/brand/kit, public/icons, public/og, public/email, app icons");
}

main().catch((error: unknown) => {
  console.error(`Brand generation failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
