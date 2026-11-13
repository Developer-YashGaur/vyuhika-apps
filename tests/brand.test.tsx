import { readFile, readdir, stat } from "node:fs/promises";
import { renderToStaticMarkup } from "react-dom/server";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import manifest from "@/app/manifest";
import Logo from "@/components/Logo";
import { BRAND_FILES, LOGO_LAYOUTS, LOGO_VARIANTS, logoSrc } from "@/lib/brand/logo";
import { LOGO_SIZES } from "@/lib/brand/logo-sizes";
import { resumeMatcherMetadata, siteMetadata, siteViewport } from "@/lib/metadata";

// The brand files are made by `npm run brand` and `npm run email:images`. These tests check that
// everything the site and emails point at exists and is well-formed.

const publicPath = (url: string) => `public${url}`;
const exists = async (path: string) => (await stat(path)).isFile();

const logoUrls = LOGO_LAYOUTS.flatMap((layout) => LOGO_VARIANTS.map((v) => logoSrc(layout, v.id)));
const allPublicFiles = [
  ...logoUrls,
  BRAND_FILES.appIcon,
  BRAND_FILES.ogDefault,
  BRAND_FILES.ogResumeMatcher,
  ...BRAND_FILES.manifestIcons,
  ...BRAND_FILES.email,
  ...BRAND_FILES.kit,
];

describe("brand files", () => {
  it.each(allPublicFiles)("%s exists", async (url) => {
    expect(await exists(publicPath(url))).toBe(true);
  });

  it.each(["app/favicon.ico", "app/icon.svg", "app/apple-icon.png"])("%s exists", async (path) => {
    expect(await exists(path)).toBe(true);
  });

  it("every SVG has a viewBox and no NaN", async () => {
    const svgs = [
      ...(await readdir("public/brand")).filter((f) => f.endsWith(".svg")).map((f) => `public/brand/${f}`),
      "app/icon.svg",
    ];
    expect(svgs.length).toBe(17); // 15 logo files, the app-icon tile, and app/icon.svg
    for (const file of svgs) {
      const svg = await readFile(file, "utf8");
      expect(svg, file).toMatch(/viewBox="0 0 [\d.]+ [\d.]+"/);
      expect(svg, file).not.toContain("NaN");
      expect(svg, file).not.toMatch(/<text|font-family/); // text is outlined
    }
  });

  it("the logo sizes used by <Logo> match the files", async () => {
    for (const layout of LOGO_LAYOUTS) {
      const svg = await readFile(publicPath(logoSrc(layout)), "utf8");
      const [, w, h] = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/)!;
      expect({ width: Number(w), height: Number(h) }).toEqual(LOGO_SIZES[layout]);
    }
  });

  it("the apple icon is 180×180 and the kit images have the right sizes", async () => {
    const size = async (path: string) => {
      const m = await sharp(path).metadata();
      return [m.width, m.height];
    };
    expect(await size("app/apple-icon.png")).toEqual([180, 180]);
    expect(await size("public/brand/kit/avatar-1024.png")).toEqual([1024, 1024]);
    expect(await size("public/brand/kit/icon-512.png")).toEqual([512, 512]);
    expect(await size("public/brand/kit/banner-1200x300.png")).toEqual([1200, 300]);
    expect((await sharp("public/brand/kit/icon-512.png").metadata()).hasAlpha).toBe(true); // transparent
  });

  it("favicon.ico holds 16, 32 and 48 px images", async () => {
    const ico = await readFile("app/favicon.ico");
    expect(ico.readUInt16LE(2)).toBe(1); // type: icon
    const count = ico.readUInt16LE(4);
    const sizes = Array.from({ length: count }, (_, i) => ico.readUInt8(6 + 16 * i));
    expect(sizes).toEqual([16, 32, 48]);
  });

  it("the animated email header stays under 300 KB", async () => {
    expect((await stat("public/email/header.gif")).size).toBeLessThan(300 * 1024);
  });
});

describe("share images and metadata", () => {
  const ogImages = (m: typeof siteMetadata) => {
    const images = m.openGraph?.images;
    return (Array.isArray(images) ? images : [images]) as { url: string; width?: number; height?: number }[];
  };

  it("the site has an Open Graph and Twitter card image, a site name and a theme colour", async () => {
    const [og] = ogImages(siteMetadata);
    expect(og).toMatchObject({ url: BRAND_FILES.ogDefault, width: 1200, height: 630 });
    expect(siteMetadata.openGraph).toMatchObject({ siteName: "Vyuhika Apps" });
    expect(siteMetadata.twitter).toMatchObject({ card: "summary_large_image" });
    expect(JSON.stringify(siteMetadata.twitter)).toContain(BRAND_FILES.ogDefault);
    expect(siteViewport.themeColor).toBe("#050816");
  });

  it("the Resume Matcher has its own title, description and share image", () => {
    expect(resumeMatcherMetadata.title).toBe("Resume Matcher");
    expect(resumeMatcherMetadata.description).toBeTruthy();
    expect(ogImages(resumeMatcherMetadata)[0].url).toBe(BRAND_FILES.ogResumeMatcher);
    expect(JSON.stringify(resumeMatcherMetadata.twitter)).toContain(BRAND_FILES.ogResumeMatcher);
  });

  it.each([BRAND_FILES.ogDefault, BRAND_FILES.ogResumeMatcher])("%s is 1200×630", async (url) => {
    const m = await sharp(publicPath(url)).metadata();
    expect([m.width, m.height]).toEqual([1200, 630]);
  });
});

describe("web manifest", () => {
  it("has names, colours and icons that exist at the stated sizes", async () => {
    const m = manifest();
    expect(m).toMatchObject({ name: "Vyuhika Apps", short_name: "Vyuhika", theme_color: "#050816", background_color: "#050816" });
    for (const icon of m.icons ?? []) {
      const meta = await sharp(publicPath(icon.src)).metadata();
      expect(`${meta.width}x${meta.height}`).toBe(icon.sizes);
    }
    expect(m.icons?.some((i) => i.purpose === "maskable")).toBe(true);
  });
});

describe("<Logo>", () => {
  it.each(LOGO_LAYOUTS)("renders the %s variant with an accessible name", (variant) => {
    const html = renderToStaticMarkup(<Logo variant={variant} size={40} />);
    expect(html).toContain('alt="Vyuhika Apps"');
    expect(html).toContain(`src="${logoSrc(variant)}"`);
    expect(html).toContain('height="40"');
  });

  it("keeps the logo's shape when resized", () => {
    const html = renderToStaticMarkup(<Logo variant="horizontal" size={64} />);
    expect(html).toContain(`width="${Math.round(LOGO_SIZES.horizontal.width)}"`);
  });

  it("uses a custom label, and hides decorative logos from screen readers", () => {
    expect(renderToStaticMarkup(<Logo label="Vyuhika Apps home" />)).toContain('alt="Vyuhika Apps home"');
    const decorative = renderToStaticMarkup(<Logo variant="icon" decorative />);
    expect(decorative).toContain('alt=""');
    expect(decorative).toContain('aria-hidden="true"');
  });

  it("can use another colour version", () => {
    expect(renderToStaticMarkup(<Logo tone="light" />)).toContain(`src="${logoSrc("horizontal", "light")}"`);
  });
});
