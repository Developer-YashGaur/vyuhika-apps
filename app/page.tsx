import AppGrid from "@/components/AppGrid";
import BuiltBy from "@/components/BuiltBy";
import Footer from "@/components/Footer";
import Hero from "@/components/Hero";
import Marquee from "@/components/Marquee";
import Navbar from "@/components/Navbar";
import Reveal from "@/components/Reveal";

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

        <BuiltBy />
      </main>

      <Footer />
    </>
  );
}
