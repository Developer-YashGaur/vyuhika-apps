/* eslint-disable @next/next/no-img-element -- this page previews the raw SVG files at exact pixel sizes */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LOGO_DIR, LOGO_OPTIONS, logoFileName, type LogoLayout, type LogoSlug, type LogoVariant } from "@/lib/brand/options";

// Dev-only preview of the logo options: http://localhost:3000/dev/logo
// Production builds answer 404, like /dev/emails.

export const metadata: Metadata = { title: "Logo options (dev preview)", robots: { index: false } };

const ICON_SIZES = [16, 32, 64, 256];
const DARK = "#050816";
const LIGHT = "#f5f7fb";

const src = (slug: LogoSlug, layout: LogoLayout, variant: LogoVariant) => `/${LOGO_DIR}/${logoFileName(slug, layout, variant)}`;

export default function LogoPreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <main className="gutter pt-16 pb-32 text-ink">
      <h1 className="font-display text-3xl font-semibold tracking-[-0.03em]">Logo options</h1>
      <p className="measure mt-3 text-mist">
        Dev-only preview of the files in public/{LOGO_DIR}. Every image is the real SVG file at its real pixel size.
      </p>

      {/* All three side by side at the smallest sizes, where differences matter most. */}
      <section aria-labelledby="small-heading" className="mt-12">
        <h2 id="small-heading" className="font-display text-xl font-medium">
          Small sizes side by side
        </h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {(["dark", "light"] as const).map((bg) => (
            <div key={bg} className="rounded-2xl p-6" style={{ background: bg === "dark" ? DARK : LIGHT, border: "1px solid rgba(255,255,255,0.1)" }}>
              <div className="flex flex-wrap gap-10">
                {LOGO_OPTIONS.map((o) => (
                  <figure key={o.slug} className="flex flex-col items-center gap-3">
                    <div className="flex items-end gap-4">
                      {[16, 24, 32].map((size) => (
                        <img key={size} src={src(o.slug, "icon", bg === "dark" ? "color" : "light")} width={size} height={size} alt={`Option ${o.letter} at ${size} px`} />
                      ))}
                    </div>
                    <figcaption className="text-xs" style={{ color: bg === "dark" ? "#aab4cf" : "#3b4366" }}>
                      {o.letter}. {o.name}
                    </figcaption>
                  </figure>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {LOGO_OPTIONS.map((o) => (
        <section key={o.slug} aria-labelledby={`${o.slug}-heading`} className="mt-20">
          <h2 id={`${o.slug}-heading`} className="font-display text-2xl font-semibold tracking-[-0.03em]">
            {o.letter}. {o.name}
          </h2>
          <p className="measure mt-2 text-mist">{o.idea}</p>

          <div className="mt-6 grid gap-4 xl:grid-cols-2">
            <Panel background={DARK} labelColor="#aab4cf">
              <IconRow label="Colour" file={src(o.slug, "icon", "color")} />
              <IconRow label="Flat fallback" file={src(o.slug, "icon", "flat")} />
              <IconRow label="One colour" file={src(o.slug, "icon", "mono-white")} />
              <Lockups slug={o.slug} variants={["color", "mono-white"]} />
            </Panel>
            <Panel background={LIGHT} labelColor="#3b4366">
              <IconRow label="Colour" file={src(o.slug, "icon", "light")} />
              <IconRow label="One colour" file={src(o.slug, "icon", "mono-black")} />
              <Lockups slug={o.slug} variants={["light", "mono-black"]} />
            </Panel>
          </div>
        </section>
      ))}
    </main>
  );
}

function Panel({ background, labelColor, children }: { background: string; labelColor: string; children: React.ReactNode }) {
  return (
    <div
      className="flex flex-col gap-8 rounded-2xl p-6 sm:p-8"
      style={{ background, color: labelColor, border: "1px solid rgba(255,255,255,0.1)" }}
    >
      {children}
    </div>
  );
}

function IconRow({ label, file }: { label: string; file: string }) {
  return (
    <div>
      <p className="text-xs font-medium tracking-wide">{label}: 16, 32, 64 and 256 px</p>
      <div className="mt-3 flex flex-wrap items-end gap-6">
        {ICON_SIZES.map((size) => (
          <img key={size} src={file} width={size} height={size} alt={`${label} icon at ${size} px`} className="max-w-full" />
        ))}
      </div>
    </div>
  );
}

function Lockups({ slug, variants }: { slug: LogoSlug; variants: LogoVariant[] }) {
  return (
    <div>
      <p className="text-xs font-medium tracking-wide">Lockups: horizontal at 64 and 32 px tall, stacked at 160 px tall</p>
      {variants.map((variant) => (
        <div key={variant} className="mt-4 flex flex-wrap items-center gap-8">
          <img src={src(slug, "horizontal", variant)} alt={`Horizontal lockup, ${variant}`} style={{ height: 64, width: "auto" }} className="max-w-full" />
          <img src={src(slug, "horizontal", variant)} alt={`Small horizontal lockup, ${variant}`} style={{ height: 32, width: "auto" }} />
          <img src={src(slug, "stacked", variant)} alt={`Stacked lockup, ${variant}`} style={{ height: 160, width: "auto" }} />
        </div>
      ))}
    </div>
  );
}
