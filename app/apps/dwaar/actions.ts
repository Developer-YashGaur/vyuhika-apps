"use server";

import { headers } from "next/headers";
import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { CONSENT_VERSION } from "@/lib/dwaar/consent";
import { deleteMyProfile, getMyProfile, listCompanyOptions, saveMyProfile } from "@/lib/dwaar/profile";
import { candidateDetailsComplete } from "@/lib/dwaar/profile-details";
import { parseProfileForm, type FieldErrors } from "@/lib/dwaar/profile-form";
import { parseRequestForm, type RequestFieldErrors } from "@/lib/dwaar/request-form";
import { getChat, sendMessage } from "@/lib/dwaar/chat";
import { monitorMessage } from "@/lib/dwaar/chat-monitor";
import { answerContact, askContact } from "@/lib/dwaar/contact";
import { redeemInvite } from "@/lib/dwaar/invites";
import { PLAN_DESCRIPTION, confirmPlanPayment, planMessage, startPlan } from "@/lib/dwaar/plan";
import { spendCreditsOnBoost, spendMessage } from "@/lib/dwaar/credit-boost";
import { respondToRequest } from "@/lib/dwaar/inbox";
import { notifyProviders } from "@/lib/dwaar/notify";
import { sendRequestSentEmail, sendStatusEmails } from "@/lib/dwaar/notify-status";
import { ROLE_MESSAGES, findRoles, type RoleSuggestion } from "@/lib/dwaar/role-finder";
import { removeMyResumes } from "@/lib/dwaar/resumes";
import { boostMessage, confirmBoostPayment, startBoost } from "@/lib/dwaar/boost";
import { deliverBoost, deliverMessage } from "@/lib/dwaar/deliver-boost";
import { boostPaymentsEnabled, inviteRewardsEnabled, planPaymentsEnabled } from "@/lib/dwaar/features";
import { razorpayKeys } from "@/lib/dwaar/razorpay";
import { cancelRequest, createRequest } from "@/lib/dwaar/requests";
import { UPLOAD_MESSAGES, checkResumeUpload } from "@/lib/dwaar/resume-safety";
import { CHECK_MESSAGES, runCheck, saveCheckedScore, toView, type CheckView } from "@/lib/dwaar/match-check";
import { createGeminiGenerate, createGeminiSearch, getGeminiModel } from "@/lib/ai/gemini";
import { createTavilySearch } from "@/lib/ai/tavily-search";
import { OPENINGS_MESSAGES, findOpenings, type Opening } from "@/lib/dwaar/openings";
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

  // Drop any remembered copy of the Dwaar pages, so the edit page and the home page show what was just saved.
  revalidatePath("/apps/dwaar", "layout");
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

export type RequestFormState = { errors: RequestFieldErrors; message: string | null; check?: CheckView | null };

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

  // Companies ask for LinkedIn, a phone number and skills. The page checks this too; this is the real gate.
  const me = await getMyProfile(supabase, data.user.id);
  if (me && me.is_candidate && !candidateDetailsComplete(me)) {
    return { errors: {}, message: "Please add your LinkedIn link, phone number and skills in your profile first." };
  }

  const parsed = parseRequestForm(formData);
  if (!parsed.ok) return { errors: parsed.errors, message: "Please fix the highlighted fields." };
  const input = parsed.data;

  // 1. Look at the file's real type (its first bytes), not its name. The server never opens or runs the file.
  const bytes = new Uint8Array(await input.resumeFile.arrayBuffer());
  const kind = checkResumeUpload(bytes);
  if (!kind.ok) return { errors: { resume: UPLOAD_MESSAGES[kind.code] }, message: "Please fix the highlighted fields." };

  // 2. Check the resume against the job FIRST. "Check my match" stops here and shows the score and tips.
  //    "Send request" needs a score of at least MIN_SCORE: a lower score is not sent, and nothing is stored.
  const secret = serverSecret();
  const outcome = await runCheck(
    { supabase, secret, generate: createGeminiGenerate(), model: getGeminiModel() },
    { resumeText: input.resumeText, jobDescription: input.jobDescription },
  );
  if (outcome.kind !== "done") return { errors: {}, message: CHECK_MESSAGES[outcome.kind] };
  const view = toView(outcome.result);
  if (formData.get("intent") === "check") return { errors: {}, message: null, check: view };
  if (!view.passed) return { errors: {}, message: CHECK_MESSAGES.below(view.score, view.minScore), check: view };

  // 3. Store the resume in the person's own private folder (the database rules allow nothing else).
  const path = `${data.user.id}/${crypto.randomUUID()}.${kind.kind}`;
  const upload = await supabase.storage.from(RESUME_BUCKET).upload(path, bytes, { contentType: RESUME_TYPES[kind.kind], upsert: false });
  if (upload.error) {
    console.error("[dwaar] resume upload failed");
    return { errors: {}, message: "We could not save your resume. Please try again.", check: view };
  }

  // 4. Create the request. If that fails, remove the file again so nothing is left behind.
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
    return { errors: {}, message: created.message, check: view };
  }

  // 5. Keep the score with the request, and tell the first wave of employees. Neither blocks or fails the request.
  if (secret) await saveCheckedScore(supabase, secret, created.data, outcome.result);
  const settings = getEmailSettings();
  const send = createResendSender();
  if (secret && settings && send) await notifyProviders(supabase, { secret, send, settings }, created.data);
  if (settings && send) {
    const company = (await listCompanyOptions(supabase)).find((c) => c.id === input.companyId)?.name ?? "the company";
    await sendRequestSentEmail({ send, settings }, { to: data.user.email, name: me?.display_name ?? "", company, jobTitle: input.jobTitle, requestId: created.data });
  }

  redirect("/apps/dwaar/requests?sent=1&check=done");
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
  if (result.ok && decision === "accept") emailStatusChanges(supabase);
  redirect(result.ok ? `/apps/dwaar/inbox?answer=${result.answer}` : "/apps/dwaar/inbox?answer=error");
}

