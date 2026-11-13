"use client";

import { motion } from "framer-motion";
import ScoreGauge from "@/components/resume-matcher/ScoreGauge";
import type { MatchResult } from "@/lib/types";

// The results view: score gauge with a one-line summary, keyword chips and three suggestion cards.

const ease = [0.22, 1, 0.36, 1] as const;

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease } },
};

export default function Results({ result, onReset }: { result: MatchResult; onReset: () => void }) {
  return (
    <motion.div initial="hidden" animate="show" transition={{ staggerChildren: 0.15 }} className="space-y-5">
      <h2 className="sr-only">Your results</h2>

      {/* Phones: one column. Laptops: score on the left, keyword panels stacked on the right.
          Very wide screens: all three side by side. */}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] 2xl:grid-cols-3">
        <motion.section
          variants={fadeUp}
          aria-label="Match score"
          className="glass-panel glow-cyan flex flex-col items-center justify-center gap-6 py-10 text-center lg:row-span-2 2xl:row-span-1"
        >
          <ScoreGauge score={result.score} />
          <p className="max-w-sm leading-relaxed text-ink">{result.summary}</p>
        </motion.section>

        <motion.section variants={fadeUp} className="glass-panel glow-cyan">
          <KeywordGroup
            title="Matched keywords"
            hint="Found in both your resume and the job description."
            words={result.matchedKeywords}
            tone="cyan"
          />
        </motion.section>

        <motion.section variants={fadeUp} className="glass-panel glow-violet">
          <KeywordGroup
            title="Missing keywords"
            hint="The job asks for these, but your resume doesn't mention them."
            words={result.missingKeywords}
            tone="violet"
          />
        </motion.section>
      </div>

      <motion.h3 variants={fadeUp} className="section-subtitle font-display pt-6">
        Suggested improvements
      </motion.h3>

      <ul className="grid gap-5 md:grid-cols-3">
        {result.suggestions.map((s) => (
          <motion.li key={s.title} variants={fadeUp} className="glass-panel glow-violet">
            <h4 className="font-display text-lg font-medium leading-snug tracking-[-0.02em]">{s.title}</h4>
            <p className="measure mt-3 leading-relaxed text-mist">{s.detail}</p>
          </motion.li>
        ))}
      </ul>

      <motion.div variants={fadeUp} className="flex justify-center pt-8">
        <button type="button" onClick={onReset} className="btn-ghost">
          Try again
        </button>
      </motion.div>
    </motion.div>
  );
}

function KeywordGroup({
  title,
  hint,
  words,
  tone,
}: {
  title: string;
  hint: string;
  words: string[];
  tone: "cyan" | "violet";
}) {
  return (
    <div>
      <h3 className="font-display text-lg font-medium tracking-[-0.02em]">
        {title} <span className="text-mist">({words.length})</span>
      </h3>
      <p className="mt-1 text-sm text-mist">{hint}</p>
      <ul className="mt-4 flex flex-wrap gap-2">
        {words.map((w) => (
          <li key={w} className={`chip chip-${tone}`}>
            {w}
          </li>
        ))}
      </ul>
    </div>
  );
}
