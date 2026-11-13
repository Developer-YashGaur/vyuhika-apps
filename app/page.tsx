import AppGrid from "@/components/AppGrid";
import Hero from "@/components/Hero";
import Marquee from "@/components/Marquee";
import Reveal from "@/components/Reveal";
import { site } from "@/lib/site";

export default function Home() {
  return (
    <>
      <main id="top">
        <Hero />
        <Marquee />

        <section
          id="apps"
          aria-labelledby="apps-heading"
          className="mx-auto max-w-7xl scroll-mt-24 px-5 py-28 sm:px-8 sm:py-40"
        >
          <Reveal>
            <h2 id="apps-heading" className="section-title font-display">
              Tools you can use today
            </h2>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-mist">
              Free apps glow cyan, Pro apps glow violet. New ones appear here as they ship.
            </p>
          </Reveal>
          <AppGrid />
        </section>
      </main>

      <footer className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-12 text-sm text-mist sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <div>
            <p className="wordmark-sm font-display">Vyuhika</p>
            <p className="mt-2">{site.tagline} Made by Yash Gaur.</p>
          </div>
          <nav aria-label="Social links" className="flex gap-8">
            <a href={site.links.linkedin} target="_blank" rel="noopener noreferrer" className="nav-link">
              LinkedIn
            </a>
            <a href={site.links.youtube} target="_blank" rel="noopener noreferrer" className="nav-link">
              YouTube
            </a>
          </nav>
        </div>
      </footer>
    </>
  );
}
