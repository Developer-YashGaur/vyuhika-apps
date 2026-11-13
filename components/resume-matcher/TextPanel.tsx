"use client";

import type { ReactNode } from "react";
import { MAX_CHARS, MIN_CHARS, countChars } from "@/lib/validation";

// A large glass panel with a text box, a character counter and a "Load sample" link.
// Anything passed as `children` (like the file upload) appears above the text box.

type Props = {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  onLoadSample: () => void;
  children?: ReactNode;
};

export default function TextPanel({ id, label, placeholder, value, onChange, onLoadSample, children }: Props) {
  const count = countChars(value);
  const tooLong = count > MAX_CHARS;
  const ready = count >= MIN_CHARS && !tooLong;

  return (
    <div className="glass-panel glow-cyan flex h-full flex-col">
      <div className="flex items-baseline justify-between gap-4">
        <label htmlFor={id} className="font-display text-lg font-medium tracking-[-0.03em] sm:text-xl">
          {label}
        </label>
        <button type="button" onClick={onLoadSample} className="text-link shrink-0 text-sm">
          Load sample
        </button>
      </div>

      {children && <div className="mt-4">{children}</div>}

      <textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-describedby={`${id}-count`}
        spellCheck={false}
        className="matcher-textarea mt-4"
      />

      <p id={`${id}-count`} className="mt-3 flex items-center gap-2 text-sm">
        <span className={`count-dot ${ready ? "is-ready" : ""}`} aria-hidden="true" />
        {tooLong ? (
          <span className="text-rose-200">
            {count.toLocaleString("en-US")} / {MAX_CHARS.toLocaleString("en-US")} characters maximum
          </span>
        ) : ready ? (
          <span className="text-ink">{count.toLocaleString("en-US")} characters</span>
        ) : (
          <span className="text-mist">
            {count.toLocaleString("en-US")} / {MIN_CHARS} characters minimum
          </span>
        )}
      </p>
    </div>
  );
}
