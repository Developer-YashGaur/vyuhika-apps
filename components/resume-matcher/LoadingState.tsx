"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

// Shown while the match is being analysed: a pulsing neural network
// and status lines that change every second, then stay on the last one until the answer arrives.

const statusLines = [
  "Reading your resume...",
  "Scanning job requirements...",
  "Matching skills and keywords...",
  "Finding gaps...",
  "Writing suggestions...",
];

// Node positions in a 200×200 box. The middle node is the "core".
const nodes = [
  [100, 100], [40, 50], [160, 45], [30, 140], [170, 150], [100, 25], [95, 175], [62, 98], [138, 102],
];
const links = [
  [0, 7], [0, 8], [0, 5], [0, 6], [7, 1], [7, 3], [8, 2], [8, 4], [5, 1], [5, 2], [6, 3], [6, 4], [1, 3], [2, 4],
];

export default function LoadingState() {
  const [line, setLine] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setLine((i) => Math.min(i + 1, statusLines.length - 1)), 1400);
    return () => clearInterval(timer);
  }, []);

  return (
    <div role="status" className="glass-panel glow-cyan flex flex-col items-center px-6 py-16 text-center sm:py-20">
      <svg viewBox="0 0 200 200" className="neural-loader h-44 w-44 sm:h-52 sm:w-52" aria-hidden="true">
        <defs>
          <radialGradient id="core-glow">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
            <stop offset="30%" stopColor="#22d3ee" stopOpacity="0.55" />
            <stop offset="70%" stopColor="#8b5cf6" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
          </radialGradient>
        </defs>
        {links.map(([a, b], i) => (
          <line
            key={i}
            x1={nodes[a][0]}
            y1={nodes[a][1]}
            x2={nodes[b][0]}
            y2={nodes[b][1]}
            className="neural-link"
            style={{ animationDelay: `${i * 0.12}s` }}
          />
        ))}
        {nodes.map(([cx, cy], i) =>
          i === 0 ? (
            <g key={i} className="neural-core">
              <circle cx={cx} cy={cy} r="34" fill="url(#core-glow)" />
              <circle cx={cx} cy={cy} r="8" fill="#ffffff" />
            </g>
          ) : (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r="4"
              className="neural-node"
              style={{ animationDelay: `${i * 0.18}s` }}
            />
          ),
        )}
      </svg>

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
