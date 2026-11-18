import { savedResumeSchema, type SavedResume } from "@/lib/dwaar/resume-doc";

// Boosts written before the structured resume are plain text ("SUMMARY", "EXPERIENCE", bullets with "•").
// This reads that text into the same resume layout, as well as it can. If it cannot find any section, it returns
// null and the page shows the text as it is.

type Section = "summary" | "skills" | "experience" | "projects" | "education" | "certifications";

const HEADINGS: Record<string, Section> = {
  summary: "summary", "professional summary": "summary", profile: "summary", objective: "summary",
  skills: "skills", "technical skills": "skills", "key skills": "skills",
  experience: "experience", "work experience": "experience", "professional experience": "experience", employment: "experience",
  projects: "projects", "key projects": "projects",
  education: "education", academics: "education",
  certifications: "certifications", certificates: "certifications", "certifications and training": "certifications",
};

const BULLET = /^\s*[•▪●◦*\-–]\s+/;
const cut = (text: string, max: number) => text.trim().slice(0, max);

function headingOf(line: string): Section | null {
  const key = line.trim().replace(/[:\s]+$/, "").toLowerCase();
  return HEADINGS[key] ?? null;
}

// "Company — Title | dates"  or  "Title, Company | dates"
function splitHeader(line: string) {
  const [left, ...rest] = line.split(/\s+\|\s+/);
  const dates = rest.join(" | ").trim();
  const parts = left.split(/\s+[—–-]\s+/);
  if (parts.length >= 2) return { first: parts[0].trim(), second: parts.slice(1).join(" — ").trim(), dates };
  return { first: "", second: left.trim(), dates };
}

// Some old Boosts were saved on one line. Put the line breaks back before headings, bullets and job titles.
function restoreLines(text: string): string {
  const flat = text.replace(/\r/g, "");
  if (flat.split("\n").filter((l) => l.trim()).length >= 6) return flat;
  return flat
    .replace(/\s+(SUMMARY|SKILLS|TECHNICAL SKILLS|EXPERIENCE|WORK EXPERIENCE|PROFESSIONAL EXPERIENCE|PROJECTS|EDUCATION|CERTIFICATIONS)(?=\s)/g, "\n$1\n")
    .replace(/\s*•\s*/g, "\n• ")
    .replace(/([.!?])\s+(?=[A-Z][A-Z&.,'-]*(?:\s+[A-Z][A-Z&.,'-]*)*\s+[—–]\s)/g, "$1\n")
    .replace(/([.!?])\s+(?=[A-Z][\w/ &]{0,30}:\s)/g, "$1\n");
}

export function parseLegacyResume(text: string): SavedResume | null {
  const lines = restoreLines(text).split("\n").map((l) => l.trimEnd());
  const head: string[] = [];
  const body: Record<Section, string[]> = { summary: [], skills: [], experience: [], projects: [], education: [], certifications: [] };
  let current: Section | null = null;
  for (const line of lines) {
    if (!line.trim()) continue;
    const heading = headingOf(line);
    if (heading) {
      current = heading;
      continue;
    }
    if (current) body[current].push(line);
    else head.push(line.trim());
  }
  if (Object.values(body).every((b) => b.length === 0)) return null;

  const name = head[0] && !head[0].includes("[") && head[0].length <= 60 ? head[0] : "";
  const headline = head.slice(name ? 1 : 0).find((l) => !l.includes("@") && !/\d{6,}/.test(l)) ?? "";

  const skills = body.skills.map((l) => {
    const clean = l.replace(BULLET, "");
    const [label, ...rest] = clean.includes(":") ? clean.split(":") : ["", clean];
    return { label: cut(label, 40), items: (rest.join(":") || "").replace(/\.\s*$/, "").split(/[,;]/).map((s) => cut(s, 40)).filter(Boolean).slice(0, 20) };
  }).filter((s) => s.items.length > 0).slice(0, 6);

  const experience: SavedResume["experience"] = [];
  for (const l of body.experience) {
    if (BULLET.test(l)) {
      experience.at(-1)?.bullets.push(cut(l.replace(BULLET, ""), 300));
    } else {
      const h = splitHeader(l);
      // "COMPANY — Title" in the old format: the first part is the company
      experience.push({ title: cut(h.second, 120), company: cut(h.first, 120), location: "", dates: cut(h.dates, 60), bullets: [] });
    }
  }

  const projects: SavedResume["projects"] = [];
  for (const l of body.projects) {
    if (BULLET.test(l)) projects.at(-1)?.bullets.push(cut(l.replace(BULLET, ""), 300));
    else projects.push({ name: cut(l, 120), bullets: [] });
  }

  const education = body.education.filter((l) => !BULLET.test(l)).map((l) => {
    const h = splitHeader(l);
    return { degree: cut(h.first || h.second, 160), school: cut(h.first ? h.second : "", 160), dates: cut(h.dates, 60), detail: "" };
  });

  const parsed = savedResumeSchema.safeParse({
    name,
    headline: cut(headline, 160),
    summary: cut(body.summary.join(" "), 900),
    skills,
    experience: experience.slice(0, 8).map((e) => ({ ...e, bullets: e.bullets.slice(0, 8) })),
    projects: projects.slice(0, 5).map((p) => ({ ...p, bullets: p.bullets.slice(0, 5) })),
    education: education.slice(0, 4),
    certifications: body.certifications.map((l) => cut(l.replace(BULLET, ""), 160)).slice(0, 8),
  });
  return parsed.success ? parsed.data : null;
}
