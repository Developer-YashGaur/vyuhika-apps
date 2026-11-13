"use client";

import { useState } from "react";
import { useMotionValueEvent, useScroll } from "framer-motion";
import { site } from "@/lib/site";

// Fixed top bar. It's see-through at the top of the page and turns into
// frosted glass once you start scrolling.
export default function Navbar() {
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);

  useMotionValueEvent(scrollY, "change", (y) => setScrolled(y > 24));

  return (
    <header className={`navbar ${scrolled ? "is-scrolled" : ""}`}>
      <nav aria-label="Main" className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
        <a href="#top" className="wordmark-sm font-display">
          Vyuhika
        </a>
        <ul className="flex items-center gap-6 text-sm font-medium text-mist sm:gap-8">
          <li>
            <a href="#apps" className="nav-link">Apps</a>
          </li>
          <li>
            <a href={site.links.youtube} target="_blank" rel="noopener noreferrer" className="nav-link">
              Journey
            </a>
          </li>
          <li className="hidden sm:block">
            <a href={site.links.linkedin} target="_blank" rel="noopener noreferrer" className="nav-link">
              LinkedIn
            </a>
          </li>
        </ul>
      </nav>
    </header>
  );
}