// After the response is sent, email whoever should hear about what just happened (accepted, new message, reply).
// If email is not set up, nothing is sent and nothing breaks.
function emailStatusChanges(supabase: Awaited<ReturnType<typeof createClient>>): void {
  const secret = serverSecret();
  const settings = getEmailSettings();
  const send = createResendSender();
  if (!secret || !settings || !send) return;
  after(async () => {
    await sendStatusEmails(supabase, { secret, send, settings });
  });
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
  if (outcome.kind === "delivered") redirect(`/apps/dwaar/requests/${outcome.requestId}/boost#resume-preview`);
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

  const body = formData.get("body");
  const result = await sendMessage(supabase, requestId, body);
  if (!result.ok) return { message: result.message, sent: false };
  emailStatusChanges(supabase);
  // After the reply is sent, an AI checks that the message is about the referral. It never delays or blocks anyone.
  const secret = serverSecret();
  const generate = createGeminiGenerate();
  if (typeof body === "string") after(async () => { await monitorMessage({ supabase, secret, generate }, requestId, body); });
  revalidatePath(`/apps/dwaar/requests/${requestId}/chat`);
  return { message: null, sent: true };
}

// ---- Plus pass ----
// Step 1: create the order. Returns what the browser needs to open Razorpay checkout (public values only).
export type PlanActionState =
  | { ok: true; passId: string; gatewayOrderId: string; amountPaise: number; keyId: string; description: string }
  | { ok: false; message: string };

export async function startPlanAction(): Promise<PlanActionState> {
  if (!supabaseConfigured()) return { ok: false, message: planMessage("unavailable") };
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/apps/dwaar");
  if (!planPaymentsEnabled()) return { ok: false, message: planMessage("unavailable") }; // the Plus pass is switched off for now

  const keys = razorpayKeys();
  const result = await startPlan({ supabase, secret: serverSecret(), keys });
  if (result.kind !== "ready" || !keys) return { ok: false, message: planMessage(result.kind === "ready" ? "failed" : result.kind) };
  return { ok: true, passId: result.passId, gatewayOrderId: result.gatewayOrderId, amountPaise: result.amountPaise, keyId: keys.keyId, description: PLAN_DESCRIPTION };
}

// Step 2: the browser reports a finished checkout. We trust only the signed receipt, never the browser's word.
export async function confirmPlanPaymentAction(receipt: { orderId: string; paymentId: string; signature: string }): Promise<BoostPaidState> {
  if (!supabaseConfigured()) return { ok: false, message: planMessage("unavailable") };
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/apps/dwaar");

  const result = await confirmPlanPayment(
    { supabase, secret: serverSecret(), keys: razorpayKeys() },
    { orderId: String(receipt?.orderId ?? ""), paymentId: String(receipt?.paymentId ?? ""), signature: String(receipt?.signature ?? "") },
  );
  if (result.kind === "paid") {
    revalidatePath("/apps/dwaar/plus");
    return { ok: true };
  }
  return {
    ok: false,
    message:
      result.kind === "invalid"
        ? "We could not verify this payment. If money was taken, write to support@vyuhika.com."
        : "We could not confirm your payment yet. If money was taken, it is safe: write to support@vyuhika.com and we will fix it.",
  };
}

// ---- Boost paid with credits ----

export type SpendActionState = { ok: true } | { ok: false; message: string };

export async function spendCreditsAction(requestId: string): Promise<SpendActionState> {
  if (!supabaseConfigured()) return { ok: false, message: spendMessage("failed") };
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/apps/dwaar");
  if (!inviteRewardsEnabled()) return { ok: false, message: spendMessage("failed") };
  if (typeof requestId !== "string" || !/^[0-9a-f-]{36}$/i.test(requestId)) return { ok: false, message: spendMessage("failed") };

  const result = await spendCreditsOnBoost(supabase, requestId);
  if (result.kind !== "paid") return { ok: false, message: spendMessage(result.kind) };
  revalidatePath("/apps/dwaar/requests");
  return { ok: true };
}

