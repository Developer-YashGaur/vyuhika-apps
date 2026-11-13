"use client";

import { useState } from "react";
import Link from "next/link";
import { useMotionValueEvent, useScroll } from "framer-motion";
import ExternalHint from "@/components/ExternalHint";
import Logo from "@/components/Logo";
import { externalLinkProps, site } from "@/lib/site";

// Fixed top bar. It's see-through at the top of the page and turns into
// frosted glass once you start scrolling. Pages pass `onHome` so the links
// jump within the home page, or go back to it from other pages.
export default function Navbar({ onHome = false }: { onHome?: boolean }) {
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  const home = onHome ? "" : "/";

  useMotionValueEvent(scrollY, "change", (y) => setScrolled(y > 24));

  return (
    <header className={`navbar ${scrolled ? "is-scrolled" : ""}`}>
      <nav aria-label="Main" className="gutter flex h-16 items-center justify-between">
        {/* Smaller on phones so the links still fit beside it. */}
        <Link href="/" className="shrink-0">
          <Logo variant="horizontal" size={34} label="Vyuhika Apps home" glow priority className="h-[30px] w-auto sm:h-[34px]" />
        </Link>
        <ul className="flex items-center gap-6 text-sm font-medium text-mist sm:gap-8">
          <li>
            <a href={`${home}#apps`} className="nav-link">Apps</a>
          </li>
          <li>
            <a href={site.links.youtube} {...externalLinkProps} className="nav-link">
              Journey
              <ExternalHint />
            </a>
          </li>
          <li className="hidden sm:block">
            <a href={site.links.linkedin} {...externalLinkProps} className="nav-link">
              LinkedIn
              <ExternalHint />
            </a>
          </li>
          {/* Shown on every width: the bar has room for it on phones too. */}
          <li>
            <a href={site.owner.portfolio} {...externalLinkProps} className="nav-link">
              About
              <ExternalHint />
            </a>
          </li>
        </ul>
      </nav>
    </header>
  );
}
