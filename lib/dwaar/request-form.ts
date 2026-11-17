// Checks what a candidate typed into the "ask for a referral" form. Pure code, easy to test.
// The database checks the same rules again; this gives friendly messages first.

export type RequestFieldName = "companyId" | "jobTitle" | "jobUrl" | "note";
export type RequestFieldErrors = Partial<Record<RequestFieldName, string>>;

export type RequestInput = { companyId: string; jobTitle: string; jobUrl: string; note: string | null };
export type RequestParseResult = { ok: true; data: RequestInput } | { ok: false; errors: RequestFieldErrors };

export const REQUEST_LIMITS = { jobTitle: 120, jobUrl: 500, note: 500 } as const;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type FormLike = { get(name: string): FormDataEntryValue | null };

function text(form: FormLike, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value.trim() : "";
}

// Only https links to a real-looking address are accepted.
export function isValidJobUrl(value: string): boolean {
  if (!value || value.length > REQUEST_LIMITS.jobUrl) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname.includes(".");
  } catch {
    return false;
  }
}

export function parseRequestForm(form: FormLike): RequestParseResult {
  const errors: RequestFieldErrors = {};
  const companyId = text(form, "companyId");
  const jobTitle = text(form, "jobTitle");
  const jobUrl = text(form, "jobUrl");
  const note = text(form, "note");

  if (!UUID.test(companyId)) errors.companyId = "Please choose a company.";
  if (!jobTitle) errors.jobTitle = "Write the job title you are applying for.";
  else if (jobTitle.length > REQUEST_LIMITS.jobTitle) errors.jobTitle = `Keep the job title under ${REQUEST_LIMITS.jobTitle} characters.`;
  if (!jobUrl) errors.jobUrl = "Paste the link to the job posting.";
  else if (!isValidJobUrl(jobUrl)) errors.jobUrl = "Use the full link, starting with https://";
  if (note.length > REQUEST_LIMITS.note) errors.note = `Keep the note under ${REQUEST_LIMITS.note} characters.`;

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, data: { companyId, jobTitle, jobUrl, note: note || null } };
}
