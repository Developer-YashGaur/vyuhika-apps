"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import "lenis/dist/lenis.css";

// Turns on smooth, eased scrolling with Lenis. allowNestedScroll lets scrollable boxes (chats, panels) scroll with the mouse wheel. Skipped when the visitor
// prefers reduced motion, so they get normal browser scrolling.
export default function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const lenis = new Lenis({ autoRaf: true, anchors: true, lerp: 0.1, allowNestedScroll: true });
    return () => lenis.destroy();
  }, []);

  return null;
}
