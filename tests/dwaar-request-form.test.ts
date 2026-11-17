import { describe, expect, it } from "vitest";
import { isValidJobUrl, parseRequestForm } from "@/lib/dwaar/request-form";
import { statusStamp, timeAgo } from "@/lib/dwaar/format";
import { friendlyRequestError } from "@/lib/dwaar/requests";

const ID = "3f2a9c10-1111-4222-8333-444455556666";
const file = { size: 1000, arrayBuffer: async () => new ArrayBuffer(0) };
const longText = (n: number) => "word ".repeat(Math.ceil(n / 5)).slice(0, n);
const form = (o: Record<string, unknown>) => ({ get: (k: string) => (k in o ? (o[k] as string) : null) });
const good = {
  companyId: ID,
  jobTitle: "Backend Engineer",
  jobUrl: "https://acme.com/jobs/1",
  jobDescription: longText(400),
  resumeText: longText(600),
  resume: file,
  consent: "on",
  note: "Hi",
};

describe("parseRequestForm", () => {
  it("accepts good input and trims", () => {
    const r = parseRequestForm(form({ ...good, jobTitle: "  Backend Engineer  ", jobId: " REQ-1 " }));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.jobTitle).toBe("Backend Engineer");
      expect(r.data.jobId).toBe("REQ-1");
      expect(r.data.note).toBe("Hi");
    }
  });
  it("makes an empty note and job id null", () => {
    const r = parseRequestForm(form({ ...good, note: "  " }));
    expect(r.ok && r.data.note).toBeNull();
    expect(r.ok && r.data.jobId).toBeNull();
  });
  it("rejects missing basics", () => {
    const r = parseRequestForm(form({}));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.errors).sort()).toEqual(["companyId", "consent", "jobDescription", "jobTitle", "jobUrl", "resume"]);
  });
  it("needs a resume file, readable text and consent", () => {
    const noFile = parseRequestForm(form({ ...good, resume: null }));
    expect(noFile.ok).toBe(false);
    const empty = parseRequestForm(form({ ...good, resume: { size: 0, arrayBuffer: async () => new ArrayBuffer(0) } }));
    expect(empty.ok).toBe(false);
    const noText = parseRequestForm(form({ ...good, resumeText: "short" }));
    expect(!noText.ok && noText.errors.resume).toMatch(/could not read enough text/);
    const noConsent = parseRequestForm(form({ ...good, consent: null }));
    expect(!noConsent.ok && Object.keys(noConsent.errors)).toEqual(["consent"]);
  });
  it("rejects too-long values", () => {
    const r = parseRequestForm(
      form({ ...good, jobTitle: "x".repeat(121), note: "y".repeat(501), jobId: "z".repeat(61), jobDescription: longText(8001), resumeText: longText(15001) }),
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.errors).sort()).toEqual(["jobDescription", "jobId", "jobTitle", "note", "resume"]);
  });
});

describe("isValidJobUrl", () => {
  it("allows https links only", () => {
    expect(isValidJobUrl("https://acme.com/j")).toBe(true);
    expect(isValidJobUrl("http://acme.com/j")).toBe(false);
    expect(isValidJobUrl("javascript:alert(1)")).toBe(false);
    expect(isValidJobUrl("https://localhost/j")).toBe(false);
    expect(isValidJobUrl("not a url")).toBe(false);
    expect(isValidJobUrl("https://acme.com/" + "a".repeat(500))).toBe(false);
  });
});

describe("friendlyRequestError", () => {
  it("explains each Dwaar error code", () => {
    for (const code of ["DW010", "DW011", "DW012", "DW013", "DW014", "DW015", "DW016", "42501"]) {
      expect(friendlyRequestError(code)).not.toMatch(/Something went wrong/);
    }
    expect(friendlyRequestError("???")).toMatch(/Something went wrong/);
    expect(friendlyRequestError(undefined)).toMatch(/Something went wrong/);
  });
});

describe("format helpers", () => {
  it("maps statuses to stamps", () => {
    expect(statusStamp("open").label).toBe("Waiting for an employee");
    expect(statusStamp("accepted").tone).toBe("ok");
    expect(statusStamp("weird").tone).toBe("closed");
  });
  it("writes friendly times", () => {
    const now = Date.parse("2026-11-17T12:00:00Z");
    expect(timeAgo("2026-11-17T01:00:00Z", now)).toBe("today");
    expect(timeAgo("2026-11-16T05:00:00Z", now)).toBe("yesterday");
    expect(timeAgo("2026-11-14T05:00:00Z", now)).toBe("3 days ago");
    expect(timeAgo("2026-10-27T05:00:00Z", now)).toBe("3 weeks ago");
    expect(timeAgo("nonsense", now)).toBe("");
  });
});
