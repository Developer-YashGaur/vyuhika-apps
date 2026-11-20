import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import PlanButton from "@/components/dwaar/PlanButton";
import { planPaymentsEnabled } from "@/lib/dwaar/features";
import { dwaarMetadata } from "@/lib/dwaar/metadata";
import { getMyProfile } from "@/lib/dwaar/profile";
import { FREE_DAILY_CHECKS, PLAN_CREDITS, PLAN_DAILY_CHECKS, PLAN_DAYS, PLAN_PRICE_RUPEES, daysLeft, getMyPlan } from "@/lib/dwaar/plan";
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
      <h1 className="dw-title dw-display mt-8 mb-3">Plans</h1>
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

  const left = daysLeft(plan?.endsAt ?? null);

  const check = (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12l5 5 9-10" />
    </svg>
  );

  return (
    <>
      <div className="dw-plans">
        <section className="dw-plan" aria-labelledby="dw-free-title">
          <h2 id="dw-free-title" className="text-xl font-semibold">Free</h2>
          <p className="dw-muted mt-1">Everything you need to ask for a referral.</p>
          <p className="dw-plan-price">₹0</p>
          <ul className="dw-plan-list">
            <li>{check}{FREE_DAILY_CHECKS} resume checks a day</li>
            <li>{check}Referral requests and live chat</li>
            <li>{check}Boost a resume with credits</li>
          </ul>
        </section>

        <section className="dw-plan dw-plan-plus" aria-labelledby="dw-plus-title">
          <div className="dw-plan-glow" aria-hidden="true" />
          <div className="relative flex h-full flex-col">
            <h2 id="dw-plus-title" className="text-xl font-semibold">Dwaar Plus</h2>
            <p className="mt-1" style={{ color: "#c3cbe6" }}>More tools for your job search.</p>
            <p className="dw-plan-price">
              ₹{PLAN_PRICE_RUPEES}
              <span> for {PLAN_DAYS} days</span>
            </p>
            <ul className="dw-plan-list">
              <li>{check}{PLAN_DAILY_CHECKS} resume checks a day, instead of {FREE_DAILY_CHECKS}</li>
              <li>{check}{PLAN_CREDITS} credits when you buy it, for a Boost</li>
              <li>{check}Interview practice with AI feedback</li>
              <li>{check}Job alerts by email when new jobs match</li>
              <li>{check}One payment for {PLAN_DAYS} days, no automatic renewal</li>
            </ul>
            <div className="mt-auto pt-6">
              {!on ? (
                <p className="dw-alert dw-alert-info">Dwaar Plus is not open yet. Please check back soon.</p>
              ) : (
                <>
                  {plan?.active && endsOn && (
                    <p className="dw-alert dw-alert-info mb-3">
                      Your Plus pass is active until {endsOn}.
                      {left !== null && left <= 5 && ` It ends in ${left <= 1 ? "1 day" : `${left} days`}: add ${PLAN_DAYS} more days below to keep it going.`}
                    </p>
                  )}
                  <PlanButton label={plan?.active ? `Add ${PLAN_DAYS} more days · ₹${PLAN_PRICE_RUPEES}` : `Get Plus · ₹${PLAN_PRICE_RUPEES}`} />
                </>
              )}
            </div>
          </div>
        </section>
      </div>
      <p className="mt-6 max-w-2xl text-sm leading-relaxed dw-muted">
        If you buy again while your pass is active, the new days start when it ends. Plus is a fee for tools only. It does not
        promise a referral, an interview or a job, and it never changes who sees your request.
      </p>
    </>
  );
}
