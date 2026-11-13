"use client";

import { useEffect, useState } from "react";
import { animate, useReducedMotion } from "framer-motion";
import { scoreLabel } from "@/lib/validation";

// Circular gauge whose ring fills and number counts up from 0 to the score.

const RADIUS = 84;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function ScoreGauge({ score }: { score: number }) {
  const reduceMotion = useReducedMotion();
  const [shown, setShown] = useState(reduceMotion ? score : 0);

  useEffect(() => {
    if (reduceMotion) return;
    const controls = animate(0, score, {
      duration: 1.6,
      delay: 0.2,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setShown(Math.round(v)),
    });
    return () => controls.stop();
  }, [score, reduceMotion]);

  const value = reduceMotion ? score : shown;

  return (
    <div className="flex flex-col items-center">
      <div className="relative h-52 w-52 sm:h-60 sm:w-60">
        <svg viewBox="0 0 200 200" className="h-full w-full -rotate-90" aria-hidden="true">
          <defs>
            {/* The ring is rotated, so this runs cyan at the start of the arc to magenta at the end. */}
            <linearGradient id="gauge" x1="1" y1="0.5" x2="0" y2="0.5">
              <stop offset="0%" stopColor="#22d3ee" />
              <stop offset="60%" stopColor="#8b5cf6" />
              <stop offset="100%" stopColor="#e879f9" />
            </linearGradient>
          </defs>
          <circle cx="100" cy="100" r={RADIUS} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="12" />
          <circle
            cx="100"
            cy="100"
            r={RADIUS}
            fill="none"
            stroke="url(#gauge)"
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={CIRCUMFERENCE * (1 - value / 100)}
            className="gauge-ring"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="font-display text-5xl font-semibold tracking-[-0.05em] sm:text-6xl">
            {value}
            <span className="text-2xl text-mist sm:text-3xl">%</span>
          </p>
          <p className="mt-1 text-sm text-mist">match score</p>
        </div>
      </div>
      <p className="mt-4 font-display text-lg font-medium tracking-[-0.02em] text-accent">{scoreLabel(score)}</p>
      <p className="sr-only">
        Match score {score} out of 100, {scoreLabel(score).toLowerCase()}.
      </p>
    </div>
  );
}