// ---- Invite codes ----

export type InviteFormState = { message: string | null; ok: boolean };

export async function redeemInviteAction(_previous: InviteFormState, formData: FormData): Promise<InviteFormState> {
  if (!supabaseConfigured()) redirect("/apps/dwaar?error=setup");
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/apps/dwaar");
  if (!inviteRewardsEnabled()) return { message: "Invite codes are not open yet.", ok: false };

  const result = await redeemInvite(supabase, formData.get("code"));
  if (result.ok) revalidatePath("/apps/dwaar");
  return { message: result.message, ok: result.ok };
}

// ---- Find jobs for my resume ----

export type FindRolesState = { message: string | null; roles: RoleSuggestion[] };

export async function findRolesAction(_previous: FindRolesState, formData: FormData): Promise<FindRolesState> {
  if (!supabaseConfigured()) redirect("/apps/dwaar?error=setup");
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/apps/dwaar");

  if (formData.get("consent") !== "on") return { message: "Please agree to the resume check first.", roles: [] };
  const text = formData.get("resumeText");
  const resumeText = typeof text === "string" ? text.trim() : "";
  if (resumeText.length < 200 || resumeText.length > 15000) {
    return { message: "We could not read enough text in that file. Please choose a text-based PDF or Word (.docx) resume.", roles: [] };
  }

  const outcome = await findRoles({ supabase, secret: serverSecret(), generate: createGeminiGenerate() }, resumeText);
  if (outcome.kind !== "done") return { message: ROLE_MESSAGES[outcome.kind], roles: [] };
  return { message: null, roles: outcome.roles };
}


// ---- Find openings: real job postings found online for one company ----

export type FindOpeningsState = { message: string | null; openings: Opening[] };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function findOpeningsAction(companyId: string, roleTitles: string[]): Promise<FindOpeningsState> {
  if (!supabaseConfigured()) redirect("/apps/dwaar?error=setup");
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/apps/dwaar");

  const profile = await getMyProfile(supabase, data.user.id);
  if (!profile || !profile.is_candidate) return { message: OPENINGS_MESSAGES.failed, openings: [] };
  if (typeof companyId !== "string" || !UUID.test(companyId)) return { message: OPENINGS_MESSAGES.failed, openings: [] };

  // The company name comes from our own list, never from the browser. A person cannot ask at their own company.
  const company = (await listCompanyOptions(supabase)).find((c) => c.id === companyId);
  const own = profile.is_provider ? profile.provider_company_id : null;
  if (!company || company.id === own) return { message: OPENINGS_MESSAGES.failed, openings: [] };

  const outcome = await findOpenings({ supabase, secret: serverSecret(), search: createTavilySearch() ?? createGeminiSearch(), generate: createGeminiGenerate() }, company.name, roleTitles);
  if (outcome.kind !== "done") return { message: OPENINGS_MESSAGES[outcome.kind === "none" ? "none" : outcome.kind], openings: [] };
  return { message: null, openings: outcome.openings };
}

// ---- Contact requests in the chat ----

export type ContactActionState = { ok: boolean; message: string };

const REQUEST_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CONTACT_FAILED: ContactActionState = { ok: false, message: "Something went wrong. Please try again in a moment." };

// The employee asks for the candidate's phone number or email.
export async function askContactAction(requestId: string, kind: string): Promise<ContactActionState> {
  if (!supabaseConfigured()) redirect("/apps/dwaar?error=setup");
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/apps/dwaar");
  if (typeof requestId !== "string" || !REQUEST_ID.test(requestId)) return CONTACT_FAILED;

  // The other person's name comes from the database, never from the browser.
  const chat = await getChat(supabase, requestId);
  if (!chat || chat.info.out_is_candidate) return CONTACT_FAILED;
  const result = await askContact(supabase, requestId, kind, chat.info.out_other_name);
  if (result.ok) emailStatusChanges(supabase);
  revalidatePath(`/apps/dwaar/requests/${requestId}/chat`);
  return result;
}

// The candidate shares or declines.
export async function answerContactAction(requestId: string, kind: string, share: boolean): Promise<ContactActionState> {
  if (!supabaseConfigured()) redirect("/apps/dwaar?error=setup");
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/apps/dwaar");
  if (typeof requestId !== "string" || !REQUEST_ID.test(requestId) || typeof share !== "boolean") return CONTACT_FAILED;

  const result = await answerContact(supabase, requestId, kind, share);
  if (result.ok) emailStatusChanges(supabase);
  revalidatePath(`/apps/dwaar/requests/${requestId}/chat`);
  return result;
}
