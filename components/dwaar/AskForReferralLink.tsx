"use client";

import Link from "next/link";
import { savePrefill } from "@/lib/dwaar/prefill";

// "Ask for a referral" for a job from the Latest jobs list. It carries the job title, link and (when the company is in Dwaar) the company,
// and hands the job description to the request form through this browser tab, so the person does not retype anything.
export default function AskForReferralLink({ href, url, description }: { href: string; url: string; description: string }) {
  return (
    <Link href={href} onClick={() => savePrefill(url, description)} className="dw-btn dw-btn-primary dw-btn-sm">
      Ask for a referral
    </Link>
  );
}
