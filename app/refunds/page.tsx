import { A, H2, SitePageFrame, UL } from "@/components/SitePage";
import { company, sitePage } from "@/lib/legal";
import { sitePageMetadata } from "@/lib/metadata";

const page = sitePage("refunds");
export const metadata = sitePageMetadata(page);

export default function RefundsPage() {
  return (
    <SitePageFrame page={page}>
      <p>
        Most of Vyuhika Apps is free, and there is nothing to refund for a free feature. This page explains what happens when you pay for
        something. Paid features are switched on over time. Their price is always shown before you pay, and payments are handled by
        Razorpay, so we never see your card details.
      </p>

      <H2>What can be paid</H2>
      <UL>
        <li>
          <strong>Dwaar Boost</strong>: a one-time payment that rewrites your resume for one request and gives tips. You can also pay for
          a Boost with Dwaar credits.
        </li>
        <li>
          <strong>Dwaar Plus pass</strong>: a one-time payment for 30 days of extra daily resume checks and some credits. It does not
          renew by itself, so there is nothing to cancel and you are never charged again without asking.
        </li>
      </UL>

      <H2>When we refund</H2>
      <UL>
        <li>You were charged but the paid feature was not delivered, for example the Boost result was not created. We either deliver it or refund you.</li>
        <li>You were charged twice for the same thing. We refund the extra payment.</li>
        <li>You ask within 7 days of buying a Plus pass and you have not used its extra checks or credits. We refund it in full.</li>
      </UL>

      <H2>When we do not refund</H2>
      <UL>
        <li>A Boost that was delivered. It is a digital service that is made for you straight away.</li>
        <li>
          The outcome of a referral request. Dwaar does not promise a referral, an interview or a job, and a request that nobody accepts
          is not a reason for a refund.
        </li>
        <li>Credits you earned by inviting friends. They have no cash value and cannot be paid out.</li>
      </UL>

      <H2>Cancelling</H2>
      <p>
        Free things can be cancelled at any time: you can cancel an open referral request and delete your Dwaar profile yourself. There
        is no subscription to cancel.
      </p>

      <H2>How to ask for a refund</H2>
      <p>
        Email <a href={`mailto:${company.email}`} className="footer-link">{company.email}</a> from the address you signed in with, and
        include the payment ID from your Razorpay receipt and what went wrong. We reply within 5 working days. An approved refund goes
        back to the way you paid and usually shows up in 5 to 7 working days, depending on your bank.
      </p>
      <p>
        See also the <A href="/terms">Terms of Use</A> and <A href="/contact">Contact</A> page.
      </p>
    </SitePageFrame>
  );
}
