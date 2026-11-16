import Link from "next/link";
import ExternalHint from "@/components/ExternalHint";
import ExternalAppLink from "@/components/ExternalAppLink";
import { apps, appHref, isExternal, pricingLabel } from "@/lib/apps";

// A row of links at the bottom of an app page to the other live apps. Koshvia is on another site, so its link
// opens in a new tab with the hint. Coming-soon apps have no page yet, so they are left out.
export default function MoreTools({ currentSlug }: { currentSlug: string }) {
  const others = apps.filter((app) => app.status === "live" && app.slug !== currentSlug);
  if (others.length === 0) return null;

  return (
    <nav aria-labelledby="more-tools" className="mt-24 sm:mt-32">
      <h2 id="more-tools" className="section-subtitle font-display">
        More tools
      </h2>
      <ul className="mt-8 grid gap-5 sm:grid-cols-2">
        {others.map((app) => {
          const inner = (
            <>
              <span className="flex items-center justify-between gap-4">
                <span className="font-display text-lg font-medium tracking-[-0.02em] text-ink">
                  {app.name}
                  {isExternal(app) && <ExternalHint />}
                </span>
                <span className="badge">{pricingLabel(app.pricing)}</span>
              </span>
              <span className="mt-3 block leading-relaxed text-mist">{app.description}</span>
            </>
          );
          return (
            <li key={app.slug}>
              {isExternal(app) ? (
                <ExternalAppLink slug={app.slug} href={appHref(app)} className="more-tools-link glass-panel glow-cyan">
                  {inner}
                </ExternalAppLink>
              ) : (
                <Link href={appHref(app)} className="more-tools-link glass-panel glow-cyan">
                  {inner}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
