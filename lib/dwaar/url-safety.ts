import { lookup as dnsLookup } from "node:dns/promises";

// Checks a web link before the server touches it. The links come from an AI that read web pages, so they are
// UNTRUSTED: a bad one could point at the server's own network (an "SSRF" attack). Only plain public https links
// are allowed; the host name must resolve to public addresses only; redirects are followed by hand and checked too.

export function isPrivateAddress(address: string): boolean {
  const a = address.toLowerCase();
  const mapped = a.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isPrivateAddress(mapped[1]);
  const v4 = a.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (v4) {
    const [x, y] = [Number(v4[1]), Number(v4[2])];
    return (
      x === 0 || x === 10 || x === 127 || x >= 224 ||
      (x === 100 && y >= 64 && y <= 127) ||
      (x === 169 && y === 254) ||
      (x === 172 && y >= 16 && y <= 31) ||
      (x === 192 && y === 168) ||
      (x === 192 && y === 0) ||
      (x === 198 && (y === 18 || y === 19))
    );
  }
  if (a.includes(":")) {
    return a === "::" || a === "::1" || a.startsWith("fc") || a.startsWith("fd") || a.startsWith("fe8") || a.startsWith("fe9") || a.startsWith("fea") || a.startsWith("feb") || a.startsWith("ff");
  }
  return true; // not an address we understand: treat as unsafe
}

export type Lookup = (host: string) => Promise<string[]>;

export const defaultLookup: Lookup = async (host) => (await dnsLookup(host, { all: true })).map((r) => r.address);

// A plain public https URL: no login in it, standard port, a real host name (not an IP address or a local name).
export function hasPublicHttpsShape(raw: string): URL | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || url.username || url.password) return null;
  if (url.port && url.port !== "443") return null;
  const host = url.hostname.toLowerCase();
  if (!host.includes(".") || /^[\d.]+$/.test(host) || host.includes(":") || host.startsWith("[")) return null;
  if (host === "localhost" || /\.(localhost|local|internal|lan|home|corp)$/.test(host)) return null;
  return url;
}

export async function isPublicHttpsUrl(raw: string, lookup: Lookup = defaultLookup): Promise<boolean> {
  const url = hasPublicHttpsShape(raw);
  if (!url) return false;
  try {
    const addresses = await lookup(url.hostname);
    return addresses.length > 0 && addresses.every((address) => !isPrivateAddress(address));
  } catch {
    return false;
  }
}

type VerifyDeps = { fetchFn?: typeof fetch; lookup?: Lookup; timeoutMs?: number };

const OPEN_ENOUGH = new Set([401, 403, 429]); // some careers sites turn bots away even though the page exists
const MAX_HOPS = 4;

// True when the link opens (or the site only refuses robots). A missing page, a server error, a network error or a
// link that redirects somewhere unsafe all count as "does not open". Nothing from the page is read or kept.
export async function linkOpens(raw: string, { fetchFn = fetch, lookup = defaultLookup, timeoutMs = 7000 }: VerifyDeps = {}): Promise<boolean> {
  const signal = AbortSignal.timeout(timeoutMs);
  let current = raw;
  for (let hop = 0; hop <= MAX_HOPS; hop++) {
    if (!(await isPublicHttpsUrl(current, lookup))) return false;
    let response: Response;
    try {
      response = await fetchFn(current, { method: "GET", redirect: "manual", signal, headers: { "User-Agent": "Mozilla/5.0 (compatible; DwaarLinkCheck/1.0)" } });
    } catch {
      return false;
    }
    void response.body?.cancel().catch(() => undefined);
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) return false;
      try {
        current = new URL(location, current).toString();
      } catch {
        return false;
      }
      continue;
    }
    return response.status < 400 || OPEN_ENOUGH.has(response.status);
  }
  return false; // too many redirects
}
