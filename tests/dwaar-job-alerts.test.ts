import { describe, expect, it } from "vitest";
import { jobAlertText, parseAlertJobs } from "@/lib/dwaar/job-alert-text";
import { ALERT_MESSAGES, saveMyAlert } from "@/lib/dwaar/job-alerts";

const db = (code: string | null) => ({ rpc: async () => ({ data: true, error: code ? { code, message: "x" } : null }) }) as never;

describe("parseAlertJobs", () => {
  it("keeps good https jobs and drops broken ones", () => {
    const jobs = parseAlertJobs([
      { title: "Dev", company: "Acme", location: "Pune", url: "https://example.com/1" },
      { title: "Bad link", company: "X", location: "", url: "javascript:alert(1)" },
      { title: 5, company: "X", url: "https://example.com/2" },
      null,
    ]);
    expect(jobs.length).toBe(1);
    expect(jobs[0]!.title).toBe("Dev");
  });
  it("takes at most 5 and returns nothing for non-lists", () => {
    const many = Array.from({ length: 9 }, (_, i) => ({ title: `J${i}`, company: "C", location: "", url: `https://example.com/${i}` }));
    expect(parseAlertJobs(many).length).toBe(5);
    expect(parseAlertJobs("nope")).toEqual([]);
  });
});

describe("jobAlertText", () => {
  it("lists the jobs and says how to stop", () => {
    const text = jobAlertText("python pune", [{ title: "Dev", company: "Acme", location: "Pune", url: "https://example.com/1" }], "https://apps.vyuhika.com");
    expect(text).toContain("Dev at Acme (Pune)");
    expect(text).toContain("turn them off");
  });
});

describe("saveMyAlert", () => {
  it("maps the database answers to plain results", async () => {
    expect(await saveMyAlert(db(null), "python", true)).toBe("saved");
    expect(await saveMyAlert(db(null), "", false)).toBe("off");
    expect(await saveMyAlert(db("DW040"), "python", true)).toBe("no-plus");
    expect(await saveMyAlert(db("DW043"), "x", true)).toBe("words");
    expect(await saveMyAlert(db("XX000"), "python", true)).toBe("failed");
    expect(ALERT_MESSAGES.saved.length > 0).toBe(true);
  });
});
