"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Logo from "@/components/Logo";

// Shown while the AI works: the pulsing logo and status lines (passed in by each app)
// that change every second, then stay on the last one until the answer arrives.

export default function LoadingState({ lines }: { lines: string[] }) {
  const [line, setLine] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setLine((i) => Math.min(i + 1, lines.length - 1)), 1400);
    return () => clearInterval(timer);
  }, [lines.length]);

  return (
    <div role="status" className="glass-panel glow-cyan flex flex-col items-center px-6 py-16 text-center sm:py-20">
      {/* The logo gently breathes while the AI works (still for reduced motion). */}
      <div className="logo-pulse">
        <Logo variant="icon" size={128} decorative className="h-28 w-28 sm:h-32 sm:w-32" />
      </div>

      {/* Each line slides up and out as the next slides in, like a ticker.
          Invisible copies of every line sit in the same grid cell, so the box is as tall as the
          longest line: a line that wraps on a phone is never cut off, and the box never jumps. */}
      <div className="relative mt-8 grid min-h-8 w-full overflow-hidden" aria-live="polite">
        {lines.map((text, i) => (
          <p
            key={i}
            aria-hidden="true"
            className="invisible [grid-area:1/1] font-display text-lg font-medium tracking-[-0.02em] sm:text-xl"
          >
            {text}
          </p>
        ))}
        <AnimatePresence initial={false}>
          <motion.p
            key={line}
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -32 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-x-0 top-0 font-display text-lg font-medium tracking-[-0.02em] text-ink sm:text-xl"
          >
            {lines[line]}
          </motion.p>
        </AnimatePresence>
      </div>
      <p className="mt-2 text-sm text-mist">This takes a few seconds.</p>
    </div>
  );
}
