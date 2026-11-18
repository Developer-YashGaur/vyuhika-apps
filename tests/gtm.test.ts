import { describe, expect, it } from "vitest";
import { GTM_ID, GTM_INIT, GTM_SRC, gtmAllowedOn } from "@/lib/gtm";

describe("Google Tag Manager", () => {
  it("uses the container id we were given", () => {
    expect(GTM_ID).toBe("GTM-P57GKTXV");
    expect(GTM_SRC).toBe("https://www.googletagmanager.com/gtm.js?id=GTM-P57GKTXV");
  });
  it("starts the data layer the way Tag Manager expects", () => {
    expect(GTM_INIT).toContain("window.dataLayer = window.dataLayer || []");
    expect(GTM_INIT).toContain("event: 'gtm.js'");
  });
  it("is loaded on public pages", () => {
    for (const path of ["/", "/apps/resume-matcher", "/apps/cover-letter-writer", "/apps/dwaar", "/apps/dwaar/", null]) {
      expect(gtmAllowedOn(path), String(path)).toBe(true);
    }
  });
  it("is kept off Dwaar's pages behind sign-in", () => {
    for (const path of ["/apps/dwaar/profile", "/apps/dwaar/inbox", "/apps/dwaar/requests/abc/chat", "/apps/dwaar/find", "/apps/dwaar/plus", "/apps/dwaar/privacy"]) {
      expect(gtmAllowedOn(path), path).toBe(false);
    }
  });
});
