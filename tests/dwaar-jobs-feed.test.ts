import { describe, expect, it } from "vitest";
import { chooseProvider, cleanText, fetchLatestJobs, normalizeAdzuna, normalizeRemotive, pickLatest, type FeedJob } from "@/lib/dwaar/jobs-feed";

const adz = (over: Record<string, unknown> = {}) => ({
  id: "123",
  title: "Backend Developer",
  company: { display_name: "Acme" },
  location: { display_name: "Pune, Maharashtra" },
  description: "Build <b>APIs</b> in Python. Mail jobs@acme.com or visit https://acme.com/x",
  redirect_url: "https://www.adzuna.in/land/ad/123",
  created: "2026-11-20T08:00:00Z",
  ...over,
});

describe("cleanText", () => {
  it("removes tags, links and contacts", () => {
    const out = cleanText("<p>Hi <a href='x'>there</a></p> mail a@b.com call +91 98765 43210 https://evil.example/x", 300);
    expect(out.includes("<")).toBe(false);
    expect(out.includes("a@b.com")).toBe(false);
    expect(out.includes("98765")).toBe(false);
    expect(out.includes("evil.example")).toBe(false);
  });
  it("cuts long text", () => {
    expect(cleanText("a ".repeat(500), 50).length <= 50).toBe(true);
  });
  it("answers empty text for a non-string", () => {
    expect(cleanText(42, 50)).toBe("");
  });
});

describe("normalizeAdzuna", () => {
  it("maps a normal job", () => {
    const [job] = normalizeAdzuna({ results: [adz()] });
    expect(job.source).toBe("adzuna");
    expect(job.company).toBe("Acme");
    expect(job.description.includes("jobs@acme.com")).toBe(false);
    expect(job.postedAt).toBe("2026-11-20T08:00:00.000Z");
  });
  it("drops jobs with an unsafe or missing link", () => {
    const list = normalizeAdzuna({ results: [adz({ redirect_url: "http://insecure.example/x" }), adz({ id: "2", redirect_url: "javascript:alert(1)" }), adz({ id: "3", redirect_url: undefined })] });
    expect(list.length).toBe(0);
  });
  it("drops jobs with no title or id and survives bad input", () => {
    expect(normalizeAdzuna({ results: [adz({ title: "" }), adz({ id: undefined })] }).length).toBe(0);
    expect(normalizeAdzuna(null).length).toBe(0);
    expect(normalizeAdzuna({ results: "nope" }).length).toBe(0);
  });
});

describe("normalizeRemotive", () => {
  it("maps a remote job and defaults the place to Remote", () => {
    const [job] = normalizeRemotive({ jobs: [{ id: 9, title: "Python Dev", company_name: "Globex", candidate_required_location: "", description: "<p>Work</p>", url: "https://remotive.com/job/9", publication_date: "2026-11-19T10:00:00" }] });
    expect(job.source).toBe("remotive");
    expect(job.location).toBe("Remote");
    expect(job.externalId).toBe("9");
  });
});

describe("pickLatest", () => {
  const job = (id: string, postedAt: string | null): FeedJob => ({ source: "adzuna", externalId: id, title: "T", company: "C", location: "", description: "", url: "https://x.example.com/", postedAt });
  it("keeps one copy, newest first, and at most the size", () => {
    const out = pickLatest([job("a", "2026-11-18T00:00:00Z"), job("b", "2026-11-20T00:00:00Z"), job("a", "2026-11-18T00:00:00Z"), job("c", null)], 2);
    expect(out.map((j) => j.externalId).join(",")).toBe("b,a");
  });
});

describe("provider choice and fetching", () => {
  it("uses Remotive without keys and Adzuna with both keys", () => {
    expect(chooseProvider({})).toBe("remotive");
    expect(chooseProvider({ ADZUNA_APP_ID: "x" })).toBe("remotive");
    expect(chooseProvider({ ADZUNA_APP_ID: "x", ADZUNA_APP_KEY: "y" })).toBe("adzuna");
  });
  it("calls the Adzuna address for the chosen country and returns cleaned jobs", async () => {
    let seen = "";
    const fakeFetch = async (url: string) => {
      seen = url;
      return new Response(JSON.stringify({ results: [adz()] }), { status: 200 });
    };
    const jobs = await fetchLatestJobs({ ADZUNA_APP_ID: "id", ADZUNA_APP_KEY: "key", ADZUNA_COUNTRY: "IN" }, fakeFetch);
    expect(seen.startsWith("https://api.adzuna.com/v1/api/jobs/in/search/1?")).toBe(true);
    expect(jobs.length).toBe(1);
  });
  it("throws when the source answers with an error", async () => {
    let failed = false;
    try {
      await fetchLatestJobs({}, async () => new Response("no", { status: 500 }));
    } catch {
      failed = true;
    }
    expect(failed).toBe(true);
  });
});
