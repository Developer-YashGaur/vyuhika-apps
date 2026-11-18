import Link from "next/link";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import type { SitePage as SitePageInfo } from "@/lib/legal";

// The shared frame of the About, Terms, Privacy, Refunds, Cookies and Contact pages: navbar, title, "last updated" date,
// plain readable text, footer. Plain server components, so every word is in the page's HTML.

export function SitePageFrame({ page, children }: { page: SitePageInfo; children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <main id="top" className="gutter pt-28 pb-28 sm:pt-32">
        <Link href="/" className="back-link">
          <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
            <path d="M10 3 5 8l5 5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Home
        </Link>
        <header className="mt-8 mb-10">
          <h1 className="page-title font-display">{page.title}</h1>
          <p className="mt-4 text-sm text-mist">Last updated: {page.updated}</p>
        </header>
        <div className="measure flex flex-col gap-4 leading-relaxed text-mist">{children}</div>
      </main>
      <Footer />
    </>
  );
}

export function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="section-subtitle font-display mt-10">{children}</h2>;
}

export function UL({ children }: { children: React.ReactNode }) {
  return <ul className="ml-5 flex list-disc flex-col gap-2">{children}</ul>;
}

export function A({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="footer-link">
      {children}
    </Link>
  );
}
