"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { CONSENT_VERSION } from "@/lib/dwaar/consent";
import { deleteMyProfile, getMyProfile, saveMyProfile } from "@/lib/dwaar/profile";
import { parseProfileForm, type FieldErrors } from "@/lib/dwaar/profile-form";
import { supabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

// Server actions for Dwaar. They run only on the server. Each one checks who is signed in again,
// because a page check alone is never enough.

export type ProfileFormState = { errors: FieldErrors; message: string | null };

// Where this site is running (localhost while developing, apps.vyuhika.com when live).
// Supabase only accepts sign-in redirects to addresses on its own allow-list, so a faked Host header cannot hijack a sign-in.
async function siteOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export async function signInWithGoogle(): Promise<void> {
  if (!supabaseConfigured()) redirect("/apps/dwaar?error=setup");
  const supabase = await createClient();
  const origin = await siteOrigin();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${origin}/auth/callback?next=/apps/dwaar` },
  });
  if (error || !data.url) redirect("/apps/dwaar?error=signin");
  redirect(data.url);
}

export async function signOut(): Promise<void> {
  if (supabaseConfigured()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect("/apps/dwaar");
}

export async function saveProfileAction(_previous: ProfileFormState, formData: FormData): Promise<ProfileFormState> {
  if (!supabaseConfigured()) redirect("/apps/dwaar?error=setup");
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/apps/dwaar");

  const existing = await getMyProfile(supabase, data.user.id);
  const parsed = parseProfileForm(formData, { requireConsent: existing === null });
  if (!parsed.ok) return { errors: parsed.errors, message: "Please fix the highlighted fields." };

  const saved = await saveMyProfile(supabase, data.user.id, parsed.data, {
    isNew: existing === null,
    consentVersion: CONSENT_VERSION,
  });
  if (!saved.ok) return { errors: {}, message: saved.message };

  redirect("/apps/dwaar?saved=1");
}

export async function deleteProfileAction(): Promise<void> {
  if (!supabaseConfigured()) redirect("/apps/dwaar?error=setup");
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/apps/dwaar");
  const result = await deleteMyProfile(supabase, data.user.id);
  redirect(result.ok ? "/apps/dwaar?deleted=1" : "/apps/dwaar?error=delete");
}
