import Link from "next/link";
import ExternalHint from "@/components/ExternalHint";
import Logo from "@/components/Logo";
import { apps, appHref, isExternal } from "@/lib/apps";
import { externalLinkProps, site } from "@/lib/site";

// Every live app that has a page on this site (external apps like Koshvia are left out).
const internalApps = apps.filter((app) => app.status === "live" && !isExternal(app));

// Site footer: wordmark, tagline, a link to the maker's portfolio, a list of the live apps and social links.
// The extra bottom padding keeps the floating Feedback button from covering the links.
export default function Footer() {
  return (
    <footer className="border-t border-white/10">
      <div className="gutter flex flex-col gap-6 pt-12 pb-24 text-sm text-mist sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Logo variant="horizontal" size={36} />
          <p className="mt-4">
            {site.tagline} Made by{" "}
            <a href={site.owner.portfolio} {...externalLinkProps} className="footer-link">
              {site.owner.name}
              <ExternalHint />
            </a>
            .
          </p>
        </div>
        <nav aria-label="Apps">
          <ul className="flex flex-col gap-3 sm:items-start">
            {internalApps.map((app) => (
              <li key={app.slug}>
                <Link href={appHref(app)} className="nav-link">
                  {app.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-label="Social links" className="flex gap-8">
          <a href={site.links.linkedin} {...externalLinkProps} className="nav-link">
            LinkedIn
            <ExternalHint />
          </a>
          <a href={site.links.youtube} {...externalLinkProps} className="nav-link">
            YouTube
            <ExternalHint />
          </a>
        </nav>
      </div>
    </footer>
  );
}
