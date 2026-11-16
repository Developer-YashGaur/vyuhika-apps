import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apps } from "@/lib/apps";
import { LENGTHS, TONES } from "@/lib/cover-letter/schema";
import { FEEDBACK_TYPES } from "@/lib/feedback/rules";

// The analytics wrapper: a fixed list of events, fixed words only, never throws, silent outside production.
// Vercel's own `track` is faked, so nothing is ever sent.

const trackMock = vi.fn();
vi.mock("@vercel/analytics", () => ({ track: (...args: unknown[]) => trackMock(...args) }));

const { EVENT_NAMES, cleanEvent, pageName, trackEvent } = await import("@/lib/analytics");

beforeEach(() => {
  trackMock.mockReset(); // (braces: a function returned from beforeEach would be run as a cleanup)
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

// Things a visitor might type or upload. None of them may ever be accepted as a property value.
const SECRETS = [
  "Priya Sharma, Senior Frontend Engineer at ShopLane, 4 years of React",
  "We are hiring a Frontend Engineer to build our dashboard at Nimbus Cloud",
  "Dear Hiring Manager, I built the checkout flow that 20,000 shoppers use",
  "My work on the checkout flow",
  "Nimbus Cloud",
  "Senior Frontend Engineer",
  "priya-cv-final.pdf",
  "priya@example.com",
  "https://evil.example/?token=abc",
  "/apps/cover-letter-writer?resume=secret",
  "<script>alert(1)</script>",
  "",
  " pdf",
  "PDF",
  "friendly tone please",
];

describe("the event list is fixed", () => {
  it("has exactly these five events, in this order", () => {
    expect(EVENT_NAMES).toEqual([
      "resume_analyzed",
      "cover_letter_written",
      "feedback_sent",
      "external_app_clicked",
      "resume_file_selected",
    ]);
  });

  it("refuses every other name", () => {
    for (const name of ["page_viewed", "Resume_Analyzed", "resume_analyzed ", "", "signup", "__proto__", "constructor", "toString", "hasOwnProperty", 5, null, undefined, {}, ["resume_analyzed"]]) {
      expect(cleanEvent(name, { app: "resume-matcher" }), String(name)).toBeNull();
    }
  });

  it("never sends an unknown event, even in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubGlobal("window", {});
    trackEvent("page_viewed" as never);
    trackEvent("__proto__" as never);
    expect(trackMock).not.toHaveBeenCalled();
  });
});

describe("allowed properties get through", () => {
  it("keeps valid properties for each event", () => {
    expect(cleanEvent("resume_analyzed", { app: "resume-matcher" })).toEqual({ name: "resume_analyzed", properties: { app: "resume-matcher" } });
    expect(cleanEvent("cover_letter_written", { app: "cover-letter-writer", tone: "friendly", length: "short" })).toEqual({
      name: "cover_letter_written",
      properties: { app: "cover-letter-writer", tone: "friendly", length: "short" },
    });
    expect(cleanEvent("feedback_sent", { type: "wrong-result", page: "cover-letter-writer" })?.properties).toEqual({ type: "wrong-result", page: "cover-letter-writer" });
    expect(cleanEvent("external_app_clicked", { app: "koshvia" })?.properties).toEqual({ app: "koshvia" });
    for (const file_type of ["pdf", "docx", "txt"]) expect(cleanEvent("resume_file_selected", { file_type })?.properties).toEqual({ file_type });
  });

  it("allows every tone, length and feedback type the apps really have", () => {
    for (const tone of TONES) expect(cleanEvent("cover_letter_written", { tone })?.properties).toEqual({ tone });
    for (const length of LENGTHS) expect(cleanEvent("cover_letter_written", { length })?.properties).toEqual({ length });
    for (const { value } of FEEDBACK_TYPES) expect(cleanEvent("feedback_sent", { type: value })?.properties).toEqual({ type: value });
  });

  it("external_app_clicked only knows the external apps from the apps list", () => {
    const external = apps.filter((app) => app.externalUrl).map((app) => app.slug);
    expect(external).toContain("koshvia");
    for (const slug of external) expect(cleanEvent("external_app_clicked", { app: slug })?.properties).toEqual({ app: slug });
    for (const slug of apps.filter((app) => !app.externalUrl).map((app) => app.slug)) {
      expect(cleanEvent("external_app_clicked", { app: slug })?.properties, slug).toEqual({});
    }
  });
});

describe("forbidden values are dropped", () => {
  it.each(SECRETS)("a typed or uploaded value is never accepted: %j", (secret) => {
    for (const name of EVENT_NAMES) {
      const keys = ["app", "tone", "length", "type", "page", "file_type", "resume", "jobDescription", "letter", "highlight", "companyName", "roleTitle", "fileName", "email", "url", "message"];
      const props = Object.fromEntries(keys.map((key) => [key, secret]));
      const event = cleanEvent(name, props);
      expect(event?.properties, name).toEqual({});
      expect(JSON.stringify(event)).not.toContain(secret.trim() || "\u0000");
    }
  });

  it("drops properties that are not on the event's list, even with a valid-looking value", () => {
    const event = cleanEvent("resume_file_selected", { file_type: "pdf", fileName: "pdf", name: "pdf", email: "pdf", app: "resume-matcher" });
    expect(event?.properties).toEqual({ file_type: "pdf" });
  });

  it("drops a value that belongs to another property", () => {
    expect(cleanEvent("cover_letter_written", { tone: "short", length: "friendly" })?.properties).toEqual({});
    expect(cleanEvent("resume_analyzed", { app: "cover-letter-writer" })?.properties).toEqual({});
  });

  it("drops numbers, booleans, null, objects and arrays", () => {
    for (const value of [5, 0, true, false, null, undefined, {}, { app: "resume-matcher" }, ["pdf"], Symbol("pdf"), BigInt(1)]) {
      expect(cleanEvent("resume_file_selected", { file_type: value })?.properties, String(typeof value)).toEqual({});
    }
  });

  it("drops inherited and special keys, and survives non-object properties", () => {
    const sneaky = Object.create({ file_type: "pdf" });
    expect(cleanEvent("resume_file_selected", sneaky)?.properties).toEqual({});
    expect(cleanEvent("resume_file_selected", JSON.parse('{"__proto__": "pdf", "constructor": "pdf"}'))?.properties).toEqual({});
    for (const props of [undefined, null, "pdf", 5, ["pdf"], () => {}]) {
      expect(cleanEvent("resume_file_selected", props)?.properties).toEqual({});
    }
  });

  it("only ever sends strings from the fixed lists to Vercel", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubGlobal("window", {});
    trackEvent("cover_letter_written", { app: "cover-letter-writer", tone: "friendly", length: "short", resume: "SECRET", email: "a@b.c" } as never);
    expect(trackMock).toHaveBeenCalledTimes(1);
    expect(trackMock).toHaveBeenCalledWith("cover_letter_written", { app: "cover-letter-writer", tone: "friendly", length: "short" });
    expect(JSON.stringify(trackMock.mock.calls)).not.toMatch(/SECRET|a@b\.c/);
  });
});

