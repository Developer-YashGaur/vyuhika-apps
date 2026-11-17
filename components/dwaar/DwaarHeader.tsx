import Link from "next/link";
import DwaarMark from "@/components/dwaar/DwaarMark";

const LINKS = [
  { href: "/apps/dwaar#how", label: "How it works" },
  { href: "/apps/dwaar/find", label: "Find jobs" },
  { href: "/apps/dwaar/requests", label: "My requests" },
  { href: "/apps/dwaar/inbox", label: "Employee desk" },
  { href: "/apps/dwaar/profile", label: "Profile" },
];

// Dwaar's own top bar. Links only (no sign-in state), so the header never makes a page wait.
export default function DwaarHeader() {
  return (
    <header className="dw-header">
      <div className="dw-wrap dw-header-inner">
        <Link href="/apps/dwaar" className="dw-brand dw-display" aria-label="Dwaar home">
          <DwaarMark />
          Dwaar
          <span className="dw-brand-tag">Early access</span>
        </Link>

        <nav aria-label="Dwaar" className="dw-nav">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href}>
              {l.label}
            </Link>
          ))}
        </nav>

        <details className="dw-menu">
          <summary>Menu</summary>
          <nav aria-label="Dwaar menu" className="dw-menu-panel">
            {LINKS.map((l) => (
              <Link key={l.href} href={l.href}>
                {l.label}
              </Link>
            ))}
          </nav>
        </details>
      </div>
    </header>
  );
}
