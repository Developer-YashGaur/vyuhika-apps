"use client";

import { useSyncExternalStore } from "react";
import { pickDebugInfo, type FeedbackDebug } from "@/lib/feedback/rules";

// Holds the latest Resume Matcher result so the feedback panel (in the shared layout)
// can offer to attach it. Only score, summary and keywords are kept, never resume or job text.

let current: FeedbackDebug | null = null;
const listeners = new Set<() => void>();

export function setFeedbackDebug(result: FeedbackDebug | null) {
  current = result ? pickDebugInfo(result) : null;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useFeedbackDebug(): FeedbackDebug | null {
  return useSyncExternalStore(subscribe, () => current, () => null);
}
