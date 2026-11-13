import { ResumeFileError } from "@/lib/resume-file/errors";
import { tidyText } from "@/lib/resume-file/rules";

// Reads the text out of a PDF with pdf.js. pdf.js is large, so it's only
// downloaded the first time someone picks a PDF.

// If a PDF has fewer real characters than this, it's almost certainly a scanned image.
const MIN_TEXT_CHARS = 20;

type PdfJs = typeof import("pdfjs-dist");

// Loads pdf.js for the browser and points it at its worker file
// (the worker does the heavy parsing off the main thread).
async function loadBrowserPdfJs(): Promise<PdfJs> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
  return pdfjs;
}

// `loadPdfJs` can be swapped out in tests (Node needs pdf.js's "legacy" build).
export async function readPdf(data: ArrayBuffer, loadPdfJs: () => Promise<PdfJs> = loadBrowserPdfJs): Promise<string> {
  const pdfjs = await loadPdfJs();

  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(data) });
  let pdf;
  try {
    pdf = await loadingTask.promise;
  } catch (error) {
    if ((error as Error)?.name === "PasswordException") throw new ResumeFileError("password-protected");
    throw new ResumeFileError("unreadable");
  }

  try {
    const pages: string[] = [];
    for (let n = 1; n <= pdf.numPages; n++) {
      const page = await pdf.getPage(n);
      const content = await page.getTextContent();
      let pageText = "";
      for (const item of content.items) {
        if (!("str" in item)) continue;
        pageText += item.str + (item.hasEOL ? "\n" : "");
      }
      pages.push(pageText);
    }

    const text = tidyText(pages.join("\n\n"));
    if (text.replace(/\s/g, "").length < MIN_TEXT_CHARS) throw new ResumeFileError("scanned-pdf");
    return text;
  } finally {
    await loadingTask.destroy(); // frees the memory pdf.js used
  }
}
