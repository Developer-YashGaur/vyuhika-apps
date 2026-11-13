import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { readDocx } from "@/lib/resume-file/docx";
import { ResumeFileError } from "@/lib/resume-file/errors";
import { readResumeFile } from "@/lib/resume-file";
import { readPdf } from "@/lib/resume-file/pdf";
import { MAX_FILE_BYTES, checkFile, getFileKind, tidyText } from "@/lib/resume-file/rules";

// Node can't run pdf.js's browser build, so tests load its "legacy" build instead.
const loadNodePdfJs = () => import("pdfjs-dist/legacy/build/pdf.mjs") as Promise<typeof import("pdfjs-dist")>;

async function fixture(name: string): Promise<ArrayBuffer> {
  const buffer = await readFile(new URL(`./fixtures/${name}`, import.meta.url));
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
}

// Runs `fn` and returns the error code it throws.
async function errorCode(fn: () => unknown): Promise<string> {
  try {
    await fn();
  } catch (error) {
    if (error instanceof ResumeFileError) return error.code;
    throw error;
  }
  throw new Error("Expected a ResumeFileError, but nothing was thrown");
}

describe("getFileKind", () => {
  it("recognises PDF, DOCX and TXT by extension, in any case", () => {
    expect(getFileKind({ name: "cv.pdf", type: "" })).toBe("pdf");
    expect(getFileKind({ name: "My Resume.DOCX", type: "" })).toBe("docx");
    expect(getFileKind({ name: "notes.txt", type: "" })).toBe("txt");
  });

  it("falls back to the MIME type when the name has no extension", () => {
    expect(getFileKind({ name: "resume", type: "application/pdf" })).toBe("pdf");
  });

  it("rejects other types, including old .doc files and images", () => {
    expect(getFileKind({ name: "resume.doc", type: "application/msword" })).toBeNull();
    expect(getFileKind({ name: "scan.png", type: "image/png" })).toBeNull();
    expect(getFileKind({ name: "resume", type: "" })).toBeNull();
  });
});

describe("checkFile", () => {
  it("accepts a supported file up to exactly 5 MB", () => {
    expect(checkFile({ name: "cv.pdf", type: "application/pdf", size: MAX_FILE_BYTES })).toBe("pdf");
  });

  it("rejects files over 5 MB", async () => {
    expect(await errorCode(() => checkFile({ name: "cv.pdf", type: "", size: MAX_FILE_BYTES + 1 }))).toBe("too-large");
  });

  it("rejects unsupported types before checking size", async () => {
    expect(await errorCode(() => checkFile({ name: "photo.jpg", type: "image/jpeg", size: 10 }))).toBe(
      "unsupported-type",
    );
  });

  it("rejects empty files", async () => {
    expect(await errorCode(() => checkFile({ name: "cv.txt", type: "text/plain", size: 0 }))).toBe("empty");
  });
});

describe("tidyText", () => {
  it("normalises line breaks, trailing spaces and long gaps", () => {
    expect(tidyText("  a  \r\nb\r\n\r\n\r\n\r\nc  ")).toBe("a\nb\n\nc");
  });
});

describe("readResumeFile with .txt", () => {
  it("reads and tidies a text file", async () => {
    const file = new File([await fixture("resume.txt")], "resume.txt", { type: "text/plain" });
    expect(await readResumeFile(file)).toBe("Priya Sharma\nFrontend Developer\n\nSkills: React, TypeScript, SQL");
  });

  it("treats a file of only whitespace as empty", async () => {
    const file = new File(["   \n\n  "], "blank.txt", { type: "text/plain" });
    expect(await errorCode(() => readResumeFile(file))).toBe("empty");
  });

  it("rejects an unsupported file before reading it", async () => {
    const file = new File(["hello"], "resume.doc", { type: "application/msword" });
    expect(await errorCode(() => readResumeFile(file))).toBe("unsupported-type");
  });
});

describe("readPdf", () => {
  it("extracts text from a text-based PDF", async () => {
    const text = await readPdf(await fixture("resume.pdf"), loadNodePdfJs);
    expect(text).toContain("Priya Sharma");
    expect(text).toContain("Skills: React, TypeScript, SQL");
  });

  it("reports a PDF with no text as scanned", async () => {
    const data = await fixture("scanned.pdf");
    expect(await errorCode(() => readPdf(data, loadNodePdfJs))).toBe("scanned-pdf");
  });

  it("reports a password-protected PDF", async () => {
    // Simulates the error pdf.js throws for a password-protected file.
    const fakePdfJs = async () =>
      ({
        getDocument: () => ({
          destroy: async () => {},
          promise: Promise.reject(Object.assign(new Error("No password given"), { name: "PasswordException" })),
        }),
      }) as unknown as typeof import("pdfjs-dist");
    expect(await errorCode(() => readPdf(new ArrayBuffer(8), fakePdfJs))).toBe("password-protected");
  });

  it("reports a file that isn't really a PDF as unreadable", async () => {
    const notPdf = new TextEncoder().encode("this is not a pdf").buffer as ArrayBuffer;
    expect(await errorCode(() => readPdf(notPdf, loadNodePdfJs))).toBe("unreadable");
  });
});

describe("readDocx", () => {
  it("extracts text from a .docx file", async () => {
    expect(await readDocx(await fixture("resume.docx"))).toBe(
      "Priya Sharma\n\nFrontend Developer\n\nSkills: React, TypeScript, SQL",
    );
  });

  it("reports a password-protected .docx", async () => {
    // Encrypted Office files start with this signature instead of a ZIP header.
    const encrypted = new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]).buffer;
    expect(await errorCode(() => readDocx(encrypted))).toBe("password-protected");
  });

  it("reports a damaged .docx as unreadable", async () => {
    const broken = new TextEncoder().encode("PK not really a zip").buffer as ArrayBuffer;
    expect(await errorCode(() => readDocx(broken))).toBe("unreadable");
  });
});
