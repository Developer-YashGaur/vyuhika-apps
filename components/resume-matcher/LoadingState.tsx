"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Logo from "@/components/Logo";

// Shown while the match is being analysed: the pulsing logo
// and status lines that change every second, then stay on the last one until the answer arrives.

const statusLines = [
  "Reading your resume...",
  "Scanning job requirements...",
  "Matching skills and keywords...",
  "Finding gaps...",
  "Writing suggestions...",
];

export default function LoadingState() {
  const [line, setLine] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setLine((i) => Math.min(i + 1, statusLines.length - 1)), 1400);
    return () => clearInterval(timer);
  }, []);

  return (
    <div role="status" className="glass-panel glow-cyan flex flex-col items-center px-6 py-16 text-center sm:py-20">
      {/* The logo gently breathes while the AI works (still for reduced motion). */}
      <div className="logo-pulse">
        <Logo variant="icon" size={128} decorative className="h-28 w-28 sm:h-32 sm:w-32" />
      </div>

      {/* Each line slides up and out as the next slides in, like a ticker. */}
      <div className="relative mt-8 h-8 w-full overflow-hidden" aria-live="polite">
        <AnimatePresence initial={false}>
          <motion.p
            key={line}
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -32 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-x-0 font-display text-lg font-medium tracking-[-0.02em] text-ink sm:text-xl"
          >
            {statusLines[line]}
          </motion.p>
        </AnimatePresence>
      </div>
      <p className="mt-2 text-sm text-mist">This takes a few seconds.</p>
    </div>
  );
}
