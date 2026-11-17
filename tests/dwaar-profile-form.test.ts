import { describe, expect, it } from "vitest";
import { LIMITS, isValidEmail, parseProfileForm } from "@/lib/dwaar/profile-form";

const COMPANY = "11111111-2222-3333-4444-555555555555";

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

describe("parseProfileForm", () => {
  it("accepts a candidate", () => {
    const result = parseProfileForm(form({ displayName: "  Ravi Kumar ", isCandidate: "on", consent: "on" }), { requireConsent: true });
    expect(result).toEqual({
      ok: true,
      data: { displayName: "Ravi Kumar", headline: null, isCandidate: true, isProvider: false, companyId: null, workEmail: null },
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
      form({ displayName: "Ravi", isCandidate: "on", companyId: COMPANY, workEmail: "ravi@acme.com" }),
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
    expect(parseProfileForm(form({ displayName: "Ravi", isCandidate: "on" }), { requireConsent: false }).ok).toBe(true);
  });

  it("a provider needs a company from the list and a valid work email", () => {
    const result = parseProfileForm(form({ displayName: "Meera", isProvider: "on", companyId: "not-an-id", workEmail: "nope" }), { requireConsent: false });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(Object.keys(result.errors).sort()).toEqual(["companyId", "workEmail"]);
  });

  it("enforces length limits", () => {
    const result = parseProfileForm(
      form({ displayName: "a".repeat(LIMITS.displayName + 1), headline: "b".repeat(LIMITS.headline + 1), isCandidate: "on" }),
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
