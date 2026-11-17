import { describe, expect, it } from "vitest";
import { isValidJobUrl, parseRequestForm } from "@/lib/dwaar/request-form";
import { statusStamp, timeAgo } from "@/lib/dwaar/format";
import { friendlyRequestError } from "@/lib/dwaar/requests";

const ID = "3f2a9c10-1111-4222-8333-444455556666";
const form = (o: Record<string, string>) => ({ get: (k: string) => (k in o ? o[k] : null) });
const good = { companyId: ID, jobTitle: "Backend Engineer", jobUrl: "https://acme.com/jobs/1", note: "Hi" };

describe("parseRequestForm", () => {
  it("accepts good input and trims", () => {
    const r = parseRequestForm(form({ ...good, jobTitle: "  Backend Engineer  " }));
    expect(r).toEqual({ ok: true, data: { companyId: ID, jobTitle: "Backend Engineer", jobUrl: good.jobUrl, note: "Hi" } });
  });
  it("makes an empty note null", () => {
    const r = parseRequestForm(form({ ...good, note: "  " }));
    expect(r.ok && r.data.note).toBeNull();
  });
  it("rejects a missing company, title and link", () => {
    const r = parseRequestForm(form({}));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.errors).sort()).toEqual(["companyId", "jobTitle", "jobUrl"]);
  });
  it("rejects too-long values", () => {
    const r = parseRequestForm(form({ ...good, jobTitle: "x".repeat(121), note: "y".repeat(501) }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.errors).sort()).toEqual(["jobTitle", "note"]);
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
    for (const code of ["DW010", "DW011", "DW012", "DW013", "DW014", "42501"]) {
      expect(friendlyRequestError(code)).not.toMatch(/Something went wrong/);
    }
    expect(friendlyRequestError("???")).toMatch(/Something went wrong/);
    expect(friendlyRequestError(undefined)).toMatch(/Something went wrong/);
  });
});

describe("format helpers", () => {
  it("maps statuses to stamps", () => {
    expect(statusStamp("open").label).toBe("Waiting at reception");
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
