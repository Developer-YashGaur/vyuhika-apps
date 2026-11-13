"use client";

import { useEffect, useRef } from "react";
import type { AnalyzeError, AnalyzeErrorCode } from "@/lib/analyze/errors";

// Shown when the analysis fails. The message comes from lib/analyze/errors.ts
// (or the server); the title and icon depend on what went wrong.

const titles: Record<AnalyzeErrorCode, string> = {
  "rate-limited": "Too many requests",
  timeout: "That took too long",
  "ai-failed": "We couldn't analyze this",
  offline: "You're offline",
  "invalid-input": "Please check your text",
};

type Props = {
  error: AnalyzeError;
  onRetry: () => void;
  onEdit: () => void;
};

export default function ErrorState({ error, onRetry, onEdit }: Props) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Move keyboard and screen reader focus to the error, so it's read out straight away.
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <div role="alert" className="glass-panel glow-violet flex flex-col items-center px-6 py-16 text-center sm:py-20">
      <span className="error-icon" aria-hidden="true">
        {error.code === "offline" ? <OfflineIcon /> : error.code === "rate-limited" || error.code === "timeout" ? <ClockIcon /> : <AlertIcon />}
      </span>
      <h2 ref={headingRef} tabIndex={-1} className="mt-6 font-display text-2xl font-medium tracking-[-0.03em] outline-none sm:text-3xl">
        {titles[error.code]}
      </h2>
      <p className="measure mt-3 leading-relaxed text-mist">{error.message}</p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        {error.code !== "invalid-input" && (
          <button type="button" onClick={onRetry} className="btn-glow">
            Try again
          </button>
        )}
        <button type="button" onClick={onEdit} className="btn-ghost">
          Edit your text
        </button>
      </div>
    </div>
  );
}

const iconProps = {
  viewBox: "0 0 24 24",
  width: 28,
  height: 28,
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function AlertIcon() {
  return (
    <svg {...iconProps}>
      <path d="M12 8v5m0 3.5v.01M10.3 3.9 2.6 17.2A2 2 0 0 0 4.3 20h15.4a2 2 0 0 0 1.7-2.8L13.7 3.9a2 2 0 0 0-3.4 0Z" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg {...iconProps}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function OfflineIcon() {
  return (
    <svg {...iconProps}>
      <path d="M2 8.8a15 15 0 0 1 4.2-2.6M9.8 5.2A15 15 0 0 1 22 8.8M5 12.5a10 10 0 0 1 4-2.2M15.5 10.6A10 10 0 0 1 19 12.5M8.5 16a5 5 0 0 1 7 0M12 20h.01M3 3l18 18" />
    </svg>
  );
}
