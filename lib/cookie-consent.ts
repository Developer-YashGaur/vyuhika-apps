// The visitor's choice about Google Tag Manager (the only optional tracking on the site).
// Stored in this browser only. "yes" = allowed, "no" = declined, anything else = not asked yet.
export const CONSENT_KEY = "vyuhika-tracking-consent";
export const CONSENT_EVENT = "vyuhika-consent-change";

export type Consent = "yes" | "no" | null;

export function parseConsent(value: string | null | undefined): Consent {
  return value === "yes" || value === "no" ? value : null;
}

export function readConsent(): Consent {
  try {
    return parseConsent(window.localStorage.getItem(CONSENT_KEY));
  } catch {
    return null; // storage blocked: treat as not asked, so tracking stays off
  }
}

export function saveConsent(choice: "yes" | "no"): void {
  try {
    window.localStorage.setItem(CONSENT_KEY, choice);
  } catch {
    // storage blocked: the choice only lasts for this page view
  }
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: choice }));
}

export function subscribeConsent(callback: () => void): () => void {
  window.addEventListener(CONSENT_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(CONSENT_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}
