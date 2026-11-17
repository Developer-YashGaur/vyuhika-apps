import { describe, expect, it } from "vitest";
import { candidateDetailsComplete, normalizeLinkedin, normalizePhone, parseLinks, parseSkills } from "@/lib/dwaar/profile-details";

describe("normalizeLinkedin", () => {
  it("accepts profile links and drops the extras", () => {
    expect(normalizeLinkedin("https://www.linkedin.com/in/ravi-kumar/")).toBe("https://www.linkedin.com/in/ravi-kumar/");
    expect(normalizeLinkedin("linkedin.com/in/ravi?utm_source=x#top")).toBe("https://linkedin.com/in/ravi");
    expect(normalizeLinkedin("HTTP://IN.LinkedIn.com/in/ravi")).toBe("https://in.linkedin.com/in/ravi");
  });
  it("refuses everything else", () => {
    for (const bad of ["", "https://evil.example/in/ravi", "https://linkedin.com.evil.example/in/ravi", "https://linkedin.com/company/acme", "javascript:alert(1)", "https://user:pw@linkedin.com/in/x"]) {
      expect(normalizeLinkedin(bad), bad).toBe(null);
    }
  });
});

describe("normalizePhone", () => {
  it("makes international numbers and adds +91 to a 10 digit Indian mobile", () => {
    expect(normalizePhone("+91 98765-43210")).toBe("+919876543210");
    expect(normalizePhone("09876543210")).toBe("+919876543210");
    expect(normalizePhone("9876543210")).toBe("+919876543210");
    expect(normalizePhone("0044 20 7946 0958")).toBe("+442079460958");
  });
  it("refuses numbers it cannot place", () => {
    for (const bad of ["", "12345", "+0123456789", "1234567890", "+91 abc", "+9198765432101234"]) expect(normalizePhone(bad), bad).toBe(null);
  });
});

describe("parseLinks", () => {
  it("accepts up to 3 links, adds https and removes repeats", () => {
    const r = parseLinks("github.com/a\nhttps://github.com/a, https://b.dev");
    expect(r.ok && r.links).toEqual(["https://github.com/a", "https://b.dev/"]);
    expect(parseLinks("").ok && (parseLinks("") as { links: string[] }).links).toEqual([]);
  });
  it("refuses http, odd text, passwords and more than 3", () => {
    expect(parseLinks("http://a.dev").ok).toBe(false);
    expect(parseLinks("not a link at all").ok).toBe(false);
    expect(parseLinks("https://u:p@a.dev").ok).toBe(false);
    expect(parseLinks("a.dev b.dev c.dev d.dev").ok).toBe(false);
  });
});

describe("parseSkills", () => {
  it("splits, trims and removes repeats", () => {
    const r = parseSkills("Python,  SQL ;python\nReact");
    expect(r.ok && r.skills).toEqual(["Python", "SQL", "React"]);
  });
  it("limits count and length, and removes angle brackets", () => {
    expect(parseSkills(Array.from({ length: 16 }, (_, i) => `s${i}`).join(",")).ok).toBe(false);
    expect(parseSkills("x".repeat(41)).ok).toBe(false);
    const r = parseSkills("<b>Go</b>");
    expect(r.ok && r.skills[0]).toBe("b Go /b");
  });
});

describe("candidateDetailsComplete", () => {
  it("needs LinkedIn, phone and a skill", () => {
    expect(candidateDetailsComplete({ linkedin_url: "https://linkedin.com/in/a", phone: "+919876543210", skills: ["Go"] })).toBe(true);
    expect(candidateDetailsComplete({ linkedin_url: null, phone: "+919876543210", skills: ["Go"] })).toBe(false);
    expect(candidateDetailsComplete({ linkedin_url: "https://linkedin.com/in/a", phone: null, skills: ["Go"] })).toBe(false);
    expect(candidateDetailsComplete({ linkedin_url: "https://linkedin.com/in/a", phone: "+919876543210", skills: [] })).toBe(false);
  });
});
