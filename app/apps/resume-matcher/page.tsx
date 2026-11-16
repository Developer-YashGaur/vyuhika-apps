import Link from "next/link";
import AppGuide from "@/components/AppGuide";
import Footer from "@/components/Footer";
import JsonLd from "@/components/JsonLd";
import MoreTools from "@/components/MoreTools";
import Navbar from "@/components/Navbar";
import ResumeMatcher from "@/components/resume-matcher/ResumeMatcher";
import { resumeMatcherMetadata } from "@/lib/metadata";
import { appStructuredData } from "@/lib/structured-data";

export const metadata = resumeMatcherMetadata;

export default function ResumeMatcherPage() {
  return (
    <>
      <Navbar />
      <JsonLd data={appStructuredData("resume-matcher")} />
      <main id="top" className="gutter pt-28 pb-28 sm:pt-32">
        <Link href="/#apps" className="back-link">
          <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
            <path d="M10 3 5 8l5 5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          All apps
        </Link>

        <header className="mt-8 mb-12 sm:mb-16">
          <div className="flex flex-wrap items-center gap-4">
            <h1 className="page-title font-display">Resume Matcher</h1>
            <span className="badge badge-glow glow-cyan">Free</span>
          </div>
          <p className="measure mt-5 text-lg leading-relaxed text-mist">
            Paste your resume and a job description. You&apos;ll get a match score, the keywords you&apos;re
            missing, and three specific changes to make.
          </p>
        </header>

        <ResumeMatcher />

        <AppGuide slug="resume-matcher" name="Resume Matcher" />
        <MoreTools currentSlug="resume-matcher" />
      </main>

      <Footer />
    </>
  );
}
