import { normalizeLinkedin, normalizePhone, parseLinks, parseSkills } from "@/lib/dwaar/profile-details";

// Checks what a person typed into the Dwaar profile form. Pure code: no database, easy to test.
// The database enforces the same rules again (it is the real gate); this gives friendly messages first.

export type FieldName = "displayName" | "headline" | "roles" | "companyId" | "workEmail" | "weeklyLimit" | "consent" | "linkedinUrl" | "phone" | "otherLinks" | "skills";
export type FieldErrors = Partial<Record<FieldName, string>>;

export type ProfileInput = {
  displayName: string;
  headline: string | null;
  isCandidate: boolean;
  isProvider: boolean;
  companyId: string | null; // only set when isProvider
  workEmail: string | null; // only set when isProvider, always lowercase
  acceptsRequests: boolean; // employee opted in to receive referral requests (never true for non-providers)
  weeklyLimit: number; // most requests they want per week, 1 to 50
  // Only for people looking for referrals (empty otherwise). The database checks the same shapes again.
  linkedinUrl: string | null;
  phone: string | null;
  otherLinks: string[];
  skills: string[];
};

export type ParseResult = { ok: true; data: ProfileInput } | { ok: false; errors: FieldErrors };

type FormLike = { get(name: string): FormDataEntryValue | null };

export const LIMITS = { displayName: 80, headline: 120, email: 254, weeklyMin: 1, weeklyMax: 50, weeklyDefault: 5 } as const;

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

  // Companies ask for these, so a person looking for referrals must give them. Other links are optional.
  let linkedinUrl: string | null = null;
  let phone: string | null = null;
  let otherLinks: string[] = [];
  let skills: string[] = [];
  if (isCandidate) {
    const rawLinkedin = text(form, "linkedinUrl");
    if (!rawLinkedin) errors.linkedinUrl = "Please add your LinkedIn profile link.";
    else {
      linkedinUrl = normalizeLinkedin(rawLinkedin);
      if (!linkedinUrl) errors.linkedinUrl = "Use your LinkedIn profile link, like linkedin.com/in/your-name.";
    }

    const rawPhone = text(form, "phone");
    if (!rawPhone) errors.phone = "Please add your phone number.";
    else {
      phone = normalizePhone(rawPhone);
      if (!phone) errors.phone = "Enter the number with its country code, like +91 98765 43210.";
    }

    const links = parseLinks(text(form, "otherLinks"));
    if (!links.ok) errors.otherLinks = links.message;
    else otherLinks = links.links;

    const parsedSkills = parseSkills(text(form, "skills"));
    if (!parsedSkills.ok) errors.skills = parsedSkills.message;
    else if (parsedSkills.skills.length === 0) errors.skills = "Please add at least one skill, separated by commas.";
    else skills = parsedSkills.skills;
  }

  let companyId: string | null = null;
  let workEmail: string | null = null;
  let acceptsRequests = false;
  let weeklyLimit: number = LIMITS.weeklyDefault;
  if (isProvider) {
    acceptsRequests = checked(form, "acceptsRequests");
    const rawLimit = text(form, "weeklyLimit");
    if (rawLimit) {
      const n = Number(rawLimit);
      if (!Number.isInteger(n) || n < LIMITS.weeklyMin || n > LIMITS.weeklyMax) {
        errors.weeklyLimit = `Enter a whole number from ${LIMITS.weeklyMin} to ${LIMITS.weeklyMax}.`;
      } else weeklyLimit = n;
    }
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
    data: { displayName, headline: headline || null, isCandidate, isProvider, companyId, workEmail, acceptsRequests, weeklyLimit, linkedinUrl, phone, otherLinks, skills },
  };
}
