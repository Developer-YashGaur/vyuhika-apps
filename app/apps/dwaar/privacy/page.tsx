import Link from "next/link";
import { dwaarPrivacyMetadata } from "@/lib/dwaar/metadata";

export const metadata = dwaarPrivacyMetadata;

// DRAFT. This notice describes what the code does today (Phase 1). It must be reviewed by a lawyer who knows
// India's Digital Personal Data Protection Act, 2023 before Dwaar opens to the public. Keep every sentence true to the code.
export default function DwaarPrivacyPage() {
  return (
    <div className="dw-wrap dw-page">
        <Link href="/apps/dwaar" className="dw-back">
          <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
            <path d="M10 3 5 8l5 5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Dwaar
        </Link>
        <h1 className="dw-title dw-display mt-8">Terms and privacy notice</h1>
        <p role="note" className="dw-alert dw-alert-warn mt-5">
          Draft for early access. It will be reviewed by a lawyer before Dwaar opens to everyone.
        </p>

        <div className="dw-card mt-10 flex max-w-3xl flex-col gap-8 leading-relaxed dw-muted">
          <section>
            <h2 className="dw-display text-xl font-medium">What Dwaar is</h2>
            <p className="mt-3">
              Dwaar is an early-access service from Vyuhika Apps. Candidates ask employees of a company for a referral for a
              job, and employees who work at that company can accept. Dwaar does not promise any job, interview or referral,
              and nobody pays anything in this version.
            </p>
          </section>
          <section>
            <h2 className="dw-display text-xl font-medium">What we collect</h2>
            <p className="mt-3">
              From your Google account: your name and email address. From you: your display name, an optional headline, whether you
              are looking for referrals or can refer people, and, if you can refer people, your company and work email. We
              also record which version of this notice you accepted, and when.
            </p>
            <p className="mt-3">
              When you ask for a referral: the company, the job title, an optional job ID, the job link, the job description,
              an optional note, and your resume file (PDF or Word, up to 2 MB). We record that you agreed to the resume check,
              and when.
            </p>
            <p className="mt-3">
              If you can refer people, we email a 6-digit code to your work email to check that the address is yours. We keep
              only a scrambled copy of the code, for 15 minutes, together with how many codes you asked for, to prevent abuse.
            </p>
            <p className="mt-3">We do not collect phone numbers or payment details in this version.</p>
          </section>
          <section>
            <h2 className="dw-display text-xl font-medium">Your resume and the match score</h2>
            <p className="mt-3">
              Your resume file is stored privately, in a folder only your account can open. Your browser reads the text out of
              the file. Our server checks that the file really is a PDF or Word file and never opens it. To give you the free match
              score, we send the text of your resume and the job description to Google&apos;s Gemini AI service. Before that we
              remove email addresses and phone numbers from the text.
            </p>
            <p className="mt-3">
              We keep the result: a score from 0 to 100, one short sentence, and lists of skills that matched or are missing.
              We do not keep the extracted resume text. The score is an estimate made by an AI. It can be wrong, and it does not
              predict what a recruiter or an employee will decide. You can have 5 resume checks in any 24 hours.
            </p>
            <p className="mt-3">
              When you cancel a request, we delete its resume file and clear its job description and score. When you delete your
              Dwaar profile, we cancel your open requests and do the same for all your requests. A request that closed (accepted or cancelled) loses its resume file, job description and score 90 days later. A request that is still open after 180 days is cancelled and loses them too. This clean-up runs once a day.</p>
          </section>
          <section>
            <h2 className="dw-display text-xl font-medium">Why we collect it</h2>
            <p className="mt-3">
              To create your profile, to connect people who want referrals with employees who can give them, and to give
              you the match score. We check that a work email belongs to the company you chose by comparing its domain with the
              company&apos;s saved email domains. We do not sell your data.
            </p>
          </section>
          <section>
            <h2 className="dw-display text-xl font-medium">Who can see it</h2>
            <p className="mt-3">
              Employees who work at the company you asked, and who confirmed their work email, can see your name, your headline,
              the job title, the job ID, the job link and your note. They cannot see your resume, the job description or your
              score. Your email address is shown only to the one employee who accepts your request, and only after they accept.
              People cannot ask for a referral at the company they work at, and employees never see their own requests.
            </p>
            <p className="mt-3">
              Confirmed employees at that company get an email saying that someone is asking for a referral, with the job
              title and the company, and at most 3 such emails a day. Your name is not in that email.
            </p>
            <p className="mt-3">
              Our database is set up so that one person cannot read another person&apos;s private data. Our providers process
              data for us: Vercel (hosting), Supabase (database and file storage), Google (the AI check) and Resend (email).
            </p>
          </section>
          <section>
            <h2 className="dw-display text-xl font-medium">How long requests last</h2>
            <p className="mt-3">
              An open request closes by itself after 30 days. You can have up to 5 open requests, and you can cancel one at any
              time.
            </p>
          </section>
          <section>
            <h2 className="dw-display text-xl font-medium">Your choices</h2>
            <p className="mt-3">
              You can change your profile any time from the Dwaar page, and you can delete it there with one button. Deleting
              removes the profile details above. Your Google sign-in record stays so you can come back; to remove it too, or to
              remove a resume file, write to support@vyuhika.com and we will delete it.
            </p>
          </section>
          <section>
            <h2 className="dw-display text-xl font-medium">Using Dwaar</h2>
            <p className="mt-3">
              Give only true information, and attach only your own resume. Use your own work email, never someone else&apos;s.
              Do not put instructions meant for an AI into your resume or job description. Resumes that try to manipulate the
              check get a lower, capped score. We may remove profiles that break these rules. Dwaar is provided as it is, and
              early-access features can change or stop.
            </p>
          </section>
          <section>
            <h2 className="dw-display text-xl font-medium">Contact</h2>
            <p className="mt-3">Questions or requests about your data: support@vyuhika.com.</p>
          </section>
        </div>
      </div>
  );
}
