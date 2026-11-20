import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function files(dir: string, found: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) files(path, found);
    else if (/\.(ts|tsx)$/.test(name)) found.push(path);
  }
  return found;
}

const all = ["app", "components", "lib"].flatMap((d) => files(d));

describe("work-email confirmation conventions", () => {
  it("the server secret is never public and never reaches browser code", () => {
    for (const file of all) {
      const text = readFileSync(file, "utf8");
      expect(text, file).not.toMatch(/NEXT_PUBLIC_DWAAR/);
      if (/^\s*["']use client["']/m.test(text)) expect(text, file).not.toMatch(/DWAAR_SERVER_SECRET|serverSecret/);
    }
  });

  it("only server code reads DWAAR_SERVER_SECRET", () => {
    const readers = all.filter((f) => readFileSync(f, "utf8").includes("DWAAR_SERVER_SECRET"));
    // work-email.tsx confirms work emails; jobs.ts stores the twice-daily jobs feed; job-alerts.tsx emails Plus job alerts. All server-only.
    expect(readers.sort()).toEqual(["lib/dwaar/job-alerts.tsx", "lib/dwaar/jobs.ts", "lib/dwaar/work-email.tsx"]);
  });

  it("the new server actions re-check who is signed in before doing anything", () => {
    const actions = readFileSync("app/apps/dwaar/actions.ts", "utf8");
    for (const name of ["sendWorkEmailCodeAction", "confirmWorkEmailAction"]) {
      const body = actions.slice(actions.indexOf(`function ${name}`));
      expect(body.slice(0, 700), name).toContain("auth.getUser()");
    }
  });

  it("the email is addressed from the database result, never from the form", () => {
    const code = readFileSync("lib/dwaar/work-email.tsx", "utf8");
    expect(code).toContain("to: row.out_work_email");
    const actions = readFileSync("app/apps/dwaar/actions.ts", "utf8");
    const body = actions.slice(actions.indexOf("function sendWorkEmailCodeAction"), actions.indexOf("function confirmWorkEmailAction"));
    expect(body).not.toMatch(/formData\.get\(/);
  });
});
