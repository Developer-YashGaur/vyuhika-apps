"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { CONSENT_VERSION } from "@/lib/dwaar/consent";
import { deleteMyProfile, getMyProfile, saveMyProfile } from "@/lib/dwaar/profile";
import { parseProfileForm, type FieldErrors } from "@/lib/dwaar/profile-form";
import { parseRequestForm, type RequestFieldErrors } from "@/lib/dwaar/request-form";
import { sendMessage } from "@/lib/dwaar/chat";
import { respondToRequest } from "@/lib/dwaar/inbox";
import { notifyProviders } from "@/lib/dwaar/notify";
import { removeMyResumes } from "@/lib/dwaar/resumes";
import { boostMessage, confirmBoostPayment, startBoost } from "@/lib/dwaar/boost";
import { deliverBoost, deliverMessage } from "@/lib/dwaar/deliver-boost";
import { boostPaymentsEnabled } from "@/lib/dwaar/features";
import { razorpayKeys } from "@/lib/dwaar/razorpay";
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
  // First remove the resume files and cancel open requests. If that fails, stop: nothing is half-deleted.
  const forgotten = await removeMyResumes(supabase);
  if (!forgotten.ok) redirect("/apps/dwaar?error=delete");
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

  // 4. Tell the employees at that company. Never blocks or fails the request.
  const secret = serverSecret();
  const settings = getEmailSettings();
  const send = createResendSender();
  if (secret && settings && send) await notifyProviders(supabase, { secret, send, settings }, created.data);

  // 5. The free match score. It never blocks the request: if it fails, the request is already sent.
  const outcome = await scoreRequest(
    { supabase, secret, generate: createGeminiGenerate(), model: getGeminiModel() },
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
  const cancelled = await cancelRequest(supabase, id);
  // A cancelled request does not keep a resume: delete its file and clear its details.
  if (cancelled.ok && cancelled.data) await removeMyResumes(supabase, id);
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

// Boost, step 1: create the order. Returns what the browser needs to open Razorpay checkout.
// keyId is the PUBLIC key id (checkout needs it); the key secret never leaves the server.
export type BoostActionState =
  | { ok: true; orderId: string; gatewayOrderId: string; amountPaise: number; keyId: string }
  | { ok: false; message: string };

export async function startBoostAction(requestId: string): Promise<BoostActionState> {
  if (!supabaseConfigured()) return { ok: false, message: boostMessage("unavailable") };
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/apps/dwaar");
  if (!boostPaymentsEnabled()) return { ok: false, message: boostMessage("unavailable") }; // paid Boost is switched off for now
  if (typeof requestId !== "string" || !/^[0-9a-f-]{36}$/i.test(requestId)) return { ok: false, message: boostMessage("failed") };

  const keys = razorpayKeys();
  const result = await startBoost({ supabase, secret: serverSecret(), keys }, requestId);
  if (result.kind !== "ready" || !keys) return { ok: false, message: boostMessage(result.kind === "ready" ? "failed" : result.kind) };
  return { ok: true, orderId: result.orderId, gatewayOrderId: result.gatewayOrderId, amountPaise: result.amountPaise, keyId: keys.keyId };
}

// Boost, step 2: the browser reports a finished checkout. We trust only the signed receipt, never the browser's word.
export type BoostPaidState = { ok: true } | { ok: false; message: string };

export async function confirmBoostPaymentAction(receipt: { orderId: string; paymentId: string; signature: string }): Promise<BoostPaidState> {
  if (!supabaseConfigured()) return { ok: false, message: boostMessage("unavailable") };
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/apps/dwaar");

  const result = await confirmBoostPayment(
    { supabase, secret: serverSecret(), keys: razorpayKeys() },
    { orderId: String(receipt?.orderId ?? ""), paymentId: String(receipt?.paymentId ?? ""), signature: String(receipt?.signature ?? "") },
  );
  if (result.kind === "paid") return { ok: true };
  return {
    ok: false,
    message:
      result.kind === "invalid"
        ? "We could not verify this payment. If money was taken, write to support@vyuhika.com with your request details."
        : "We could not confirm your payment yet. If money was taken, it is safe: write to support@vyuhika.com and we will fix it.",
  };
}

// Boost, step 3: the person chooses their resume again (the browser reads it) and we write their Boost.
export type BoostDeliverState = { message: string | null };

export async function deliverBoostAction(_previous: BoostDeliverState, formData: FormData): Promise<BoostDeliverState> {
  if (!supabaseConfigured()) redirect("/apps/dwaar?error=setup");
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/apps/dwaar");

  const orderId = formData.get("orderId");
  const resumeText = formData.get("resumeText");
  if (typeof orderId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId) || typeof resumeText !== "string") {
    return { message: deliverMessage("failed") };
  }

  const outcome = await deliverBoost(
    { supabase, secret: serverSecret(), generate: createGeminiGenerate(), model: getGeminiModel() },
    { orderId, resumeText },
  );
  if (outcome.kind === "delivered") redirect(`/apps/dwaar/requests/${outcome.requestId}/boost`);
  return { message: deliverMessage(outcome.kind) };
}

// ---- The chat after a request is accepted ----

export type ChatFormState = { message: string | null; sent: boolean };

export async function sendMessageAction(requestId: string, _previous: ChatFormState, formData: FormData): Promise<ChatFormState> {
  if (!supabaseConfigured()) redirect("/apps/dwaar?error=setup");
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/apps/dwaar");
  if (typeof requestId !== "string" || !/^[0-9a-f-]{36}$/i.test(requestId)) return { message: "Something went wrong. Please try again in a moment.", sent: false };

  const result = await sendMessage(supabase, requestId, formData.get("body"));
  if (!result.ok) return { message: result.message, sent: false };
  revalidatePath(`/apps/dwaar/requests/${requestId}/chat`);
  return { message: null, sent: true };
}
