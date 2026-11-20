import { Suspense } from "react";
import DoorArch from "@/components/dwaar/art/DoorArch";
import DwaarHome from "@/components/dwaar/DwaarHome";
import DwaarFaq from "@/components/dwaar/DwaarFaq";
import HowItWorks from "@/components/dwaar/HowItWorks";
import JsonLd from "@/components/JsonLd";
import { dwaarPublicMetadata } from "@/lib/dwaar/metadata";
import { appStructuredData } from "@/lib/structured-data";

export const metadata = dwaarPublicMetadata;

const POINTS = [
  "A free resume match score before you ask anyone",
  "Employees see your headline and the job. Your resume is shown only to the employee who accepts",
  "Your email is never shared with employees",
];

export default function DwaarPage({ searchParams }: { searchParams: Promise<{ error?: string; saved?: string; deleted?: string; confirmed?: string }> }) {
  return (
    <div className="dw-wrap dw-page">
      <JsonLd data={appStructuredData("dwaar")} />
      <section className="dw-hero">
        <div>
          <p className="dw-eyebrow">Referrals, made simple</p>
          <h1 className="dw-title dw-display mt-3">Find the right door into the company you want.</h1>
          <p className="dw-lede mt-5">
            Dwaar checks how well your resume fits a job, then shows your request to employees at that company. If one
            agrees, you get a referral.
          </p>
          <ul className="dw-points">
            {POINTS.map((p) => (
              <li key={p}>
                <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                  <path d="m3 9.5 4 4 8-9" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {p}
              </li>
            ))}
          </ul>
        </div>
        <DoorArch />
      </section>

      <section id="desk" aria-label="Your Dwaar desk" className="mt-16 scroll-mt-24">
        <Suspense fallback={<p className="dw-muted">Loading…</p>}>
          <DwaarHome searchParams={searchParams} />
        </Suspense>
      </section>

      <HowItWorks />
      <DwaarFaq />
    </div>
  );
}
