import { describe, expect, it } from "vitest";
import { removeMyResumes } from "@/lib/dwaar/resumes";

// A fake database client. The query chain (select -> not -> eq) is awaitable at every step.
function fakeDb(opts: { paths?: (string | null)[]; listError?: boolean; removeError?: boolean; rpcError?: boolean } = {}) {
  const log: string[] = [];
  const result = opts.listError
    ? { data: null, error: { code: "X" } }
    : { data: (opts.paths ?? []).map((resume_path) => ({ resume_path })), error: null };
  const chain = (): Record<string, unknown> => {
    const c: Record<string, unknown> = {
      not: () => chain(),
      eq: (col: string, value: string) => (log.push(`eq ${col} ${value}`), chain()),
      then: (resolve: (v: unknown) => void) => resolve(result),
    };
    return c;
  };
  const supabase = {
    from: (table: string) => (log.push(`from ${table}`), { select: () => chain() }),
    storage: {
      from: (bucket: string) => ({
        remove: async (paths: string[]) => (log.push(`remove ${bucket} ${paths.join(",")}`), { error: opts.removeError ? { message: "x" } : null }),
      }),
    },
    rpc: async (name: string, args: Record<string, unknown>) => (log.push(`rpc ${name} ${JSON.stringify(args)}`), { error: opts.rpcError ? { code: "Y" } : null }),
  };
  return { supabase: supabase as never, log };
}

describe("removeMyResumes", () => {
  it("deletes the files first, then clears the database, for all requests", async () => {
    const { supabase, log } = fakeDb({ paths: ["u/a.pdf", "u/b.docx", null] });
    expect(await removeMyResumes(supabase)).toEqual({ ok: true, files: 2 });
    expect(log).toEqual(["from dwaar_referral_requests", "remove dwaar-resumes u/a.pdf,u/b.docx", "rpc dwaar_forget_my_requests {}"]);
  });
  it("limits both steps to one request when given an id", async () => {
    const { supabase, log } = fakeDb({ paths: ["u/a.pdf"] });
    await removeMyResumes(supabase, "req1");
    expect(log).toContain("eq id req1");
    expect(log).toContain('rpc dwaar_forget_my_requests {"p_request_id":"req1"}');
  });
  it("still clears the database when there are no files", async () => {
    const { supabase, log } = fakeDb({ paths: [] });
    expect(await removeMyResumes(supabase)).toEqual({ ok: true, files: 0 });
    expect(log.some((l) => l.startsWith("remove"))).toBe(false);
    expect(log.some((l) => l.startsWith("rpc"))).toBe(true);
  });
  it("clears nothing if deleting the files fails, so no file is forgotten", async () => {
    const { supabase, log } = fakeDb({ paths: ["u/a.pdf"], removeError: true });
    expect(await removeMyResumes(supabase)).toEqual({ ok: false });
    expect(log.some((l) => l.startsWith("rpc"))).toBe(false);
  });
  it("stops if the file list cannot be read", async () => {
    const { supabase, log } = fakeDb({ listError: true });
    expect(await removeMyResumes(supabase)).toEqual({ ok: false });
    expect(log.some((l) => l.startsWith("remove") || l.startsWith("rpc"))).toBe(false);
  });
  it("reports a failed database clear", async () => {
    const { supabase } = fakeDb({ paths: [], rpcError: true });
    expect(await removeMyResumes(supabase)).toEqual({ ok: false });
  });
});
