import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { friendlyDbError, listCompanyOptions, saveMyProfile } from "@/lib/dwaar/profile";

type Db = SupabaseClient<Database>;

// A tiny fake Supabase client that records what was asked and returns what we tell it to.
function fakeDb(result: { data?: unknown; error?: { code?: string; message?: string } | null }) {
  const calls: { table: string; op: string; payload?: unknown; eq?: [string, unknown] }[] = [];
  const outcome = { data: result.data ?? null, error: result.error ?? null };
  const chain = (table: string, op: string, payload?: unknown) => {
    const call: (typeof calls)[number] = { table, op, payload };
    calls.push(call);
    const done = Promise.resolve(outcome);
    return Object.assign(done, {
      eq: (column: string, value: unknown) => {
        call.eq = [column, value];
        return Object.assign(Promise.resolve(outcome), {});
      },
      order: () => Promise.resolve(outcome),
    });
  };
  const db = {
    from: (table: string) => ({
      select: () => chain(table, "select"),
      insert: (payload: unknown) => chain(table, "insert", payload),
      update: (payload: unknown) => chain(table, "update", payload),
      delete: () => chain(table, "delete"),
    }),
  } as unknown as Db;
  return { db, calls };
}

const input = { displayName: "Meera", headline: null, isCandidate: true, isProvider: true, companyId: "c1", workEmail: "meera@acme.com", acceptsRequests: true, weeklyLimit: 3, linkedinUrl: null, phone: null, otherLinks: [] as string[], skills: [] as string[] };

describe("friendlyDbError", () => {
  it("explains the work-email rule", () => {
    expect(friendlyDbError({ code: "23514", message: "work email does not match this company's domains" })).toMatch(/work email/i);
  });
  it("explains a work email that is already taken", () => {
    expect(friendlyDbError({ code: "23505" })).toMatch(/another account/);
  });
  it("never shows raw database text", () => {
    expect(friendlyDbError({ code: "XX000", message: "secret internal detail" })).not.toMatch(/secret/);
  });
});

describe("saveMyProfile", () => {
  it("inserts a new profile with the consent version and the user id", async () => {
    const { db, calls } = fakeDb({});
    const result = await saveMyProfile(db, "user-1", input, { isNew: true, consentVersion: "v1" });
    expect(result).toEqual({ ok: true });
    expect(calls[0]).toMatchObject({ table: "dwaar_profiles", op: "insert" });
    expect(calls[0].payload).toMatchObject({ user_id: "user-1", consent_version: "v1", provider_work_email: "meera@acme.com" });
  });

  it("updates an existing profile without touching consent or the verified mark", async () => {
    const { db, calls } = fakeDb({});
    await saveMyProfile(db, "user-1", input, { isNew: false, consentVersion: "v1" });
    expect(calls[0]).toMatchObject({ op: "update", eq: ["user_id", "user-1"] });
    expect(Object.keys(calls[0].payload as object)).not.toContain("consent_version");
    expect(Object.keys(calls[0].payload as object)).not.toContain("work_email_verified_at");
  });

  it("clears company and email when the person stops being a provider", async () => {
    const { db, calls } = fakeDb({});
    await saveMyProfile(db, "user-1", { ...input, isProvider: false }, { isNew: false, consentVersion: "v1" });
    expect(calls[0].payload).toMatchObject({ provider_company_id: null, provider_work_email: null, accepts_requests: false });
  });

  it("saves the opt-in and the weekly limit for an employee", async () => {
    const { db, calls } = fakeDb({});
    await saveMyProfile(db, "user-1", input, { isNew: false, consentVersion: "v1" });
    expect(calls[0].payload).toMatchObject({ accepts_requests: true, weekly_request_limit: 3 });
  });

  it("returns a friendly message when the database refuses", async () => {
    const { db } = fakeDb({ error: { code: "23514", message: "work email does not match this company's domains" } });
    const result = await saveMyProfile(db, "user-1", input, { isNew: true, consentVersion: "v1" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toMatch(/work email/i);
  });
});

describe("listCompanyOptions", () => {
  it("returns id and name pairs and skips incomplete rows", async () => {
    const { db } = fakeDb({ data: [{ id: "a", name: "Acme" }, { id: null, name: "Broken" }, { id: "b", name: null }] });
    expect(await listCompanyOptions(db)).toEqual([{ id: "a", name: "Acme" }]);
  });
});
