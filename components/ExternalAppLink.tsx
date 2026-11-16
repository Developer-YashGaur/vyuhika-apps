"use client";

import { trackEvent } from "@/lib/analytics";
import { externalLinkProps } from "@/lib/site";

// A link to an app on another site (like Koshvia): opens in a new tab (put an <ExternalHint /> inside it), and counts the click
// the same way the home page card does (the app's slug only, as a fixed word).
export default function ExternalAppLink({ slug, href, className, children }: { slug: string; href: string; className?: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      {...externalLinkProps}
      className={className}
      onClick={() => trackEvent("external_app_clicked", { app: slug })}
      onAuxClick={(e) => e.button === 1 && trackEvent("external_app_clicked", { app: slug })} // middle click
    >
      {children}
    </a>
  );
}
