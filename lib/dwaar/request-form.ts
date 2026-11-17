// Checks what a candidate typed into the "ask for a referral" form. Pure code, easy to test.
// The database checks the same rules again; this gives friendly messages first.

export type RequestFieldName =
  | "companyId"
  | "jobTitle"
  | "jobUrl"
  | "jobId"
  | "jobDescription"
  | "note"
  | "resume"
  | "consent";
export type RequestFieldErrors = Partial<Record<RequestFieldName, string>>;

// The resume file as the server receives it (a File from the form, or a stand-in in tests).
export type ResumeFileLike = { size: number; arrayBuffer(): Promise<ArrayBuffer> };

export type RequestInput = {
  companyId: string;
  jobTitle: string;
  jobUrl: string;
  jobId: string | null;
  jobDescription: string;
  note: string | null;
  resumeFile: ResumeFileLike;
  resumeText: string; // the text the browser read out of the file (re-checked and cleaned before the AI sees it)
};
export type RequestParseResult = { ok: true; data: RequestInput } | { ok: false; errors: RequestFieldErrors };

export const REQUEST_LIMITS = { jobTitle: 120, jobUrl: 500, jobId: 60, note: 500 } as const;
export const JOB_DESCRIPTION_LIMITS = { min: 200, max: 8000 } as const;
export const RESUME_TEXT_LIMITS = { min: 200, max: 15000 } as const;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type FormLike = { get(name: string): FormDataEntryValue | ResumeFileLike | null };

function text(form: FormLike, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function fileOf(form: FormLike, name: string): ResumeFileLike | null {
  const value = form.get(name);
  if (value && typeof value === "object" && "arrayBuffer" in value && "size" in value && value.size > 0) return value;
  return null;
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
  const jobId = text(form, "jobId");
  const jobDescription = text(form, "jobDescription");
  const note = text(form, "note");
  const resumeText = text(form, "resumeText");
  const resumeFile = fileOf(form, "resume");
  const consent = form.get("consent") === "on";

  if (!UUID.test(companyId)) errors.companyId = "Please choose a company.";
  if (!jobTitle) errors.jobTitle = "Write the job title you are applying for.";
  else if (jobTitle.length > REQUEST_LIMITS.jobTitle) errors.jobTitle = `Keep the job title under ${REQUEST_LIMITS.jobTitle} characters.`;
  if (!jobUrl) errors.jobUrl = "Paste the link to the job posting.";
  else if (!isValidJobUrl(jobUrl)) errors.jobUrl = "Use the full link, starting with https://";
  if (jobId.length > REQUEST_LIMITS.jobId) errors.jobId = `Keep the job ID under ${REQUEST_LIMITS.jobId} characters.`;
  if (jobDescription.length < JOB_DESCRIPTION_LIMITS.min) {
    errors.jobDescription = `Paste the job description (at least ${JOB_DESCRIPTION_LIMITS.min} characters). We compare your resume with it.`;
  } else if (jobDescription.length > JOB_DESCRIPTION_LIMITS.max) {
    errors.jobDescription = `Keep the job description under ${JOB_DESCRIPTION_LIMITS.max.toLocaleString("en-US")} characters. Paste the main requirements only.`;
  }
  if (note.length > REQUEST_LIMITS.note) errors.note = `Keep the note under ${REQUEST_LIMITS.note} characters.`;

  if (!resumeFile) errors.resume = "Attach your resume as a PDF or Word (.docx) file.";
  else if (resumeText.length < RESUME_TEXT_LIMITS.min) {
    errors.resume = "We could not read enough text from that file. Use a text-based PDF or a Word file, not a scan.";
  } else if (resumeText.length > RESUME_TEXT_LIMITS.max) {
    errors.resume = "That resume is too long (over about 8 pages). Please attach a shorter version.";
  }
  if (!consent) errors.consent = "Please agree so we can check your resume against this job.";

  if (Object.keys(errors).length > 0 || !resumeFile) return { ok: false, errors };
  return {
    ok: true,
    data: { companyId, jobTitle, jobUrl, jobId: jobId || null, jobDescription, note: note || null, resumeFile, resumeText },
  };
}
