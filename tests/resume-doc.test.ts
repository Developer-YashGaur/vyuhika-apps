import { describe, expect, it } from "vitest";
import { boostNextStep } from "@/lib/dwaar/boost-next";
import { mapResumeText, parseResumeDoc, resumeDisplayName, resumeDocToText, type ResumeDoc } from "@/lib/dwaar/resume-doc";

const doc: ResumeDoc = {
  name: "Asha Rao",
  headline: "Backend Engineer",
  summary: "Backend engineer with Python experience.",
  skills: [{ label: "Languages", items: ["Python", "SQL"] }, { label: "Empty", items: [] }],
  experience: [{ title: "Backend Engineer", company: "Acme", location: "Pune", dates: "2019 - 2024", bullets: ["Built APIs.", "Cut latency."] }],
  projects: [{ name: "Resume bot", bullets: ["Parsed PDFs."] }],
  education: [{ degree: "B.Tech", school: "COEP", dates: "2018", detail: "" }],
  certifications: ["AWS Cloud Practitioner"],
};
const contact = { name: "Asha", email: "asha@example.com", phone: "+91 98765 43210", linkedin: "https://www.linkedin.com/in/asha", links: ["https://github.com/asha"] };

describe("resume as structured data", () => {
  it("reads saved JSON back, and returns null for old plain-text Boosts", () => {
    expect(parseResumeDoc(JSON.stringify(doc))?.name).toBe("Asha Rao");
    expect(parseResumeDoc("[Your name]\n\nSUMMARY\nPlain text resume.")).toBe(null);
    expect(parseResumeDoc(JSON.stringify({ name: "x" }))).toBe(null);
  });
  it("uses the resume's name, or the profile name when the resume has none or a placeholder", () => {
    expect(resumeDisplayName(doc, "Asha")).toBe("Asha Rao");
    expect(resumeDisplayName({ ...doc, name: "" }, "Asha Kumar")).toBe("Asha Kumar");
    expect(resumeDisplayName({ ...doc, name: "[Your name]" }, "Asha Kumar")).toBe("Asha Kumar");
  });
  it("the text version has the contact details from the profile and every section", () => {
    const text = resumeDocToText(doc, contact);
    expect(text).toContain("asha@example.com | +91 98765 43210");
    for (const part of ["SUMMARY", "SKILLS", "EXPERIENCE", "PROJECTS", "EDUCATION", "CERTIFICATIONS", "Languages: Python, SQL", "- Built APIs."]) expect(text).toContain(part);
    expect(text).not.toContain("Empty:");
  });
  it("mapResumeText cleans every piece of text and drops empty list items", () => {
    const out = mapResumeText(doc, (t) => (t === "Cut latency." ? "" : t.toUpperCase()));
    expect(out.summary).toBe("BACKEND ENGINEER WITH PYTHON EXPERIENCE.");
    expect(out.experience[0].bullets).toEqual(["BUILT APIS."]);
    expect(out.certifications).toEqual(["AWS CLOUD PRACTITIONER"]);
  });
});

describe("what the Boost page says after the score", () => {
  it("a good score says continue or download", () => {
    const next = boostNextStep(80);
    expect(next.good).toBe(true);
    expect(next.text).toMatch(/continue/i);
  });
  it("a low score points to the tips, and is not 'good'", () => {
    const next = boostNextStep(40);
    expect(next.good).toBe(false);
    expect(next.text).toMatch(/tips/i);
  });
  it("shows before and after when the improved resume was scored", () => {
    expect(boostNextStep(91, 82).title).toBe("Good match: 82 before, 91 after");
    expect(boostNextStep(50, 82).title).toBe("Match: 82 before, 50 after");
    expect(boostNextStep(82, 82).title).toBe("Good match: 82 out of 100");
  });
  it("no score still allows download", () => {
    expect(boostNextStep(null).good).toBe(false);
  });
});
