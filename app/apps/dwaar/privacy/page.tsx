import Link from "next/link";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import { dwaarPrivacyMetadata } from "@/lib/dwaar/metadata";

export const metadata = dwaarPrivacyMetadata;

// DRAFT. This notice describes what the code does today (Phase 1). It must be reviewed by a lawyer who knows
// India's Digital Personal Data Protection Act, 2023 before Dwaar opens to the public. Keep every sentence true to the code.
export default function DwaarPrivacyPage() {
  return (
    <>
      <Navbar />
      <main id="top" className="gutter pt-28 pb-28 sm:pt-32">
        <Link href="/apps/dwaar" className="back-link">
          <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
            <path d="M10 3 5 8l5 5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Dwaar
        </Link>
        <h1 className="page-title font-display mt-8">Terms and privacy notice</h1>
        <p role="note" className="measure mt-5 rounded-xl border border-amber-300/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-50">
          Draft for early access. It will be reviewed by a lawyer before Dwaar opens to everyone.
        </p>

        <div className="measure mt-10 flex flex-col gap-8 leading-relaxed text-mist">
          <section>
            <h2 className="font-display text-xl font-medium text-ink">What Dwaar is</h2>
            <p className="mt-3">
              Dwaar is an early-access service from Vyuhika Apps. Today you can sign in and create a profile. Asking for
              and giving referrals is not open yet. Dwaar does not promise any job, interview or referral.
            </p>
          </section>
          <section>
            <h2 className="font-display text-xl font-medium text-ink">What we collect</h2>
            <p className="mt-3">
              From your Google account: your name and email address. From you: your display name, an optional headline, whether you
              are looking for referrals or can refer people, and, if you can refer people, your company and work email. We
              also record which version of this notice you accepted, and when.
            </p>
            <p className="mt-3">We do not collect resumes, phone numbers or payment details in this version.</p>
          </section>
          <section>
            <h2 className="font-display text-xl font-medium text-ink">Why we collect it</h2>
            <p className="mt-3">
              To create your profile and, later, to connect people who want referrals with employees who can give them.
              We check that a work email belongs to the company you chose by comparing its domain with the company&apos;s
              saved email domains. We do not sell your data.
            </p>
          </section>
          <section>
            <h2 className="font-display text-xl font-medium text-ink">Who can see it</h2>
            <p className="mt-3">
              Only you can see your profile in this version. Our database is set up so that one person cannot read
              another person&apos;s profile. Our hosting and database providers (Vercel and Supabase) process the data for us.
            </p>
          </section>
          <section>
            <h2 className="font-display text-xl font-medium text-ink">Your choices</h2>
            <p className="mt-3">
              You can change your profile any time from the Dwaar page, and you can delete it there with one button. Deleting
              removes the profile details above. Your Google sign-in record stays so you can come back; to remove it too,
              write to support@vyuhika.com and we will delete it.
            </p>
          </section>
          <section>
            <h2 className="font-display text-xl font-medium text-ink">Using Dwaar</h2>
            <p className="mt-3">
              Give only true information. Use your own work email, never someone else&apos;s. We may remove profiles that
              break these rules. Dwaar is provided as it is, and early-access features can change or stop.
            </p>
          </section>
          <section>
            <h2 className="font-display text-xl font-medium text-ink">Contact</h2>
            <p className="mt-3">Questions or requests about your data: support@vyuhika.com.</p>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
