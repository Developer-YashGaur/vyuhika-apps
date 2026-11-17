"use client";

import { useState } from "react";

export default function CopyButton({ text, label }: { text: string; label: string }) {
  const [status, setStatus] = useState<string | null>(null);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setStatus("Copied.");
    } catch {
      setStatus("Could not copy. Select the text and copy it yourself.");
    }
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-3">
      <button type="button" onClick={copy} className="dw-btn dw-btn-quiet dw-btn-sm">
        {label}
      </button>
      <span role="status" aria-live="polite" className="dw-muted text-sm">
        {status}
      </span>
    </span>
  );
}
