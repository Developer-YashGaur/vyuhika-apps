import { containsDelimiter } from "@/lib/ai/delimiters";
import type { MatchResult } from "@/lib/types";

// Safety checks for resumes in Dwaar. Pure code: no network, no database, easy to test.
// A resume and a job description are UNTRUSTED text. These checks run before and after the AI.

// ---------------------------------------------------------------- the file itself
export const RESUME_MAX_BYTES = 2 * 1024 * 1024; // 2 MB

export type ResumeKind = "pdf" | "docx";
export type UploadCheck =
  | { ok: true; kind: ResumeKind }
  | { ok: false; code: "empty" | "too-large" | "unsupported" | "macros" };

export const UPLOAD_MESSAGES: Record<Exclude<UploadCheck, { ok: true }>["code"], string> = {
  empty: "That file looks empty. Please choose another file.",
  "too-large": "That file is over 2 MB. Please upload a smaller PDF or Word (.docx) file.",
  unsupported: "We can only accept a PDF or a Word (.docx) file.",
  macros: "That Word file contains macros, so we cannot accept it. Save it as a normal .docx or a PDF.",
};

function startsWith(bytes: Uint8Array, text: string, at = 0): boolean {
  for (let i = 0; i < text.length; i++) if (bytes[at + i] !== text.charCodeAt(i)) return false;
  return true;
}

// True if the ASCII text appears anywhere in the bytes (used to look at a .docx's file names).
function containsAscii(bytes: Uint8Array, text: string): boolean {
  const first = text.charCodeAt(0);
  for (let i = 0; i <= bytes.length - text.length; i++) {
    if (bytes[i] === first && startsWith(bytes, text, i)) return true;
  }
  return false;
}

// Decides what a file REALLY is from its first bytes, not from its name or the type the browser claims.
export function checkResumeUpload(bytes: Uint8Array): UploadCheck {
  if (bytes.length === 0) return { ok: false, code: "empty" };
  if (bytes.length > RESUME_MAX_BYTES) return { ok: false, code: "too-large" };

  // PDF files start with "%PDF-" (some start with a few blank bytes first, so look in the first 1 KB).
  if (containsAscii(bytes.subarray(0, 1024), "%PDF-")) return { ok: true, kind: "pdf" };

  // .docx files are zip files ("PK") that hold a "word/" folder.
  if (startsWith(bytes, "PK\x03\x04") && containsAscii(bytes, "word/")) {
    if (containsAscii(bytes, "vbaProject.bin")) return { ok: false, code: "macros" };
    return { ok: true, kind: "docx" };
  }
  return { ok: false, code: "unsupported" };
}

// ---------------------------------------------------------------- the text
// The AI does not need contact details to compare skills, so they are removed before the text leaves our server.
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const PHONE = /(?<![\w])(?:\+?\d[\d\s().-]{7,}\d)(?![\w])/g;

// A phone number has at least 10 digits. Shorter digit runs, like a year range "2019-2024", are left alone.
export function redactContacts(text: string): string {
  return text
    .replace(EMAIL, "[email]")
    .replace(PHONE, (match) => (match.replace(/\D/g, "").length >= 10 ? "[phone]" : match));
}

// Phrases that try to talk to the AI instead of describing a person. Finding one does not prove bad intent
// (a resume for a prompt-engineering job may quote them), so the result is capped and labelled, not blocked.
const INJECTION_PATTERNS: RegExp[] = [
  /ignore\s+(?:all\s+|any\s+|the\s+|your\s+)?(?:previous|prior|above|earlier)\s+(?:instructions?|prompts?|rules?|messages?)/i,
  /disregard\s+(?:all\s+|any\s+|the\s+|your\s+)?(?:previous|prior|above|earlier)?\s*(?:instructions?|prompts?|rules?)/i,
  /(?:system|developer)\s+(?:prompt|message|instruction)/i,
  /you\s+are\s+now\s+(?:a|an|the|in)\b/i,
  /(?:give|assign|award|output|return|set)\b[^.\n]{0,40}\b(?:score|rating|match)\b[^.\n]{0,25}\b(?:100|10\s*\/\s*10|perfect|maximum|highest)/i,
  /(?:score|rating)\s*(?:of|=|:)\s*(?:100|10\s*\/\s*10)\b/i,
  /\b(?:maximum|highest|perfect|top|full)\s+(?:possible\s+)?(?:match\s+)?(?:score|rating|marks)\b/i,
  /(?:^|\n)\s*(?:system|assistant|developer)\s*:/i,
  /\b(?:jailbreak|prompt\s+injection)\b/i,
];

export function looksLikeInjection(text: string): boolean {
  return containsDelimiter(text) || INJECTION_PATTERNS.some((pattern) => pattern.test(text));
}

// Turns weird characters that hide text from people (zero-width characters, control characters) into nothing,
// so hidden instructions cannot be split across them to dodge the checks above.
export function normalizeForScan(text: string): string {
  return text.replace(/[​-‏⁠﻿­]/g, "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");
}

export type PreparedText = { text: string; flagged: boolean };

// What goes to the AI: cleaned, contact details removed, and a flag if it looks like an injection attempt.
export function prepareUntrustedText(raw: string): PreparedText {
  const clean = normalizeForScan(raw);
  return { text: redactContacts(clean), flagged: looksLikeInjection(clean) };
}

// ---------------------------------------------------------------- the AI's answer
export const FLAGGED_SCORE_CAP = 40;

// Removes web links from text the AI wrote, so nothing clickable (for example a phishing line) reaches the page.
export function stripLinks(text: string): string {
  return text.replace(/\b(?:https?:\/\/|www\.)\S+/gi, "[link removed]");
}

// After the AI: no links in any text, and if the resume or job text looked like an injection attempt the
// score is capped and the summary says so. The score is still only ever shown to the candidate themselves.
export function finalizeMatchResult(result: MatchResult, flagged: boolean): MatchResult {
  const clean: MatchResult = {
    score: result.score,
    summary: stripLinks(result.summary),
    matchedKeywords: result.matchedKeywords.map(stripLinks),
    missingKeywords: result.missingKeywords.map(stripLinks),
    suggestions: result.suggestions.map((s) => ({ title: stripLinks(s.title), detail: stripLinks(s.detail) })),
  };
  if (!flagged) return clean;
  return {
    ...clean,
    score: Math.min(clean.score, FLAGGED_SCORE_CAP),
    summary: "We could not fully verify this resume because it contains text that looks like instructions to an AI.",
  };
}
