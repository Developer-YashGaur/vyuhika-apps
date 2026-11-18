import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Rules that must keep holding as more code is added. They read the source files, so a future change that
// breaks a rule fails here before it can ship.

function files(dir: string, found: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) files(path, found);
    else if (/\.(ts|tsx)$/.test(name)) found.push(path);
  }
  return found;
}

const sources = ["app", "components", "lib", "proxy.ts"].flatMap((p) => (statSync(p).isDirectory() ? files(p) : [p]));

describe("Dwaar conventions", () => {
  it("never uses a Supabase service-role key", () => {
    for (const file of sources) expect(readFileSync(file, "utf8"), file).not.toMatch(/service_role|SERVICE_ROLE/);
  });

  it("only the public front page can be found by search engines; every other Dwaar page asks them to skip it", () => {
    const pages = files("app/apps/dwaar").filter((f) => f.endsWith("page.tsx"));
    expect(pages.length).toBeGreaterThanOrEqual(3);
    for (const page of pages) {
      const isFront = page === join("app", "apps", "dwaar", "page.tsx");
      const expected = isFront ? /export const metadata = dwaarPublicMetadata/ : /export const metadata = dwaar(Privacy)?Metadata/;
      expect(readFileSync(page, "utf8"), page).toMatch(expected);
    }
    const meta = readFileSync("lib/dwaar/metadata.ts", "utf8");
    expect(meta).toMatch(/dwaarMetadata: Metadata = \{[^}]*index: false/s);
    expect(meta).toMatch(/dwaarPrivacyMetadata: Metadata = \{[^}]*index: false/s);
    expect(meta.match(/dwaarPublicMetadata: Metadata = \{[\s\S]*?\n\};/)![0]).not.toMatch(/robots/);
  });

  it("every server action re-checks who is signed in", () => {
    const actions = readFileSync("app/apps/dwaar/actions.ts", "utf8");
    // Sign-in and sign-out are the only actions that run before there is a signed-in person.
    const names = [...actions.matchAll(/export async function (\w+)/g)].map((m) => m[1]).filter((n) => n !== "signInWithGoogle" && n !== "signOut");
    expect(names.length).toBeGreaterThanOrEqual(7);
    for (const name of names) {
      const body = actions.slice(actions.indexOf(`function ${name}`));
      expect(body.slice(0, 700), name).toContain("auth.getUser()");
    }
  });

  it("the database types include the Dwaar profile table and the company dropdown view", () => {
    expect(existsSync("types/database.ts")).toBe(true);
    const types = readFileSync("types/database.ts", "utf8");
    expect(types).toContain("dwaar_profiles");
    expect(types).toContain("company_options");
  });

  it("Dwaar is on the home page list and has page content for the sitemap", () => {
    expect(readFileSync("lib/apps.ts", "utf8")).toMatch(/slug: "dwaar"/);
    expect(readFileSync("lib/app-content.ts", "utf8")).toMatch(/slug: "dwaar"/);
  });
});
