import { resumeDisplayName, type ResumeContact, type ResumeDoc } from "@/lib/dwaar/resume-doc";

// A small PDF writer for the resume: plain text in Helvetica, wrapped to the page, with section rules.
// It needs no library. All text is written as hex, so no character can break the file.

// Helvetica character widths (per 1000 units) for the characters 32 to 126.
const W = [278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556, 1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556, 333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584];

// How some text characters are written in the PDF's standard (WinAnsi) character set.
const SPECIAL: Record<string, number> = { "•": 0x95, "–": 0x96, "—": 0x97, "‘": 0x91, "’": 0x92, "“": 0x93, "”": 0x94, "…": 0x85, "·": 0xb7, "€": 0x80, "₹": 0x3f };

function toByte(ch: string): number {
  const code = ch.charCodeAt(0);
  if (code >= 32 && code <= 126) return code;
  if (SPECIAL[ch] !== undefined) return SPECIAL[ch];
  if (code >= 0xa0 && code <= 0xff) return code;
  return 0x3f; // "?"
}
const bytesOf = (text: string) => Array.from(text.replace(/\s+/g, " ")).map(toByte);
const hex = (text: string) => bytesOf(text).map((b) => b.toString(16).padStart(2, "0")).join("");

export function textWidth(text: string, size: number, bold = false): number {
  const units = bytesOf(text).reduce((sum, b) => sum + (b >= 32 && b <= 126 ? W[b - 32] : 556), 0);
  return (units * size * (bold ? 1.06 : 1)) / 1000;
}

export function wrap(text: string, size: number, maxWidth: number, bold = false): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const next = line ? `${line} ${word}` : word;
    if (line && textWidth(next, size, bold) > maxWidth) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

const PAGE = { w: 595, h: 842, margin: 50 };

type Op = { text: string; x: number; y: number; size: number; bold: boolean } | { rule: [number, number, number] };

class Writer {
  pages: Op[][] = [[]];
  y = PAGE.h - PAGE.margin;
  get width() { return PAGE.w - PAGE.margin * 2; }
  need(height: number) {
    if (this.y - height < PAGE.margin) {
      this.pages.push([]);
      this.y = PAGE.h - PAGE.margin;
    }
  }
  gap(points: number) { this.y -= points; }
  line(text: string, o: { size?: number; bold?: boolean; indent?: number; right?: string; lead?: number } = {}) {
    const size = o.size ?? 10;
    const lead = o.lead ?? size * 1.35;
    this.need(lead);
    this.y -= lead;
    const page = this.pages[this.pages.length - 1];
    page.push({ text, x: PAGE.margin + (o.indent ?? 0), y: this.y, size, bold: o.bold ?? false });
    if (o.right) page.push({ text: o.right, x: PAGE.w - PAGE.margin - textWidth(o.right, size), y: this.y, size, bold: false });
  }
  paragraph(text: string, o: { size?: number; indent?: number; bullet?: boolean; center?: boolean } = {}) {
    const size = o.size ?? 10;
    const indent = (o.indent ?? 0) + (o.bullet ? 12 : 0);
    const rows = wrap(text, size, this.width - indent);
    rows.forEach((row, i) => {
      if (o.bullet && i === 0) {
        this.need(size * 1.35);
        this.pages[this.pages.length - 1].push({ text: "•", x: PAGE.margin + (o.indent ?? 0) + 2, y: this.y - size * 1.35, size, bold: false });
      }
      this.line(row, { size, indent });
    });
  }
  section(title: string) {
    this.need(40);
    this.gap(10);
    this.line(title.toUpperCase(), { size: 10.5, bold: true });
    this.pages[this.pages.length - 1].push({ rule: [PAGE.margin, PAGE.w - PAGE.margin, this.y - 3] });
    this.gap(5);
  }
}

