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

        <DwaarNav links={LINKS} />

        <Suspense fallback={null}>
          <DwaarAccount />
        </Suspense>

      </div>
    </header>
  );
}
