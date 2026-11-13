import AppGrid from "@/components/AppGrid";
import Hero from "@/components/Hero";
import Marquee from "@/components/Marquee";
import Navbar from "@/components/Navbar";
import Reveal from "@/components/Reveal";
import { site } from "@/lib/site";

export default function Home() {
  return (
    <>
      <Navbar onHome />
      <main id="top">
        <Hero />
        <Marquee />

        <section
          id="apps"
          aria-labelledby="apps-heading"
          className="gutter scroll-mt-24 py-28 sm:py-40"
        >
          <Reveal>
            <h2 id="apps-heading" className="section-title font-display">
              Tools you can use today
            </h2>
            <p className="measure mt-6 text-lg leading-relaxed text-mist">
              Free apps glow cyan, Pro apps glow violet. New ones appear here as they ship.
            </p>
          </Reveal>
          <AppGrid />
        </section>
      </main>

      <footer className="border-t border-white/10">
        <div className="gutter flex flex-col gap-6 py-12 text-sm text-mist sm:flex-row sm:items-center sm:justify-between">
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
