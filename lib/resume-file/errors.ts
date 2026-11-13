// Errors shown to the user when a resume file can't be read.
// Each has a code (for tests and logic) and a friendly message (for the UI).

export type ResumeFileErrorCode =
  | "unsupported-type"
  | "too-large"
  | "empty"
  | "scanned-pdf"
  | "password-protected"
  | "unreadable";

const messages: Record<ResumeFileErrorCode, string> = {
  "unsupported-type": "That file type isn't supported. Please upload a PDF, DOCX or TXT file.",
  "too-large": "That file is over 5 MB. Please upload a smaller file or paste the text instead.",
  empty: "That file looks empty. Please check the file or paste your resume text instead.",
  "scanned-pdf": "This looks like a scanned file. Please paste the text or upload a text-based PDF.",
  "password-protected":
    "This file is password-protected. Please remove the password and try again, or paste the text instead.",
  unreadable: "We couldn't read that file. It may be damaged. Please try another file or paste the text instead.",
};

export class ResumeFileError extends Error {
  code: ResumeFileErrorCode;

  constructor(code: ResumeFileErrorCode) {
    super(messages[code]);
    this.name = "ResumeFileError";
    this.code = code;
  }
}
