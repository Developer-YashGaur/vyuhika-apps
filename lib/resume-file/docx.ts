import { ResumeFileError } from "@/lib/resume-file/errors";
import { tidyText } from "@/lib/resume-file/rules";

// Reads the text out of a Word .docx file with mammoth, which is only
// downloaded the first time someone picks a DOCX.

// A normal .docx is a ZIP file (starts with "PK"). A password-protected one is
// wrapped in an older Office container that starts with these bytes instead.
const ENCRYPTED_OFFICE_SIGNATURE = [0xd0, 0xcf, 0x11, 0xe0];

function startsWith(data: ArrayBuffer, signature: number[]): boolean {
  const bytes = new Uint8Array(data, 0, Math.min(signature.length, data.byteLength));
  return signature.every((byte, i) => bytes[i] === byte);
}

export async function readDocx(data: ArrayBuffer): Promise<string> {
  if (startsWith(data, ENCRYPTED_OFFICE_SIGNATURE)) throw new ResumeFileError("password-protected");

  const mammoth = await import("mammoth");
  try {
    const result = await mammoth.extractRawText({ arrayBuffer: data });
    return tidyText(result.value);
  } catch {
    throw new ResumeFileError("unreadable");
  }
}
