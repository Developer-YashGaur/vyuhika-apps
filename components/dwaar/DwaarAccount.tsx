import Link from "next/link";
import { connection } from "next/server";
import { getCreditBalance } from "@/lib/dwaar/credit-boost";
import { supabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

// The top-bar account area: "Sign in" when signed out, or the credit balance when signed in.
// It reads cookies, so the header wraps it in <Suspense>.
export default async function DwaarAccount() {
  await connection();
  if (!supabaseConfigured()) return null;
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    return (
      <Link href="/apps/dwaar" className="dw-account">
        Sign in
      </Link>
    );
  }
  const credits = await getCreditBalance(supabase);
  return (
    <Link href="/apps/dwaar/credits" className="dw-account" aria-label={`Your credits: ${credits}. Open the credits page`}>
      <span aria-hidden="true">●</span> Credits: {credits}
    </Link>
  );
}
