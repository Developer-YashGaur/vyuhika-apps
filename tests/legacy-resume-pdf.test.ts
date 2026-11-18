import { describe, expect, it } from "vitest";
import { resumePdfFileName } from "@/lib/dwaar/file-name";
import { parseLegacyResume } from "@/lib/dwaar/legacy-resume";
import { resumeToPdf, textWidth, wrap } from "@/lib/dwaar/pdf";

const OLD = `[Your name]
SUMMARY
Backend-focused Software Engineer with Python experience.
SKILLS
Languages: Python, SQL
EXPERIENCE
ACCENTURE — Custom Software Engineer, Senior Analyst | April 2026 – Present
• Built APIs used by 3 teams.
• Cut latency.
EDUCATION
B.Tech, Computer Science & Engineering — Institute of Engineering & Technology, Alwar | 2018–2022
`;

describe("old plain-text Boost read as a resume", () => {
  const doc = parseLegacyResume(OLD);
  it("finds the sections", () => {
    expect(doc?.summary).toContain("Backend-focused");
    expect(doc?.skills[0]).toEqual({ label: "Languages", items: ["Python", "SQL"] });
    expect(doc?.experience[0].company).toBe("ACCENTURE");
    expect(doc?.experience[0].title).toBe("Custom Software Engineer, Senior Analyst");
    expect(doc?.experience[0].dates).toBe("April 2026 – Present");
    expect(doc?.experience[0].bullets.length).toBe(2);
    expect(doc?.education[0].dates).toBe("2018–2022");
    expect(doc?.name).toBe("");
  });
  it("returns null when there are no sections", () => expect(parseLegacyResume("just some words")).toBe(null));
});

describe("PDF", () => {
  const doc = parseLegacyResume(OLD)!;
  const contact = { name: "Asha Rao", email: "a@b.com", phone: null, linkedin: null, links: [] };
  const text = Buffer.from(resumeToPdf(doc, contact)).toString("latin1");
  it("is a valid-looking PDF with correct xref offsets", () => {
    expect(text.startsWith("%PDF-1.4")).toBe(true);
    expect(text.trim().endsWith("%%EOF")).toBe(true);
    const start = Number(/startxref\n(\d+)/.exec(text)?.[1]);
    expect(text.slice(start, start + 4)).toBe("xref");
    const first = Number(/xref\n0 \d+\n0000000000 65535 f \n(\d{10})/.exec(text)?.[1]);
    expect(text.slice(first, first + 7)).toBe("1 0 obj");
  });
  it("makes more pages for a long resume", () => {
    const long = { ...doc, experience: Array.from({ length: 8 }, () => ({ ...doc.experience[0], bullets: Array(8).fill("x ".repeat(100)) })) };
    expect((Buffer.from(resumeToPdf(long, contact)).toString("latin1").match(/\/Type \/Page /g) ?? []).length > 1).toBe(true);
  });
  it("wraps text inside the width", () => {
    const rows = wrap("word ".repeat(80), 10, 200);
    expect(rows.length > 3).toBe(true);
    for (const r of rows) expect(textWidth(r, 10) <= 200).toBe(true);
  });
});

describe("PDF file name", () => {
  it("is name_role", () => expect(resumePdfFileName("Asha Rao", "Python Backend Developer")).toBe("Asha-Rao_Python-Backend-Developer.pdf"));
  it("copes with missing parts and odd characters", () => {
    expect(resumePdfFileName("", "")).toBe("My-Resume.pdf");
    expect(resumePdfFileName("José", "Dev / Ops (Sr.)")).toBe("Jose_Dev-Ops-Sr.pdf");
    expect(resumePdfFileName("../x", "a\"b")).toBe("x_a-b.pdf");
  });
});
