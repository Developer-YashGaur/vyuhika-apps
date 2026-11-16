"use client";

import { useSyncExternalStore } from "react";
import { pickLetterDebugInfo } from "@/lib/cover-letter/feedback";
import { pickDebugInfo, type FeedbackDebug, type LetterFeedbackDebug } from "@/lib/feedback/rules";

// Holds what the feedback panel (in the shared layout) may offer to attach to a "Wrong result" report.
// There is one slot per app. Each slot keeps only that app's allowed fields, never resume, job or letter text:
// - Resume Matcher: score, summary and keywords.
// - Cover Letter Writer: settings and counts only (see LetterFeedbackDebug).

let current: FeedbackDebug | null = null;
let currentLetter: LetterFeedbackDebug | null = null;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

export function setFeedbackDebug(result: FeedbackDebug | null) {
  current = result ? pickDebugInfo(result) : null;
  notify();
}

export function setLetterFeedbackDebug(info: LetterFeedbackDebug | null) {
  currentLetter = info ? pickLetterDebugInfo(info) : null;
  notify();
}

// Keeps the blank count up to date while the person fills in blanks. Does nothing when no letter is stored.
export function updateLetterBlanks(blanks: number) {
  if (!currentLetter || currentLetter.blanks === blanks) return;
  currentLetter = { ...currentLetter, blanks };
  notify();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// What is stored right now (the hooks below give the same values to React).
export const getFeedbackDebug = () => current;
export const getLetterFeedbackDebug = () => currentLetter;

export function useFeedbackDebug(): FeedbackDebug | null {
  return useSyncExternalStore(subscribe, getFeedbackDebug, () => null);
}

export function useLetterFeedbackDebug(): LetterFeedbackDebug | null {
  return useSyncExternalStore(subscribe, getLetterFeedbackDebug, () => null);
}
