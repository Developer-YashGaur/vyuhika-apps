import { ResumeFileError } from "@/lib/resume-file/errors";

// Which files we accept, and how big they can be.

export const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB

export type ResumeFileKind = "pdf" | "docx" | "txt";

// For the <input accept="..."> attribute.
export const ACCEPT_ATTRIBUTE =
  ".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain";

const kindByExtension: Record<string, ResumeFileKind> = {
  pdf: "pdf",
  docx: "docx",
  txt: "txt",
};

const kindByMimeType: Record<string, ResumeFileKind> = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "text/plain": "txt",
};

// Works out the file type from its name first (phones sometimes send no MIME type),
// then from its MIME type. Returns null if it's not a type we support.
export function getFileKind(file: { name: string; type: string }): ResumeFileKind | null {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (file.name.includes(".") && kindByExtension[extension]) return kindByExtension[extension];
  return kindByMimeType[file.type] ?? null;
}

// Throws a friendly error if the file is the wrong type, too big, or empty.
export function checkFile(file: { name: string; type: string; size: number }): ResumeFileKind {
  const kind = getFileKind(file);
  if (!kind) throw new ResumeFileError("unsupported-type");
  if (file.size > MAX_FILE_BYTES) throw new ResumeFileError("too-large");
  if (file.size === 0) throw new ResumeFileError("empty");
  return kind;
}

// Tidies extracted text: consistent line breaks, no trailing spaces, at most one blank line in a row.
export function tidyText(text: string): string {
  return text
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
