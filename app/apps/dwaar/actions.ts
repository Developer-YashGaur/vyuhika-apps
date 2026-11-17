"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { CONSENT_VERSION } from "@/lib/dwaar/consent";
import { deleteMyProfile, getMyProfile, saveMyProfile } from "@/lib/dwaar/profile";
import { parseProfileForm, type FieldErrors } from "@/lib/dwaar/profile-form";
import { parseRequestForm, type RequestFieldErrors } from "@/lib/dwaar/request-form";
import { respondToRequest } from "@/lib/dwaar/inbox";
import { cancelRequest, createRequest } from "@/lib/dwaar/requests";
import { UPLOAD_MESSAGES, checkResumeUpload } from "@/lib/dwaar/resume-safety";
import { scoreRequest } from "@/lib/dwaar/score-request";
import { createGeminiGenerate, getGeminiModel } from "@/lib/ai/gemini";
import { confirmWorkEmailCode, requestWorkEmailCode, serverSecret } from "@/lib/dwaar/work-email";
import { getEmailSettings } from "@/lib/email/settings";
import { createResendSender } from "@/lib/feedback/deliver";
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

// ---- Confirming a work email with a code ----

export type WorkEmailState = { sent: boolean; message: string | null; error: string | null };

// "Email me a code". The address is NOT taken from the form: the database knows the saved work email.
export async function sendWorkEmailCodeAction(previous: WorkEmailState): Promise<WorkEmailState> {
  if (!supabaseConfigured()) redirect("/apps/dwaar?error=setup");
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/apps/dwaar");

  const secret = serverSecret();
  const settings = getEmailSettings();
  const send = createResendSender();
  if (!secret || !settings || !send) {
    return { ...previous, error: "Confirming work emails is not switched on yet." };
  }

  const result = await requestWorkEmailCode(supabase, { secret, send, settings });
  if (!result.ok) return { ...previous, error: result.message };
  return { sent: true, message: "We sent a code to your work email. It can take a minute to arrive.", error: null };
}

export async function confirmWorkEmailAction(previous: WorkEmailState, formData: FormData): Promise<WorkEmailState> {
  if (!supabaseConfigured()) redirect("/apps/dwaar?error=setup");
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/apps/dwaar");

  const typed = formData.get("code");
  const result = await confirmWorkEmailCode(supabase, typeof typed === "string" ? typed : "");
  if (!result.ok) return { ...previous, error: result.message };
  redirect("/apps/dwaar?confirmed=1");
}

// ---- Referral requests (candidate side) ----

export type RequestFormState = { errors: RequestFieldErrors; message: string | null };

const RESUME_BUCKET = "dwaar-resumes";
const RESUME_TYPES = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
} as const;

export async function createRequestAction(_previous: RequestFormState, formData: FormData): Promise<RequestFormState> {
  if (!supabaseConfigured()) redirect("/apps/dwaar?error=setup");
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/apps/dwaar");

  const parsed = parseRequestForm(formData);
  if (!parsed.ok) return { errors: parsed.errors, message: "Please fix the highlighted fields." };
  const input = parsed.data;

  // 1. Look at the file's real type (its first bytes), not its name. The server never opens or runs the file.
  const bytes = new Uint8Array(await input.resumeFile.arrayBuffer());
  const kind = checkResumeUpload(bytes);
  if (!kind.ok) return { errors: { resume: UPLOAD_MESSAGES[kind.code] }, message: "Please fix the highlighted fields." };

  // 2. Store it in the person's own private folder (the database rules allow nothing else).
  const path = `${data.user.id}/${crypto.randomUUID()}.${kind.kind}`;
  const upload = await supabase.storage.from(RESUME_BUCKET).upload(path, bytes, { contentType: RESUME_TYPES[kind.kind], upsert: false });
  if (upload.error) {
    console.error("[dwaar] resume upload failed");
    return { errors: {}, message: "We could not save your resume. Please try again." };
  }

  // 3. Create the request. If that fails, remove the file again so nothing is left behind.
  const created = await createRequest(supabase, {
    companyId: input.companyId,
    jobTitle: input.jobTitle,
    jobUrl: input.jobUrl,
    note: input.note,
    jobId: input.jobId,
    jobDescription: input.jobDescription,
    resumePath: path,
    consent: true,
  });
  if (!created.ok) {
    await supabase.storage.from(RESUME_BUCKET).remove([path]);
    return { errors: {}, message: created.message };
  }

  // 4. The free match score. It never blocks the request: if it fails, the request is already sent.
  const outcome = await scoreRequest(
    { supabase, secret: serverSecret(), generate: createGeminiGenerate(), model: getGeminiModel() },
    { requestId: created.data, resumeText: input.resumeText, jobDescription: input.jobDescription },
  );

  redirect(`/apps/dwaar/requests?sent=1&check=${outcome.kind}`);
}

export async function cancelRequestAction(formData: FormData): Promise<void> {
  if (!supabaseConfigured()) redirect("/apps/dwaar?error=setup");
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/apps/dwaar");

  const id = formData.get("requestId");
  if (typeof id !== "string" || id.length === 0) redirect("/apps/dwaar/requests");
  await cancelRequest(supabase, id);
  redirect("/apps/dwaar/requests?cancelled=1");
}

// ---- Referral requests (employee side) ----

export async function respondToRequestAction(formData: FormData): Promise<void> {
  if (!supabaseConfigured()) redirect("/apps/dwaar?error=setup");
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/apps/dwaar");

  const id = formData.get("requestId");
  const decision = formData.get("decision");
  if (typeof id !== "string" || id.length === 0 || (decision !== "accept" && decision !== "dismiss")) redirect("/apps/dwaar/inbox");

  const result = await respondToRequest(supabase, id, decision === "accept");
  redirect(result.ok ? `/apps/dwaar/inbox?answer=${result.answer}` : "/apps/dwaar/inbox?answer=error");
}
