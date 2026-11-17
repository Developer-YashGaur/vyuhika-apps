import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import {
  buildWorkEmailCodeEmail,
  cleanCode,
  confirmWorkEmailCode,
  friendlyCodeError,
  requestWorkEmailCode,
  serverSecret,
  workEmailConfirmationConfigured,
} from "@/lib/dwaar/work-email";

type Db = SupabaseClient<Database>;

// A fake Supabase client whose rpc() returns what we tell it to and remembers how it was called.
function fakeDb(results: Record<string, { data?: unknown; error?: { code?: string } | null }>) {
  const calls: { fn: string; args: unknown }[] = [];
  const db = {
    rpc: async (fn: string, args: unknown) => {
      calls.push({ fn, args });
      const r = results[fn] ?? {};
      return { data: r.data ?? null, error: r.error ?? null };
    },
  } as unknown as Db;
  return { db, calls };
}

const settings = { from: "Vyuhika Apps <no_reply@vyuhika.com>", feedbackTo: "support@vyuhika.com", assetBaseUrl: "https://apps.vyuhika.com" };
const SECRET = "s".repeat(40);

describe("requestWorkEmailCode", () => {
  it("emails the code to the address the DATABASE returns, with the server secret sent to the database", async () => {
    const { db, calls } = fakeDb({ dwaar_issue_work_email_code: { data: [{ out_code: "482913", out_work_email: "meera@acme.com" }] } });
    const send = vi.fn(async () => true);
    const result = await requestWorkEmailCode(db, { secret: SECRET, send, settings });
    expect(result).toEqual({ ok: true });
    expect(calls[0]).toEqual({ fn: "dwaar_issue_work_email_code", args: { p_secret: SECRET } });
    expect(send).toHaveBeenCalledTimes(1);
    const email = (send.mock.calls[0] as unknown as [{ to: string; html: string; text: string; from: string }])[0];
    expect(email.to).toBe("meera@acme.com");
    expect(email.from).toBe(settings.from);
    expect(email.html).toContain("482913");
    expect(email.text).toContain("482913");
  });

  it("sends nothing when the database refuses, and explains why", async () => {
    const { db } = fakeDb({ dwaar_issue_work_email_code: { error: { code: "DW001" } } });
    const send = vi.fn(async () => true);
    const result = await requestWorkEmailCode(db, { secret: SECRET, send, settings });
    expect(send).not.toHaveBeenCalled();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toMatch(/wait a minute/i);
  });

  it("reports a failed email send without exposing the code", async () => {
    const { db } = fakeDb({ dwaar_issue_work_email_code: { data: [{ out_code: "111222", out_work_email: "a@acme.com" }] } });
    const result = await requestWorkEmailCode(db, { secret: SECRET, send: async () => false, settings });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).not.toContain("111222");
  });
});

describe("confirmWorkEmailCode", () => {
  it("rejects badly shaped codes without calling the database", async () => {
    const { db, calls } = fakeDb({});
    for (const bad of ["", "12345", "1234567", "abcdef", "12 34"]) {
      expect((await confirmWorkEmailCode(db, bad)).ok, bad).toBe(false);
    }
    expect(calls).toHaveLength(0);
  });

  it("accepts a code typed with spaces", async () => {
    const { db, calls } = fakeDb({ dwaar_confirm_work_email: { data: true } });
    expect(await confirmWorkEmailCode(db, " 123 456 ")).toEqual({ ok: true });
    expect(calls[0].args).toEqual({ p_code: "123456" });
  });

  it("explains a wrong or expired code in one friendly sentence", async () => {
    const { db } = fakeDb({ dwaar_confirm_work_email: { data: false } });
    const result = await confirmWorkEmailCode(db, "123456");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toMatch(/not right, or it has expired/);
  });
});

describe("helpers", () => {
  it("maps database error codes to messages", () => {
    expect(friendlyCodeError("DW002")).toMatch(/too many/i);
    expect(friendlyCodeError("DW003")).toMatch(/already confirmed/i);
    expect(friendlyCodeError("DW004")).toMatch(/Add a work email/);
    expect(friendlyCodeError("XX")).toMatch(/try again/i);
  });

  it("cleanCode removes spaces", () => expect(cleanCode(" 1 2 3 ")).toBe("123"));

  it("the server secret must be set and long enough", () => {
    expect(serverSecret({})).toBeNull();
    expect(serverSecret({ DWAAR_SERVER_SECRET: "short" })).toBeNull();
    expect(serverSecret({ DWAAR_SERVER_SECRET: SECRET })).toBe(SECRET);
  });

  it("confirmation is available only when the secret and the email settings are all set", () => {
    const all = { DWAAR_SERVER_SECRET: SECRET, RESEND_API_KEY: "k", EMAIL_FROM: "f", EMAIL_ASSET_BASE_URL: "https://x" };
    expect(workEmailConfirmationConfigured(all)).toBe(true);
    for (const key of Object.keys(all)) expect(workEmailConfirmationConfigured({ ...all, [key]: undefined }), key).toBe(false);
  });
});

describe("the code email", () => {
  it("shows the code, the lifetime and a warning, and has no links to click except the site address", async () => {
    const email = await buildWorkEmailCodeEmail("048215", "https://apps.vyuhika.com");
    expect(email.subject).toBe("Your Dwaar confirmation code");
    expect(email.html).toContain("048215");
    expect(email.html).toMatch(/15 minutes/);
    expect(email.html).toMatch(/Never share it/);
    const links = [...email.html.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
    for (const link of links) expect(link, link).toMatch(/^https:\/\/apps\.vyuhika\.com/);
    expect(email.text).toContain("Your code: 048215");
  });
});
