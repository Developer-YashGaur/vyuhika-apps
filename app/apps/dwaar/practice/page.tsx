import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import PracticeForm from "@/components/dwaar/PracticeForm";
import { planPaymentsEnabled } from "@/lib/dwaar/features";
import { dwaarMetadata } from "@/lib/dwaar/metadata";
import { getMyPlan } from "@/lib/dwaar/plan";
import { supabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export const metadata = dwaarMetadata;
// The AI can take close to a minute.
export const maxDuration = 60;

export default function PracticePage() {
  return (
    <div className="dw-wrap dw-page">
      <p className="dw-eyebrow">Dwaar Plus</p>
      <h1 className="dw-title dw-display mt-2 mb-3">Interview practice</h1>
      <p className="mb-8 max-w-2xl text-lg leading-relaxed dw-muted">
        Get five questions for the role you want, write an answer, and get honest feedback. Nothing you type is saved.
      </p>
      <Suspense fallback={<p className="dw-muted">Loading…</p>}>
        <PracticeContent />
      </Suspense>
    </div>
  );
}

async function PracticeContent() {
  await connection();
  if (!supabaseConfigured()) redirect("/apps/dwaar?error=setup");
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/apps/dwaar");

  const plan = planPaymentsEnabled() ? await getMyPlan(supabase) : null;
  if (!plan?.active) {
    return (
      <section className="dw-card max-w-2xl">
        <h2 className="dw-display text-xl">This is part of Dwaar Plus</h2>
        <p className="dw-muted mt-3">Plus also gives you more daily resume checks and job alerts. It never changes who sees your request.</p>
        <div className="mt-6">
          <Link href="/apps/dwaar/plus" className="dw-btn dw-btn-primary">
            See Plus
          </Link>
        </div>
      </section>
    );
  }
  return <PracticeForm />;
}
