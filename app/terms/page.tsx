import { A, H2, SitePageFrame, UL } from "@/components/SitePage";
import { company, sitePage } from "@/lib/legal";
import { sitePageMetadata } from "@/lib/metadata";

const page = sitePage("terms");
export const metadata = sitePageMetadata(page);

export default function TermsPage() {
  return (
    <SitePageFrame page={page}>
      <p>
        These terms are the agreement between you and {company.legalName} (&ldquo;we&rdquo;) for using Vyuhika Apps at
        apps.vyuhika.com, including Resume Matcher, Cover Letter Writer and Dwaar. By using the site you accept them. If you do not
        agree, please do not use it. Koshvia has its own terms on its own site.
      </p>

      <H2>Who can use it</H2>
      <p>You must be at least 18 years old and able to make a binding agreement. Give true information, and use only your own account.</p>

      <H2>What you may and may not do</H2>
      <UL>
        <li>Use the tools for lawful purposes and for yourself.</li>
        <li>Do not upload someone else&apos;s resume, or anything you have no right to share.</li>
        <li>Do not put instructions meant for an AI into a resume, job description or message, and do not try to break or misuse the site.</li>
        <li>Do not use bots or scripts to flood the tools. Limits on use exist to keep them free for everyone.</li>
        <li>Do not harass or deceive anyone, and do not offer or ask for money or gifts in exchange for a referral.</li>
      </UL>

      <H2>AI results can be wrong</H2>
      <p>
        Resume Matcher, Cover Letter Writer and Dwaar use AI. Scores, keywords, tips and drafts are estimates, not facts, and they are
        not how any employer actually judges you. Check everything before you rely on it or send it. You are responsible for what you
        submit and for how you use the results.
      </p>

      <H2>Dwaar</H2>
      <UL>
        <li>
          Dwaar helps you ask employees for a referral. We do not promise a referral, an interview or a job. An employee decides for
          themselves, and a request can go unanswered or expire after 30 days.
        </li>
        <li>Employees confirm their work email. We do not check what they say or do outside Dwaar, and employees are not our staff.</li>
        <li>
          The Dwaar chat is checked by an AI, and messages that are not about the referral can be flagged for review. We may remove
          content or close an account that breaks these terms.
        </li>
        <li>Your phone number and email are shared with an employee only if you choose to share them in the chat.</li>
        <li>
          Details of what Dwaar collects are in the <A href="/privacy">Privacy Policy</A> and the{" "}
          <A href="/apps/dwaar/privacy">Dwaar privacy notice</A>.
        </li>
      </UL>

      <H2>Paid features</H2>
      <p>
        Prices are shown before you pay. Payments are handled by Razorpay. Refunds are explained in the{" "}
        <A href="/refunds">Refund and Cancellation Policy</A>. We may change prices for future purchases.
      </p>

      <H2>Your content and ours</H2>
      <p>
        What you upload stays yours. You allow us to process it only to give you the service you asked for, as described in the{" "}
        <A href="/privacy">Privacy Policy</A>. The site, its design, name, logo and code belong to {company.legalName}. You may not copy
        them or pretend to be us.
      </p>

      <H2>The service as it is</H2>
      <p>
        Vyuhika Apps is built in public and changes often. We try to keep it running but we provide it &ldquo;as is&rdquo;, and tools can
        be slow, change or stop. We may limit or end access to anyone who misuses the site.
      </p>

      <H2>Our responsibility</H2>
      <p>
        To the extent the law allows, we are not responsible for lost job chances, decisions made by employers or employees, mistakes in
        AI results, or indirect losses. For a paid feature, our total responsibility is limited to the amount you paid for it. Nothing
        here removes rights that the law gives you and that cannot be removed.
      </p>

      <H2>Law and disputes</H2>
      <p>
        These terms follow the laws of India. Courts in {company.courts} can hear disputes, after you have first written to us at{" "}
        <a href={`mailto:${company.email}`} className="footer-link">{company.email}</a> so that we can try to sort it out.
      </p>

      <H2>Changes</H2>
      <p>We may update these terms. The date at the top shows the latest version. If you keep using the site after a change, you accept it.</p>
      <p>
        Questions? See <A href="/contact">Contact</A>.
      </p>
    </SitePageFrame>
  );
}
