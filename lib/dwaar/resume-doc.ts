import { z } from "zod";

// A resume as structured data (not one block of text), so the page can show it as a proper resume and print it as a PDF.
// The AI fills it from the person's own resume. The person's contact details are NOT here: the AI never sees them, and
// the page adds them from the person's own Dwaar profile.

const line = (max: number) => z.string().max(max);

export const resumeDocSchema = z.object({
  name: line(100),
  headline: line(160),
  summary: line(900),
  skills: z.array(z.object({ label: line(40), items: z.array(line(40)).max(20) })).max(6),
  experience: z
    .array(z.object({ title: line(120), company: line(120), location: line(80), dates: line(60), bullets: z.array(line(300)).max(8) }))
    .max(8),
  projects: z.array(z.object({ name: line(120), bullets: z.array(line(300)).max(5) })).max(5),
  education: z.array(z.object({ degree: line(160), school: line(160), dates: line(60), detail: line(200) })).max(4),
  certifications: z.array(line(160)).max(8),
});
export type ResumeDoc = z.infer<typeof resumeDocSchema>;

export type ResumeContact = { name: string; email: string | null; phone: string | null; linkedin: string | null; links: string[] };

// Old Boosts were saved as plain text. New ones are saved as JSON text. null means "plain text, show it as it is".
export function parseResumeDoc(saved: string): ResumeDoc | null {
  try {
    const parsed = resumeDocSchema.safeParse(JSON.parse(saved));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

// The name on the resume: the AI's if it found a real one, otherwise the profile name.
export function resumeDisplayName(doc: ResumeDoc, profileName: string): string {
  const fromResume = doc.name.trim();
  return fromResume.length >= 3 && !fromResume.includes("[") ? fromResume : profileName.trim();
}

// Plain-text version, for the "Copy resume" button.
export function resumeDocToText(doc: ResumeDoc, contact: ResumeContact): string {
  const out: string[] = [];
  out.push(resumeDisplayName(doc, contact.name));
  if (doc.headline) out.push(doc.headline);
  const details = [contact.email, contact.phone, contact.linkedin, ...contact.links].filter((d): d is string => Boolean(d));
  if (details.length) out.push(details.join(" | "));
  const section = (title: string, lines: string[]) => lines.length && out.push("", title, ...lines);
  section("SUMMARY", doc.summary ? [doc.summary] : []);
  section("SKILLS", doc.skills.filter((s) => s.items.length).map((s) => `${s.label ? s.label + ": " : ""}${s.items.join(", ")}`));
  section(
    "EXPERIENCE",
    doc.experience.flatMap((e, i) => [
      ...(i ? [""] : []),
      [e.title, e.company, e.location].filter(Boolean).join(", ") + (e.dates ? ` (${e.dates})` : ""),
      ...e.bullets.map((b) => `- ${b}`),
    ]),
  );
  section("PROJECTS", doc.projects.flatMap((p, i) => [...(i ? [""] : []), p.name, ...p.bullets.map((b) => `- ${b}`)]));
  section(
    "EDUCATION",
    doc.education.map((e) => [e.degree, e.school].filter(Boolean).join(", ") + (e.dates ? ` (${e.dates})` : "") + (e.detail ? ` - ${e.detail}` : "")),
  );
  section("CERTIFICATIONS", doc.certifications.map((c) => `- ${c}`));
  return out.join("\n");
}

// Applies a cleaning function to every piece of text in the resume.
export function mapResumeText(doc: ResumeDoc, fn: (text: string) => string): ResumeDoc {
  const list = (items: string[]) => items.map(fn).filter((t) => t.length > 0);
  return {
    name: fn(doc.name),
    headline: fn(doc.headline),
    summary: fn(doc.summary),
    skills: doc.skills.map((s) => ({ label: fn(s.label), items: list(s.items) })),
    experience: doc.experience.map((e) => ({ title: fn(e.title), company: fn(e.company), location: fn(e.location), dates: fn(e.dates), bullets: list(e.bullets) })),
    projects: doc.projects.map((p) => ({ name: fn(p.name), bullets: list(p.bullets) })),
    education: doc.education.map((e) => ({ degree: fn(e.degree), school: fn(e.school), dates: fn(e.dates), detail: fn(e.detail) })),
    certifications: list(doc.certifications),
  };
}
