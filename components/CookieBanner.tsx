"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import { gtmAllowedOn } from "@/lib/gtm";
import { readConsent, saveConsent, subscribeConsent } from "@/lib/cookie-consent";

// Asks once whether Google Tag Manager may run. Nothing optional loads until the visitor says yes.
export default function CookieBanner() {
  const pathname = usePathname();
  const choice = useSyncExternalStore(subscribeConsent, readConsent, () => "yes" as const); // server: render nothing
  if (choice !== null || !gtmAllowedOn(pathname)) return null;
  return (
    <div
      role="region"
      aria-label="Tracking choice"
      className="glass-panel fixed inset-x-3 bottom-3 z-50 mx-auto flex max-w-xl flex-col gap-3 p-4 text-sm sm:flex-row sm:items-center"
    >
      <p className="text-mist">
        May we use Google Tag Manager to count visits and see what helps? It is optional.{" "}
        <Link href="/cookies" className="footer-link">
          Read more
        </Link>
      </p>
      <div className="flex shrink-0 gap-2">
        <button type="button" onClick={() => saveConsent("no")} className="nav-link rounded-lg px-3 py-2">
          No thanks
        </button>
        <button
          type="button"
          onClick={() => saveConsent("yes")}
          className="rounded-lg bg-cyan-400 px-3 py-2 font-medium text-[#050816] hover:bg-cyan-300"
        >
          Allow
        </button>
      </div>
    </div>
  );
}
