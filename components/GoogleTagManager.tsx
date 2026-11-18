"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { GTM_ID, GTM_INIT, GTM_SRC, gtmAllowedOn } from "@/lib/gtm";

// Loads Google Tag Manager on public pages only, and only in the live site (not while developing, so test visits do
// not show up in the reports). See lib/gtm.ts for which pages are left out.
export default function GoogleTagManager() {
  const pathname = usePathname();
  if (process.env.NODE_ENV !== "production" || !gtmAllowedOn(pathname)) return null;
  return (
    <>
      <Script id="gtm-init" strategy="afterInteractive">
        {GTM_INIT}
      </Script>
      <Script id="gtm-script" src={GTM_SRC} strategy="afterInteractive" />
      <noscript>
        <iframe
          src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
          height="0"
          width="0"
          style={{ display: "none", visibility: "hidden" }}
          title="Google Tag Manager"
        />
      </noscript>
    </>
  );
}