describe("trackEvent is safe", () => {
  it("does nothing in tests and in development", () => {
    vi.stubGlobal("window", {});
    trackEvent("resume_analyzed", { app: "resume-matcher" }); // NODE_ENV is "test" here
    vi.stubEnv("NODE_ENV", "development");
    trackEvent("resume_analyzed", { app: "resume-matcher" });
    expect(trackMock).not.toHaveBeenCalled();
  });

  it("does nothing on the server (no window)", () => {
    vi.stubEnv("NODE_ENV", "production");
    trackEvent("resume_analyzed", { app: "resume-matcher" });
    expect(trackMock).not.toHaveBeenCalled();
  });

  it("sends in production in the browser", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubGlobal("window", {});
    trackEvent("resume_analyzed", { app: "resume-matcher" });
    expect(trackMock).toHaveBeenCalledExactlyOnceWith("resume_analyzed", { app: "resume-matcher" });
  });

  it("never throws, even if Vercel's track does", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubGlobal("window", {});
    trackMock.mockImplementation(() => {
      throw new Error("analytics blocked");
    });
    expect(() => trackEvent("resume_analyzed", { app: "resume-matcher" })).not.toThrow();
    expect(() => trackEvent("nope" as never, { x: 1 } as never)).not.toThrow();
    expect(() => trackEvent(undefined as never)).not.toThrow();
    expect(() => trackEvent("resume_analyzed", { get app(): string { throw new Error("getter"); } } as never)).not.toThrow();
  });
});

describe("pageName gives a fixed word, never the address", () => {
  it("maps the known pages and calls everything else 'other'", () => {
    expect(pageName("/")).toBe("home");
    expect(pageName("/apps/resume-matcher")).toBe("resume-matcher");
    expect(pageName("/apps/cover-letter-writer")).toBe("cover-letter-writer");
    for (const path of ["/apps/cover-letter-writer?resume=secret", "/apps/resume-matcher/", "/dev/emails", "/something", "", "https://evil.example"]) {
      expect(pageName(path), path).toBe("other");
    }
  });
});

describe("nothing else talks to Vercel's track", () => {
  function sourceFiles(dir: string): string[] {
    return readdirSync(dir).flatMap((name) => {
      const path = join(dir, name);
      if (["node_modules", ".next", "screenshots", "tests", "scripts", "docs", ".git"].includes(name)) return [];
      return statSync(path).isDirectory() ? sourceFiles(path) : /\.(ts|tsx)$/.test(name) ? [path] : [];
    });
  }

  it("only lib/analytics.ts imports `track`, so every event goes through the checks", () => {
    const users = ["app", "components", "lib"].flatMap(sourceFiles).filter((file) => /from "@vercel\/analytics"/.test(readFileSync(file, "utf8")));
    expect(users).toEqual(["lib/analytics.ts"]);
  });

  it("the layout adds the two components, from the Next.js entry points", () => {
    const layout = readFileSync("app/layout.tsx", "utf8");
    expect(layout).toContain('import { Analytics } from "@vercel/analytics/next"');
    expect(layout).toContain('import { SpeedInsights } from "@vercel/speed-insights/next"');
    expect(layout).toContain("<Analytics />");
    expect(layout).toContain("<SpeedInsights />");
    // Just the components: nothing that could hold or add visitor text.
    expect(layout).not.toMatch(/beforeSend|scriptSrc|endpoint|mode=/);
  });
});
