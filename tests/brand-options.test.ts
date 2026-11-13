import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { LOGO_DIR, LOGO_LAYOUTS, LOGO_OPTIONS, LOGO_VARIANTS, logoFileName } from "@/lib/brand/options";

// Checks every generated logo file in public/brand/options/ (run `npm run logo:options` to regenerate).

const files = LOGO_OPTIONS.flatMap((o) =>
  LOGO_LAYOUTS.flatMap((layout) =>
    LOGO_VARIANTS.map((v) => ({ name: logoFileName(o.slug, layout, v.id), layout, variant: v.id })),
  ),
);

const read = (name: string) => readFile(`public/${LOGO_DIR}/${name}`, "utf8");

// Colours used for drawing, ignoring the black/white used inside masks (they only cut shapes).
function drawingColours(svg: string): Set<string> {
  const withoutMasks = svg.replace(/<mask[\s\S]*?<\/mask>/g, "");
  return new Set([...withoutMasks.matchAll(/(?:fill|stroke|stop-color)="(#[0-9a-fA-F]{3,6})"/g)].map((m) => m[1].toLowerCase()));
}

describe("logo option files", () => {
  it("there are 45: 3 options × 3 layouts × 5 colour versions", () => {
    expect(files).toHaveLength(45);
  });

  it.each(files)("$name is a self-contained, accessible SVG", async ({ name, layout }) => {
    const svg = await read(name);
    expect(svg.startsWith("<svg ")).toBe(true);
    expect(svg).toMatch(/viewBox="0 0 [\d.]+ [\d.]+"/);
    expect(svg).toMatch(/role="img"/);
    expect(svg).toMatch(/<title id="[^"]+">Vyuhika Apps<\/title>/);
    if (layout === "icon") expect(svg).toContain('viewBox="0 0 64 64"');

    // Outlined text only: no fonts, scripts, outside references or broken numbers.
    expect(svg).not.toMatch(/<text|font-family|@font-face|<script|href="http|NaN/);

    // Every url(#id) points at something defined in this same file.
    const defined = new Set([...svg.matchAll(/ id="([^"]+)"/g)].map((m) => m[1]));
    for (const [, ref] of svg.matchAll(/url\(#([^)]+)\)/g)) expect(defined).toContain(ref);
    // IDs carry the file's own name, so several logos can sit on one page without clashing.
    for (const id of defined) expect(id.startsWith(name.replace(/\.svg$/, ""))).toBe(true);
  });

  it.each(files.filter((f) => f.variant !== "color"))("$name uses no gradients (flat fallback)", async ({ name }) => {
    expect(await read(name)).not.toMatch(/Gradient/);
  });

  it.each(files.filter((f) => f.variant.startsWith("mono")))("$name uses exactly one colour", async ({ name, variant }) => {
    expect([...drawingColours(await read(name))]).toEqual([variant === "mono-white" ? "#ffffff" : "#050816"]);
  });

  it("lockups include the outlined wordmark and label", async () => {
    for (const f of files.filter((f) => f.layout !== "icon")) {
      const svg = await read(f.name);
      // Icon, plus one path for "VYUHIKA" and one for "APPS".
      expect(svg.match(/<path transform=/g)).toHaveLength(2);
    }
  });
});
