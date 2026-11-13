import { tidyText } from "@/lib/resume-file/rules";

// Plain text files need no library: the browser can read them directly.
export async function readTxt(file: Blob): Promise<string> {
  return tidyText(await file.text());
}
