import { A, H2, SitePageFrame, UL } from "@/components/SitePage";
import { company, sitePage } from "@/lib/legal";
import { sitePageMetadata } from "@/lib/metadata";
import { site } from "@/lib/site";

const page = sitePage("about");
export const metadata = sitePageMetadata(page);

export default function AboutPage() {
  return (
    <SitePageFrame page={page}>
      <p>
        Vyuhika Apps is a set of useful web tools, some free and some paid, built in public by {company.legalName}. It is made by{" "}
        {site.owner.name}, the founder, and the tools are meant for everyday people: job seekers, students, developers and small
        businesses. India comes first.
      </p>

      <H2>What you can use today</H2>
      <UL>
        <li>
          <A href="/apps/resume-matcher">Resume Matcher</A>: paste a resume and a job description and see a match score, the keywords you
          are missing and three changes to make. Free.
        </li>
        <li>
          <A href="/apps/cover-letter-writer">Cover Letter Writer</A>: a first draft of a cover letter that uses only facts from your
          resume. Free.
        </li>
        <li>
          <A href="/apps/dwaar">Dwaar</A>: ask employees at a company for a job referral, check your match first, and chat with the
          employee who accepts.
        </li>
        <li>Koshvia: a personal and business budget and investment tracker, on its own site (koshvia.vyuhika.com).</li>
      </UL>

      <H2>Built in public</H2>
      <p>
        We share how the tools are made, including what works and what does not. Our tagline is &ldquo;{site.tagline}&rdquo; You can
        follow the work through the links in the footer.
      </p>

      <H2>How we think about your data</H2>
      <p>
        We ask for as little as we can, we say plainly what we do with it, and we let you delete it. Read the{" "}
        <A href="/privacy">Privacy Policy</A> for the details. Our tools use AI, and AI can be wrong, so always check what it tells you.
      </p>

      <H2>Get in touch</H2>
      <p>
        Questions, ideas or problems? Use the Feedback button on any page, or see <A href="/contact">Contact</A>.
      </p>
    </SitePageFrame>
  );
}
