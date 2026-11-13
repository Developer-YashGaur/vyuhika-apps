"use client";

import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import OrbFallback from "@/components/OrbFallback";
import { site } from "@/lib/site";

// HeroOrb checks the browser (screen size, WebGL), so it only runs client-side.
const HeroOrb = dynamic(() => import("@/components/HeroOrb"), {
  ssr: false,
  loading: () => <OrbFallback />,
});

const ease = [0.22, 1, 0.36, 1] as const;
const headline = ["Intelligence,", "built in public."];

export default function Hero() {
  return (
    <section className="relative flex min-h-svh items-center overflow-hidden pt-28 pb-16 lg:pt-20">
      {/* The orb sits behind the text on the right; on phones it sits above the text. */}
      <div className="pointer-events-none absolute inset-x-0 top-20 mx-auto h-[300px] w-[300px] opacity-70 lg:inset-x-auto lg:top-1/2 lg:right-[-2%] lg:h-[min(62vw,82vh,1100px)] lg:w-[min(62vw,82vh,1100px)] lg:-translate-y-1/2 lg:opacity-100">
        <HeroOrb />
      </div>

      <div className="gutter relative z-10 w-full pt-56 lg:pt-0">
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease }}
          className="live-badge"
        >
          <span className="live-dot" aria-hidden="true" />
          Now building in public
        </motion.p>

        <h1 className="hero-title font-display mt-7">
          {headline.map((line, i) => (
            <span key={line} className="block overflow-hidden pb-[0.08em]">
              <motion.span
                className="hero-gradient block"
                initial={{ y: "105%" }}
                animate={{ y: 0 }}
                transition={{ duration: 1, delay: 0.15 + i * 0.14, ease }}
              >
                {line}
              </motion.span>
            </span>
          ))}
        </h1>

        <motion.p
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.55, ease }}
          className="measure mt-8 text-lg leading-relaxed text-mist sm:text-xl"
        >
          Small AI tools that each solve one real problem. Every one is built in the open,
          from the first commit to launch day.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.7, ease }}
          className="mt-10 flex flex-wrap gap-4"
        >
          <a href="#apps" className="btn-glow">
            Explore apps
          </a>
          <a href={site.links.youtube} target="_blank" rel="noopener noreferrer" className="btn-ghost">
            Follow the journey
          </a>
        </motion.div>
      </div>
    </section>
  );
}
