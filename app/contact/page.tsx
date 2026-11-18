import { A, H2, SitePageFrame, UL } from "@/components/SitePage";
import { company, sitePage } from "@/lib/legal";
import { sitePageMetadata } from "@/lib/metadata";

const page = sitePage("contact");
export const metadata = sitePageMetadata(page);

export default function ContactPage() {
  return (
    <SitePageFrame page={page}>
      <p>
        You can reach us by email at <a href={`mailto:${company.email}`} className="footer-link">{company.email}</a>, or with the
        Feedback button that floats at the bottom of every page. Please do not send passwords, card numbers or your resume by email.
      </p>

      <H2>Who runs this site</H2>
      <UL>
        <li>{company.legalName}</li>
        <li>{company.cin}</li>
        <li>{company.address}</li>
      </UL>

      <H2>Grievance Officer</H2>
      <p>
        If you have a complaint about how we handle your data, about content on the site, or about how you were treated on Dwaar, write
        to our Grievance Officer.
      </p>
      <UL>
        <li>Name: {company.grievanceOfficer}</li>
        <li>
          Email: <a href={`mailto:${company.email}`} className="footer-link">{company.email}</a> (put &ldquo;Grievance&rdquo; in the
          subject)
        </li>
      </UL>
      <p>
        We confirm that we received your complaint within 24 hours and aim to resolve it within 15 days. Tell us your name, the email you
        use on the site, what happened and what you would like us to do.
      </p>

      <H2>Related pages</H2>
      <UL>
        <li><A href="/privacy">Privacy Policy</A>, including how to ask us to delete your data</li>
        <li><A href="/terms">Terms of Use</A></li>
        <li><A href="/refunds">Refund and Cancellation Policy</A></li>
      </UL>
    </SitePageFrame>
  );
}
