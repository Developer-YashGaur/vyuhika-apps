import { A, H2, SitePageFrame, UL } from "@/components/SitePage";
import { sitePage } from "@/lib/legal";
import { sitePageMetadata } from "@/lib/metadata";

const page = sitePage("cookies");
export const metadata = sitePageMetadata(page);

export default function CookiesPage() {
  return (
    <SitePageFrame page={page}>
      <p>
        A cookie is a small file that a website saves in your browser. This page lists what Vyuhika Apps uses to remember you or to
        measure how the site is used, and how you can control it. We do not sell your data and we do not show advertising.
      </p>

      <H2>Needed to sign in (Dwaar)</H2>
      <p>
        When you sign in to Dwaar with Google, our sign-in provider (Supabase) saves a session cookie so that you stay signed in. It is
        needed for the sign-in to work, and it is only set when you sign in. Resume Matcher and Cover Letter Writer need no sign-in and
        set no cookies of their own.
      </p>

      <H2>Measuring visits</H2>
      <UL>
        <li>
          <strong>Vercel Web Analytics and Speed Insights.</strong> They count visits (pages viewed, country, device, where the visitor
          came from) and how fast pages load. They do not use cookies and do not follow you across other sites.
        </li>
        <li>
          <strong>Google Tag Manager.</strong> It is loaded on our public pages only if you press Allow in the banner (you can say No thanks and the site works the same), and lets us add measurement tools, such as Google
          Analytics. Those tools may set cookies of their own to count visitors. Tag Manager is not loaded on Dwaar&apos;s pages that
          you see after you sign in (profile, requests, chat and inbox).
        </li>
      </UL>

      <H2>What we do not do</H2>
      <UL>
        <li>We do not use advertising or retargeting cookies.</li>
        <li>We do not put the text of your resume, job descriptions, letters or chats into any measurement tool.</li>
      </UL>

      <H2>Your choices</H2>
      <p>
        You can block or delete cookies in your browser settings, or use a browser extension that blocks trackers. Blocking the sign-in
        cookie means you cannot stay signed in to Dwaar. Everything else on the site works without cookies.
      </p>
      <p>
        More about what we collect is in the <A href="/privacy">Privacy Policy</A>. Questions? See <A href="/contact">Contact</A>.
      </p>
    </SitePageFrame>
  );
}
