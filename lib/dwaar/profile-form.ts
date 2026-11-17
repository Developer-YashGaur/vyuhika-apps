// Checks what a person typed into the Dwaar profile form. Pure code: no database, easy to test.
// The database enforces the same rules again (it is the real gate); this gives friendly messages first.

export type FieldName = "displayName" | "headline" | "roles" | "companyId" | "workEmail" | "consent";
export type FieldErrors = Partial<Record<FieldName, string>>;

export type ProfileInput = {
  displayName: string;
  headline: string | null;
  isCandidate: boolean;
  isProvider: boolean;
  companyId: string | null; // only set when isProvider
  workEmail: string | null; // only set when isProvider, always lowercase
};

export type ParseResult = { ok: true; data: ProfileInput } | { ok: false; errors: FieldErrors };

type FormLike = { get(name: string): FormDataEntryValue | null };

export const LIMITS = { displayName: 80, headline: 120, email: 254 } as const;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function text(form: FormLike, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function checked(form: FormLike, name: string): boolean {
  return form.get(name) === "on";
}

export function isValidEmail(email: string): boolean {
  return EMAIL.test(email) && email.length <= LIMITS.email && email.split("@").length === 2;
}

// requireConsent is true when the person is creating their profile (they must accept the notice).
export function parseProfileForm(form: FormLike, options: { requireConsent: boolean }): ParseResult {
  const errors: FieldErrors = {};

  const displayName = text(form, "displayName");
  if (!displayName) errors.displayName = "Please enter your name.";
  else if (displayName.length > LIMITS.displayName) errors.displayName = `Please use ${LIMITS.displayName} characters or fewer.`;

  const headline = text(form, "headline");
  if (headline.length > LIMITS.headline) errors.headline = `Please use ${LIMITS.headline} characters or fewer.`;

  const isCandidate = checked(form, "isCandidate");
  const isProvider = checked(form, "isProvider");
  if (!isCandidate && !isProvider) errors.roles = "Choose at least one: looking for referrals, or offering referrals.";

  let companyId: string | null = null;
  let workEmail: string | null = null;
  if (isProvider) {
    const company = text(form, "companyId");
    if (!UUID.test(company)) errors.companyId = "Choose the company you work at.";
    else companyId = company.toLowerCase();

    const email = text(form, "workEmail").toLowerCase();
    if (!email) errors.workEmail = "Enter your work email.";
    else if (!isValidEmail(email)) errors.workEmail = "That does not look like an email address.";
    else workEmail = email;
  }

  if (options.requireConsent && !checked(form, "consent")) {
    errors.consent = "Please accept the terms and privacy notice to continue.";
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    data: { displayName, headline: headline || null, isCandidate, isProvider, companyId, workEmail },
  };
}
