import Link from "next/link";
import { Suspense } from "react";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import DwaarHome from "@/components/dwaar/DwaarHome";
import { dwaarMetadata } from "@/lib/dwaar/metadata";

export const metadata = dwaarMetadata;

export default function DwaarPage({ searchParams }: { searchParams: Promise<{ error?: string; saved?: string; deleted?: string }> }) {
  return (
    <>
      <Navbar />
      <main id="top" className="gutter pt-28 pb-28 sm:pt-32">
        <Link href="/#apps" className="back-link">
          <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
            <path d="M10 3 5 8l5 5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          All apps
        </Link>

        <header className="mt-8 mb-10 sm:mb-14">
          <div className="flex flex-wrap items-center gap-4">
            <h1 className="page-title font-display">Dwaar</h1>
            <span className="badge badge-glow glow-cyan">Early access</span>
          </div>
          <p className="measure mt-5 text-lg leading-relaxed text-mist">
            Dwaar means &ldquo;door&rdquo;. It is a place where job seekers can ask employees for a referral, and
            employees can help people get in.
          </p>
        </header>

        <Suspense fallback={<p className="text-mist">Loading…</p>}>
          <DwaarHome searchParams={searchParams} />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
