// Minimal types for opentype.js 2.0 (it ships without any), covering only what
// scripts/generate-logo-options.ts uses. The @types package describes the older 1.x API.
declare module "opentype.js" {
  type BoundingBox = { x1: number; y1: number; x2: number; y2: number };

  interface Path {
    getBoundingBox(): BoundingBox;
    toPathData(options: { decimalPlaces?: number; flipY?: boolean }): string;
  }

  interface Glyph {
    advanceWidth?: number;
    getBoundingBox(): BoundingBox;
    getPath(x: number, y: number, fontSize: number): Path;
  }

  interface Font {
    unitsPerEm: number;
    charToGlyph(char: string): Glyph;
    stringToGlyphs(text: string): Glyph[];
    getKerningValue(left: Glyph, right: Glyph): number;
  }

  const opentype: { parse(buffer: ArrayBuffer): Font };
  export default opentype;
}
