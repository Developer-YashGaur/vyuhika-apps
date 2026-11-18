"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import { readConsent, subscribeConsent } from "@/lib/cookie-consent";
import { GTM_INIT, GTM_SRC, gtmAllowedOn } from "@/lib/gtm";

// Loads Google Tag Manager on public pages only, and only after the visitor allowed it (see CookieBanner), and only in the live site (not while developing, so test visits do
// not show up in the reports). See lib/gtm.ts for which pages are left out.
export default function GoogleTagManager() {
  const pathname = usePathname();
  const choice = useSyncExternalStore(subscribeConsent, readConsent, () => null);
  if (process.env.NODE_ENV !== "production" || !gtmAllowedOn(pathname) || choice !== "yes") return null;
  return (
    <>
      <Script id="gtm-init" strategy="afterInteractive">
        {GTM_INIT}
      </Script>
      <Script id="gtm-script" src={GTM_SRC} strategy="afterInteractive" />
    </>
  );
}
