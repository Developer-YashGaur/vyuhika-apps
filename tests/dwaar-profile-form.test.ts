import { describe, expect, it } from "vitest";
import { LIMITS, isValidEmail, parseProfileForm } from "@/lib/dwaar/profile-form";

const COMPANY = "11111111-2222-3333-4444-555555555555";
const DETAILS = { linkedinUrl: "https://www.linkedin.com/in/ravi-kumar", phone: "+91 98765 43210", skills: "Python, SQL" };

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

describe("parseProfileForm", () => {
  it("accepts a candidate", () => {
    const result = parseProfileForm(form({ displayName: "  Ravi Kumar ", isCandidate: "on", ...DETAILS, consent: "on" }), { requireConsent: true });
    expect(result).toEqual({
      ok: true,
      data: { displayName: "Ravi Kumar", headline: null, isCandidate: true, isProvider: false, companyId: null, workEmail: null, acceptsRequests: false, weeklyLimit: 5,
        linkedinUrl: "https://www.linkedin.com/in/ravi-kumar", phone: "+919876543210", otherLinks: [], skills: ["Python", "SQL"] },
    });
  });

  it("accepts a provider and lowercases the work email", () => {
    const result = parseProfileForm(
      form({ displayName: "Meera", isProvider: "on", companyId: COMPANY, workEmail: " Meera@ACME.com ", consent: "on" }),
      { requireConsent: true },
    );
    expect(result.ok && result.data).toMatchObject({ isProvider: true, companyId: COMPANY, workEmail: "meera@acme.com" });
  });

  it("ignores company and email when the person is not a provider", () => {
    const result = parseProfileForm(
      form({ displayName: "Ravi", isCandidate: "on", ...DETAILS, companyId: COMPANY, workEmail: "ravi@acme.com" }),
      { requireConsent: false },
    );
    expect(result.ok && result.data).toMatchObject({ companyId: null, workEmail: null });
  });

  it("needs a name, a role and (when creating) consent", () => {
    const result = parseProfileForm(form({ displayName: " " }), { requireConsent: true });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(Object.keys(result.errors).sort()).toEqual(["consent", "displayName", "roles"]);
  });

  it("does not ask for consent again when editing", () => {
    expect(parseProfileForm(form({ displayName: "Ravi", isCandidate: "on", ...DETAILS }), { requireConsent: false }).ok).toBe(true);
  });

  it("a provider needs a company from the list and a valid work email", () => {
    const result = parseProfileForm(form({ displayName: "Meera", isProvider: "on", companyId: "not-an-id", workEmail: "nope" }), { requireConsent: false });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(Object.keys(result.errors).sort()).toEqual(["companyId", "workEmail"]);
  });

  it("enforces length limits", () => {
    const result = parseProfileForm(
      form({ displayName: "a".repeat(LIMITS.displayName + 1), headline: "b".repeat(LIMITS.headline + 1), isCandidate: "on", ...DETAILS }),
      { requireConsent: false },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(Object.keys(result.errors).sort()).toEqual(["displayName", "headline"]);
  });
});

describe("isValidEmail", () => {
  it("accepts normal addresses and rejects odd ones", () => {
    expect(isValidEmail("a@acme.com")).toBe(true);
    for (const bad of ["", "a", "a@b", "a@@acme.com", "a b@acme.com", "a@b@acme.com"]) expect(isValidEmail(bad), bad).toBe(false);
  });
});

describe("employee opt-in", () => {
  const base = { displayName: "Meera", isProvider: "on", companyId: "11111111-1111-4111-8111-111111111111", workEmail: "m@acme.com" };

  it("is off by default and the limit is 5", () => {
    const r = parseProfileForm(form(base), { requireConsent: false });
    expect(r.ok && r.data.acceptsRequests).toBe(false);
    expect(r.ok && r.data.weeklyLimit).toBe(5);
  });

  it("keeps the saved limit when the opt-in is switched off (the form sends it as a hidden field)", () => {
    const r = parseProfileForm(form({ ...base, weeklyLimit: "12" }), { requireConsent: false });
    expect(r.ok && r.data.acceptsRequests).toBe(false);
    expect(r.ok && r.data.weeklyLimit).toBe(12);
  });

  it("turns on only for employees", () => {
    const on = parseProfileForm(form({ ...base, acceptsRequests: "on", weeklyLimit: "8" }), { requireConsent: false });
    expect(on.ok && on.data.acceptsRequests).toBe(true);
    expect(on.ok && on.data.weeklyLimit).toBe(8);
    const notEmployee = parseProfileForm(form({ displayName: "Ravi", isCandidate: "on", ...DETAILS, acceptsRequests: "on" }), { requireConsent: false });
    expect(notEmployee.ok && notEmployee.data.acceptsRequests).toBe(false);
  });

  it("refuses a limit outside 1 to 50", () => {
    for (const bad of ["0", "51", "2.5", "abc"]) {
      const r = parseProfileForm(form({ ...base, acceptsRequests: "on", weeklyLimit: bad }), { requireConsent: false });
      expect(r.ok).toBe(false);
      if (!r.ok) expect(typeof r.errors.weeklyLimit).toBe("string");
    }
  });
});

describe("candidate details", () => {
  const base = { displayName: "Ravi", isCandidate: "on" };

  it("a candidate must give LinkedIn, a phone number and at least one skill", () => {
    const r = parseProfileForm(form(base), { requireConsent: false });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.errors).sort()).toEqual(["linkedinUrl", "phone", "skills"]);
  });

  it("cleans the details into the shape the database accepts", () => {
    const r = parseProfileForm(
      form({ ...base, linkedinUrl: "linkedin.com/in/ravi?utm=1", phone: "98765 43210", skills: "Python, python, SQL", otherLinks: "github.com/ravi\nhttps://ravi.dev" }),
      { requireConsent: false },
    );
    expect(r.ok && r.data.linkedinUrl).toBe("https://linkedin.com/in/ravi");
    expect(r.ok && r.data.phone).toBe("+919876543210");
    expect(r.ok && r.data.skills).toEqual(["Python", "SQL"]);
    expect(r.ok && r.data.otherLinks).toEqual(["https://github.com/ravi", "https://ravi.dev/"]);
  });

  it("refuses a LinkedIn link that is not a LinkedIn profile, and bad links", () => {
    const r = parseProfileForm(form({ ...base, ...DETAILS, linkedinUrl: "https://evil.example/in/ravi", otherLinks: "http://a.example" }), { requireConsent: false });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.errors).sort()).toEqual(["linkedinUrl", "otherLinks"]);
  });

  it("a person who only offers referrals does not need them", () => {
    const r = parseProfileForm(form({ displayName: "Meera", isProvider: "on", companyId: COMPANY, workEmail: "m@acme.com" }), { requireConsent: false });
    expect(r.ok && r.data.phone).toBe(null);
    expect(r.ok && r.data.skills).toEqual([]);
  });
});
