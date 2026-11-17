import { describe, expect, it } from "vitest";
import { hasPublicHttpsShape, isPrivateAddress, isPublicHttpsUrl, linkOpens } from "@/lib/dwaar/url-safety";

const publicDns = async () => ["93.184.216.34"];
const reply = (status: number, location?: string) => new Response(null, { status, headers: location ? { location } : {} });

describe("isPrivateAddress", () => {
  it("flags private, loopback and link-local addresses", () => {
    for (const a of ["127.0.0.1", "10.1.2.3", "192.168.0.5", "172.16.0.1", "169.254.169.254", "0.0.0.0", "::1", "fe80::1", "fd00::1"]) {
      expect(isPrivateAddress(a), a).toBe(true);
    }
  });
  it("lets public addresses through", () => {
    expect(isPrivateAddress("93.184.216.34")).toBe(false);
  });
});

describe("hasPublicHttpsShape", () => {
  it("accepts a plain https link and refuses the rest", () => {
    expect(hasPublicHttpsShape("https://careers.example.com/jobs/1") !== null).toBe(true);
    for (const bad of ["http://example.com/a", "https://user:pw@example.com/a", "https://localhost/a", "https://10.0.0.1/a", "javascript:alert(1)", "not a url"]) {
      expect(hasPublicHttpsShape(bad) === null, bad).toBe(true);
    }
  });
});

describe("isPublicHttpsUrl", () => {
  it("refuses a name that points to a private address", async () => {
    expect(await isPublicHttpsUrl("https://careers.example.com/a", async () => ["10.0.0.7"])).toBe(false);
    expect(await isPublicHttpsUrl("https://careers.example.com/a", publicDns)).toBe(true);
  });
});

describe("linkOpens", () => {
  it("is true for a page that opens", async () => {
    expect(await linkOpens("https://careers.example.com/a", { fetchFn: async () => reply(200), lookup: publicDns })).toBe(true);
  });
  it("is false for a missing page", async () => {
    expect(await linkOpens("https://careers.example.com/a", { fetchFn: async () => reply(404), lookup: publicDns })).toBe(false);
  });
  it("accepts sites that block robots but exist", async () => {
    expect(await linkOpens("https://careers.example.com/a", { fetchFn: async () => reply(403), lookup: publicDns })).toBe(true);
  });
  it("follows a redirect and checks every step", async () => {
    const replies = [reply(302, "https://jobs.example.com/b"), reply(200)];
    let calls = 0;
    const fetchFn = async () => replies[calls++];
    expect(await linkOpens("https://careers.example.com/a", { fetchFn, lookup: publicDns })).toBe(true);
    expect(calls).toBe(2);
  });
  it("refuses a redirect to a private address", async () => {
    let calls = 0;
    const fetchFn = async () => (calls++ === 0 ? reply(302, "https://127.0.0.1/admin") : reply(200));
    expect(await linkOpens("https://careers.example.com/a", { fetchFn, lookup: publicDns })).toBe(false);
    expect(calls).toBe(1);
  });
  it("gives up after too many redirects and on network errors", async () => {
    expect(await linkOpens("https://careers.example.com/a", { fetchFn: async () => reply(302, "https://careers.example.com/a"), lookup: publicDns })).toBe(false);
    expect(await linkOpens("https://careers.example.com/a", { fetchFn: async () => { throw new Error("boom"); }, lookup: publicDns })).toBe(false);
  });
});
