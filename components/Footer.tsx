import ExternalHint from "@/components/ExternalHint";
import { externalLinkProps, site } from "@/lib/site";

// Site footer: wordmark, tagline, a link to the maker's portfolio and social links.
// The extra bottom padding keeps the floating Feedback button from covering the links.
export default function Footer() {
  return (
    <footer className="border-t border-white/10">
      <div className="gutter flex flex-col gap-6 pt-12 pb-24 text-sm text-mist sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="wordmark-sm font-display">{site.name}</p>
          <p className="mt-2">
            {site.tagline} Made by{" "}
            <a href={site.owner.portfolio} {...externalLinkProps} className="footer-link">
              {site.owner.name}
              <ExternalHint />
            </a>
            .
          </p>
        </div>
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
