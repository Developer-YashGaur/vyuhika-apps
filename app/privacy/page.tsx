import { A, H2, SitePageFrame, UL } from "@/components/SitePage";
import { company, sitePage } from "@/lib/legal";
import { sitePageMetadata } from "@/lib/metadata";

const page = sitePage("privacy");
export const metadata = sitePageMetadata(page);

export default function PrivacyPage() {
  return (
    <SitePageFrame page={page}>
      <p>
        This policy explains what {company.legalName} collects when you use Vyuhika Apps at apps.vyuhika.com, why, who sees it, how long
        we keep it and what you can do. Dwaar has its own, more detailed notice: <A href="/apps/dwaar/privacy">Dwaar privacy notice</A>.
        Koshvia has its own policy on its own site.
      </p>

      <H2>Resume Matcher and Cover Letter Writer</H2>
      <UL>
        <li>You do not need an account. The text you enter, or the text read from a file in your browser, is sent to an AI service (Google Gemini) to make your result.</li>
        <li>We do not store your resume, job description, answers or results. They are shown to you and then gone.</li>
        <li>To limit abuse we count requests per internet address. These counts are kept in the server&apos;s memory for a short time and are not saved in a database.</li>
      </UL>

      <H2>Dwaar</H2>
      <p>
        Dwaar needs you to sign in with Google. We receive your name and email address from your Google account. For referral requests we
        keep what you give us: your profile (name, headline, LinkedIn link, phone number, other links, skills), the company, job details,
        your resume file and your messages. For employees we also keep the company and work email. What is shown to whom, and how long
        each thing is kept, is explained in the <A href="/apps/dwaar/privacy">Dwaar privacy notice</A>. In short, employees never see
        your resume, and your phone number and email stay hidden unless you choose to share them in the chat.
      </p>

      <H2>Feedback you send</H2>
      <p>
        If you use the Feedback button, your message, the type you chose, the page you were on and (only if you add it) your email are
        emailed to us so we can read and answer. For a &ldquo;wrong result&rdquo; report, you can attach the result details such as a score and
        keywords, never your resume or job text. We keep feedback emails only as long as we need them to improve the tools.
      </p>

      <H2>Visit measurement</H2>
      <p>
        We use Vercel Web Analytics and Speed Insights (visits, country, device, where you came from, page speed) and, only if you allow it in the banner, Google Tag Manager
        on public pages (only if you allow it). See <A href="/cookies">Cookies and Tracking</A>. None of it includes the text of your resume, letters or chats.
      </p>

      <H2>Payments</H2>
      <p>
        Paid features are paid through Razorpay. Razorpay collects your card or UPI details. We receive only the payment status, amount
        and payment ID, never your card number.
      </p>

      <H2>Who we share data with</H2>
      <p>We do not sell your data. We use these service providers to run the site, each under its own terms:</p>
      <UL>
        <li>Google (Gemini AI, and Google sign-in)</li>
        <li>Supabase (database, sign-in and private file storage for Dwaar)</li>
        <li>Vercel (hosting and visit measurement)</li>
        <li>Resend (sending our emails)</li>
        <li>Razorpay (payments)</li>
      </UL>
      <p>Some of these providers run servers outside India, so your data may be processed in other countries. We may also share data if the law requires it.</p>

      <H2>How long we keep data</H2>
      <p>
        Resume Matcher and Cover Letter Writer: nothing is kept. Dwaar: resume files and job details are deleted when you cancel a
        request or delete your profile, and automatically 90 days after a request closes (or 180 days for a request nobody answered).
        Payment records are kept as long as the law requires.
      </p>

      <H2>Your rights and choices</H2>
      <UL>
        <li>You can see and change your Dwaar profile at any time, and delete it from the Dwaar home page. That removes your requests and resumes.</li>
        <li>You can ask us to give you, correct or delete the data we hold about you, or take back a consent you gave.</li>
        <li>You can make a complaint to our Grievance Officer (see <A href="/contact">Contact</A>), and, if you are not satisfied, to the Data Protection Board of India once it is set up.</li>
      </UL>
      <p>
        Email <a href={`mailto:${company.email}`} className="footer-link">{company.email}</a> from the address you signed in with and we
        will act on a verified request.
      </p>

      <H2>Security</H2>
      <p>
        Dwaar data is protected by sign-in and database rules so that people can read only their own records, resumes are stored in a
        private folder, and secret keys stay on our server. No system is perfectly safe, so please share only what is needed.
      </p>

      <H2>Children</H2>
      <p>Vyuhika Apps is for people aged 18 and over. We do not knowingly collect data from children.</p>

      <H2>Changes</H2>
      <p>We may update this policy. The date at the top shows the latest version, and we will point out big changes on the site.</p>
    </SitePageFrame>
  );
}
