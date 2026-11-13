import ExternalHint from "@/components/ExternalHint";
import Reveal from "@/components/Reveal";
import { externalLinkProps, site } from "@/lib/site";

// "Built by" section on the home page: who makes Vyuhika, with a link to the portfolio.
export default function BuiltBy() {
  return (
    <section id="about" aria-labelledby="built-by-heading" className="gutter scroll-mt-24 pb-24 sm:pb-32">
      <Reveal>
        <div className="glass-panel glow-violet built-by">
          {/* Soft glow in the corner, purely decorative. */}
          <span className="built-by-glow" aria-hidden="true" />

          <div className="relative grid gap-10 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <div>
              <h2 id="built-by-heading" className="section-title font-display">
                Built by {site.owner.firstName}
              </h2>
              <p className="measure mt-6 text-lg leading-relaxed text-mist">
                Hi, I&apos;m {site.owner.firstName}. I build AI tools in public, and everything here is made by me
                with AI as my co-builder.
              </p>
            </div>

            <div className="flex flex-col items-start gap-6 lg:items-end">
              <a href={site.owner.portfolio} {...externalLinkProps} className="btn-glow btn-lg">
                Visit my portfolio
                <ExternalHint />
              </a>
              <ul className="flex gap-8 text-sm font-medium text-mist" aria-label={`${site.owner.name} elsewhere`}>
                <li>
                  <a href={site.links.linkedin} {...externalLinkProps} className="nav-link">
                    LinkedIn
                    <ExternalHint />
                  </a>
                </li>
                <li>
                  <a href={site.links.youtube} {...externalLinkProps} className="nav-link">
                    YouTube
                    <ExternalHint />
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
