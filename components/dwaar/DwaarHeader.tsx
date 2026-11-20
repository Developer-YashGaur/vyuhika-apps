import Link from "next/link";
import { Suspense } from "react";
import DwaarAccount from "@/components/dwaar/DwaarAccount";
import DwaarMark from "@/components/dwaar/DwaarMark";
import DwaarNav, { type NavLink } from "@/components/dwaar/DwaarNav";

const LINKS: NavLink[] = [
  { href: "/apps/dwaar#how", label: "How it works" },
  { href: "/apps/dwaar/find", label: "Find jobs" },
  { href: "/apps/dwaar/requests", label: "My requests" },
  { href: "/apps/dwaar/chats", label: "Chats", badge: "unread" },
  { href: "/apps/dwaar/inbox", label: "Employee desk", badge: "waiting" },
  { href: "/apps/dwaar/credits", label: "Credits" },
  { href: "/apps/dwaar/profile", label: "Profile" },
];

// Dwaar's own top bar. The account area (sign in / credits) loads in its own <Suspense>, so the page never waits for it.
export default function DwaarHeader() {
  return (
    <header className="dw-header">
      <div className="dw-wrap dw-header-inner">
        <Link href="/apps/dwaar" className="dw-brand dw-display" aria-label="Dwaar home">
          <DwaarMark />
          Dwaar
          <span className="dw-brand-tag">Early access</span>
        </Link>

        {/* The nav reads the current page address, so it loads in its own <Suspense>. Until then the plain links show. */}
        <Suspense
          fallback={
            <nav aria-label="Dwaar" className="dw-nav">
              {LINKS.map((l) => (
                <Link key={l.href} href={l.href}>
                  {l.label}
                </Link>
              ))}
            </nav>
          }
        >
          <DwaarNav links={LINKS} />
        </Suspense>

        <Suspense fallback={null}>
          <DwaarAccount />
        </Suspense>

      </div>
    </header>
  );
}
