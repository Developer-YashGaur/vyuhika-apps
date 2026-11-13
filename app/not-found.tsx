import type { Metadata } from "next";
import Link from "next/link";
import Footer from "@/components/Footer";
import Logo from "@/components/Logo";
import Navbar from "@/components/Navbar";

// Shown for any address that doesn't exist.

export const metadata: Metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <>
      <Navbar />
      <main id="top" className="gutter flex min-h-[80svh] flex-col items-center justify-center pt-28 pb-20 text-center">
        <div className="logo-pulse">
          <Logo variant="icon" size={112} decorative />
        </div>
        <p className="mt-8 text-sm font-medium tracking-wide text-accent">Error 404</p>
        <h1 className="page-title font-display mt-3">Lost in space</h1>
        <p className="measure mt-5 text-lg leading-relaxed text-mist">
          We couldn&apos;t find that page. It may have moved, or the link has a typo.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <Link href="/" className="btn-glow">
            Back to home
          </Link>
          <Link href="/apps/resume-matcher" className="btn-ghost">
            Try the Resume Matcher
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
