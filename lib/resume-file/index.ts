import { ResumeFileError } from "@/lib/resume-file/errors";
import { checkFile } from "@/lib/resume-file/rules";
import { readTxt } from "@/lib/resume-file/txt";

// Reads a resume file entirely in the browser. Nothing is sent to a server.
// Checks the type and size, picks the right reader, and makes sure we got some text.
export async function readResumeFile(file: File): Promise<string> {
  const kind = checkFile(file);

  let text: string;
  if (kind === "txt") {
    text = await readTxt(file);
  } else if (kind === "pdf") {
    const { readPdf } = await import("@/lib/resume-file/pdf");
    text = await readPdf(await file.arrayBuffer());
  } else {
    const { readDocx } = await import("@/lib/resume-file/docx");
    text = await readDocx(await file.arrayBuffer());
  }

  if (!text) throw new ResumeFileError("empty");
  return text;
}

export { ResumeFileError } from "@/lib/resume-file/errors";
export { ACCEPT_ATTRIBUTE, MAX_FILE_BYTES } from "@/lib/resume-file/rules";
