// The extra details companies ask for: LinkedIn link, phone number, other links (GitHub, portfolio) and skills.
// Pure code: it cleans what a person typed into the exact shape the database accepts (the database checks again).

export const DETAIL_LIMITS = { maxLinks: 3, maxSkills: 15, skillLength: 40, linkLength: 255 } as const;

const LINKEDIN = /^https:\/\/([a-z0-9-]+\.)?linkedin\.com\/in\/[A-Za-z0-9%_.~-]+\/?$/;
const PHONE = /^\+[1-9][0-9]{7,14}$/;

export function normalizeLinkedin(raw: string): string | null {
  let value = raw.trim();
  if (!value) return null;
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(value)) value = `https://${value}`;
  try {
    const url = new URL(value);
    if ((url.protocol !== "https:" && url.protocol !== "http:") || url.username || url.password) return null;
    const clean = `https://${url.hostname.toLowerCase()}${url.pathname}`;
    return LINKEDIN.test(clean) && clean.length <= 300 ? clean : null;
  } catch {
    return null;
  }
}

// Accepts +91 98765 43210, 098765-43210 style input. A plain 10-digit Indian mobile number (starts with 6 to 9) gets +91.
export function normalizePhone(raw: string): string | null {
  let value = raw.trim().replace(/[\s().-]/g, "");
  if (!value) return null;
  if (value.startsWith("00")) value = `+${value.slice(2)}`;
  if (!value.startsWith("+")) {
    const digits = value.replace(/^0/, "");
    if (/^[6-9][0-9]{9}$/.test(digits)) value = `+91${digits}`;
  }
  return PHONE.test(value) ? value : null;
}

export type LinksResult = { ok: true; links: string[] } | { ok: false; message: string };

// One link per line (commas and spaces also work). A link without https:// gets it. Plain http is refused.
export function parseLinks(raw: string): LinksResult {
  const parts = raw.split(/[\s,]+/).map((p) => p.trim()).filter(Boolean);
  const links: string[] = [];
  for (const part of parts) {
    if (/^http:\/\//i.test(part)) return { ok: false, message: "Links must start with https://" };
    const candidate = /^https:\/\//i.test(part) ? part : `https://${part}`;
    let url: URL;
    try {
      url = new URL(candidate);
    } catch {
      return { ok: false, message: `“${part.slice(0, 40)}” is not a valid link.` };
    }
    if (url.protocol !== "https:" || !url.hostname.includes(".") || url.username || url.password) {
      return { ok: false, message: `“${part.slice(0, 40)}” is not a valid link.` };
    }
    const clean = url.toString();
    if (clean.length > DETAIL_LIMITS.linkLength) return { ok: false, message: "One of the links is too long." };
    if (!links.includes(clean)) links.push(clean);
  }
  if (links.length > DETAIL_LIMITS.maxLinks) return { ok: false, message: `Please add at most ${DETAIL_LIMITS.maxLinks} links.` };
  return { ok: true, links };
}

export type SkillsResult = { ok: true; skills: string[] } | { ok: false; message: string };

// Skills separated by commas or new lines. Control characters and angle brackets are removed, repeats are dropped.
export function parseSkills(raw: string): SkillsResult {
  const skills: string[] = [];
  for (const part of raw.split(/[,\n;]+/)) {
    const skill = part.replace(/[\u0000-\u001f\u007f<>]/g, " ").replace(/\s+/g, " ").trim();
    if (!skill) continue;
    if (skill.length > DETAIL_LIMITS.skillLength) return { ok: false, message: `Each skill can be up to ${DETAIL_LIMITS.skillLength} characters.` };
    if (!skills.some((s) => s.toLowerCase() === skill.toLowerCase())) skills.push(skill);
  }
  if (skills.length > DETAIL_LIMITS.maxSkills) return { ok: false, message: `Please list at most ${DETAIL_LIMITS.maxSkills} skills.` };
  return { ok: true, skills };
}

type Details = { linkedin_url: string | null; phone: string | null; skills: string[] };

// A candidate must have these before asking for a referral. Other links are optional.
export function candidateDetailsComplete(profile: Details): boolean {
  return Boolean(profile.linkedin_url) && Boolean(profile.phone) && profile.skills.length > 0;
}