export function resumeToPdf(doc: ResumeDoc, contact: ResumeContact): Uint8Array {
  const w = new Writer();
  const name = resumeDisplayName(doc, contact.name) || "Resume";
  w.line(name, { size: 20, bold: true, lead: 24 });
  if (doc.headline) w.paragraph(doc.headline, { size: 11 });
  const details = [contact.email, contact.phone, contact.linkedin, ...contact.links].filter((d): d is string => Boolean(d));
  if (details.length) w.paragraph(details.join("  |  "), { size: 9 });

  if (doc.summary) {
    w.section("Summary");
    w.paragraph(doc.summary);
  }
  const skills = doc.skills.filter((s) => s.items.length > 0);
  if (skills.length) {
    w.section("Skills");
    for (const s of skills) w.paragraph(`${s.label ? s.label + ": " : ""}${s.items.join(", ")}`);
  }
  if (doc.experience.length) {
    w.section("Experience");
    doc.experience.forEach((e, i) => {
      if (i) w.gap(5);
      w.need(40);
      w.line([e.title, e.company].filter(Boolean).join(" · "), { bold: true, right: e.dates });
      if (e.location) w.line(e.location, { size: 9 });
      for (const b of e.bullets) w.paragraph(b, { bullet: true, indent: 4 });
    });
  }
  if (doc.projects.length) {
    w.section("Projects");
    doc.projects.forEach((p, i) => {
      if (i) w.gap(5);
      w.need(30);
      w.line(p.name, { bold: true });
      for (const b of p.bullets) w.paragraph(b, { bullet: true, indent: 4 });
    });
  }
  if (doc.education.length) {
    w.section("Education");
    for (const e of doc.education) {
      w.line([e.degree, e.school].filter(Boolean).join(" · "), { bold: true, right: e.dates });
      if (e.detail) w.paragraph(e.detail, { size: 9 });
    }
  }
  if (doc.certifications.length) {
    w.section("Certifications");
    for (const c of doc.certifications) w.paragraph(c, { bullet: true, indent: 4 });
  }

  return assemble(w.pages, name);
}

function assemble(pages: Op[][], title: string): Uint8Array {
  const n = pages.length;
  // Objects: 1 catalog, 2 page list, 3 regular font, 4 bold font, 5 info, then a page and its text for each page.
  const objects: string[] = [];
  objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[2] = `<< /Type /Pages /Kids [${pages.map((_, i) => `${6 + i * 2} 0 R`).join(" ")}] /Count ${n} >>`;
  objects[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>";
  objects[4] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>";
  objects[5] = `<< /Title <${hex(title)}> /Producer (Vyuhika Dwaar) >>`;
  pages.forEach((ops, i) => {
    const body = ["0.1 0.1 0.12 rg 0.1 0.1 0.12 RG 0.6 w"];
    for (const op of ops) {
      if ("rule" in op) body.push(`${op.rule[0]} ${op.rule[2].toFixed(2)} m ${op.rule[1]} ${op.rule[2].toFixed(2)} l S`);
      else body.push(`BT /${op.bold ? "F2" : "F1"} ${op.size} Tf ${op.x.toFixed(2)} ${op.y.toFixed(2)} Td <${hex(op.text)}> Tj ET`);
    }
    const stream = body.join("\n");
    objects[6 + i * 2] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE.w} ${PAGE.h}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${7 + i * 2} 0 R >>`;
    objects[7 + i * 2] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
  });

  let out = "%PDF-1.4\n";
  const offsets: number[] = [];
  for (let id = 1; id < objects.length; id++) {
    offsets[id] = out.length;
    out += `${id} 0 obj\n${objects[id]}\nendobj\n`;
  }
  const xref = out.length;
  out += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  for (let id = 1; id < objects.length; id++) out += `${String(offsets[id]).padStart(10, "0")} 00000 n \n`;
  out += `trailer\n<< /Size ${objects.length} /Root 1 0 R /Info 5 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Uint8Array.from(out, (c) => c.charCodeAt(0));
}
