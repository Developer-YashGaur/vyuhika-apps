import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { getCreditBalance } from "@/lib/dwaar/credit-boost";
import { creditWays, type CreditWay } from "@/lib/dwaar/credits-info";
import { boostPaymentsEnabled, inviteRewardsEnabled, planPaymentsEnabled } from "@/lib/dwaar/features";
import { dwaarMetadata } from "@/lib/dwaar/metadata";
import { supabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export const metadata = dwaarMetadata;

export default function CreditsPage() {
  return (
    <div className="dw-wrap dw-page">
      <p className="dw-eyebrow">Credits</p>
      <h1 className="dw-title dw-display mt-2 mb-3">Your credits</h1>
      <p className="mb-8 max-w-2xl text-lg leading-relaxed dw-muted">
        Credits are optional. They pay for extras like a Boost. Asking for a referral is always free, and credits never decide whether you get one.
      </p>
      <Suspense fallback={<p className="dw-muted">Loading…</p>}>
        <CreditsContent />
      </Suspense>
    </div>
  );
}

async function CreditsContent() {
  await connection();
  if (!supabaseConfigured()) redirect("/apps/dwaar?error=setup");
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/apps/dwaar");

  const credits = await getCreditBalance(supabase);
  const { earn, spend } = creditWays({ invites: inviteRewardsEnabled(), plan: planPaymentsEnabled(), boost: boostPaymentsEnabled() });

  return (
    <div className="grid gap-6">
      <section className="dw-card" aria-labelledby="dw-balance">
        <h2 id="dw-balance" className="text-sm font-semibold dw-muted">
          Your balance
        </h2>
        <p className="dw-display mt-1 text-5xl">{credits}</p>
        <p className="mt-1 dw-muted">{credits === 1 ? "credit" : "credits"}</p>
      </section>
      <WaySection title="Get credits" ways={earn} />
      <WaySection title="Use credits" ways={spend} />
    </div>
  );
}

function WaySection({ title, ways }: { title: string; ways: CreditWay[] }) {
  return (
    <section aria-label={title}>
      <h2 className="dw-display mb-3 text-xl font-medium">{title}</h2>
      <div className="grid gap-3">
        {ways.map((w) => (
          <div key={w.id} className={w.available ? "dw-way" : "dw-way dw-way-locked"} aria-disabled={!w.available}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-lg font-semibold">{w.title}</h3>
              {w.available ? <span className="dw-chip dw-chip-good">Available</span> : <span className="dw-chip">Not open yet</span>}
            </div>
            <p className="mt-1 leading-relaxed">{w.detail}</p>
            {w.available ? (
              <Link href={w.href} className="dw-btn dw-btn-quiet dw-btn-sm mt-3">
                {w.action}
              </Link>
            ) : (
              <p className="mt-2 text-sm">{w.reason}</p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
