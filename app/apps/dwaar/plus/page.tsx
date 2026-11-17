import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import PlanButton from "@/components/dwaar/PlanButton";
import { planPaymentsEnabled } from "@/lib/dwaar/features";
import { dwaarMetadata } from "@/lib/dwaar/metadata";
import { getMyProfile } from "@/lib/dwaar/profile";
import { FREE_DAILY_CHECKS, PLAN_CREDITS, PLAN_DAILY_CHECKS, PLAN_DAYS, PLAN_PRICE_RUPEES, getMyPlan } from "@/lib/dwaar/plan";
import { supabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export const metadata = dwaarMetadata;

export default function PlusPage() {
  return (
    <div className="dw-wrap dw-page">
      <Link href="/apps/dwaar" className="dw-back">
        <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
          <path d="M10 3 5 8l5 5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Dwaar
      </Link>
      <h1 className="dw-title dw-display mt-8 mb-3">Dwaar Plus</h1>
      <p className="mb-10 max-w-2xl text-lg leading-relaxed dw-muted">
        More tools for your job search. Asking for referrals stays free, and Plus never decides whether you get one.
      </p>
      <Suspense fallback={<p className="dw-muted">Loading…</p>}>
        <PlusContent />
      </Suspense>
    </div>
  );
}

async function PlusContent() {
  await connection();
  if (!supabaseConfigured()) redirect("/apps/dwaar?error=setup");
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/apps/dwaar");
  const profile = await getMyProfile(supabase, data.user.id);
  if (!profile) redirect("/apps/dwaar/profile");

  const on = planPaymentsEnabled();
  const plan = on ? await getMyPlan(supabase) : null;
  const endsOn = plan?.endsAt ? new Date(plan.endsAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : null;

  return (
    <section className="dw-card dw-split" aria-labelledby="dw-plus-title">
      <div>
        <h2 id="dw-plus-title" className="dw-display text-2xl font-medium">
          ₹{PLAN_PRICE_RUPEES} for {PLAN_DAYS} days
        </h2>
        <ul className="mt-5 flex list-disc flex-col gap-2 pl-5 leading-relaxed">
          <li>{PLAN_DAILY_CHECKS} resume checks a day, instead of {FREE_DAILY_CHECKS}.</li>
          <li>{PLAN_CREDITS} credits when you buy it. Credits pay for a Boost: a better resume, profile and LinkedIn tips.</li>
        </ul>
        <p className="mt-5 text-sm leading-relaxed dw-muted">
          One payment, no automatic renewal. If you buy again while your pass is active, the new days start when it ends. Plus is a
          fee for tools only. It does not promise a referral, an interview or a job.
        </p>
      </div>
      <div className="dw-actions">
        {!on ? (
          <p className="dw-alert dw-alert-info">Dwaar Plus is not open yet. Please check back soon.</p>
        ) : (
          <>
            {plan?.active && endsOn && <p className="dw-alert dw-alert-info">Your Plus pass is active until {endsOn}.</p>}
            <PlanButton label={plan?.active ? `Add ${PLAN_DAYS} more days · ₹${PLAN_PRICE_RUPEES}` : `Get Plus · ₹${PLAN_PRICE_RUPEES}`} />
          </>
        )}
      </div>
    </section>
  );
}
