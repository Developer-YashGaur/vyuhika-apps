import Link from "next/link";
import { connection } from "next/server";
import { deleteProfileAction, signInWithGoogle, signOut } from "@/app/apps/dwaar/actions";
import WorkEmailConfirm from "@/components/dwaar/WorkEmailConfirm";
import { getMyProfile, listCompanyOptions } from "@/lib/dwaar/profile";
import { workEmailConfirmationConfigured } from "@/lib/dwaar/work-email";
import { supabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

// What the Dwaar front page shows: sign in, finish your profile, or your profile.
// It reads the signed-in person from cookies, so the page wraps it in <Suspense>.

type Params = { error?: string; saved?: string; deleted?: string; confirmed?: string };

const ERRORS: Record<string, string> = {
  signin: "Sign-in did not finish. Please try again.",
  setup: "Sign-in is not set up on this server yet.",
  delete: "We could not delete your profile. Please try again.",
};

export default async function DwaarHome({ searchParams }: { searchParams: Promise<Params> }) {
  // Sign-in checks read the clock (token expiry). Next.js only allows that at request time, not while pre-building the page.
  await connection();
  const params = await searchParams;
  const notice = <Notice params={params} />;

  if (!supabaseConfigured()) {
    return <>{notice}<SignedOut disabled /></>;
  }

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return <>{notice}<SignedOut /></>;

  const profile = await getMyProfile(supabase, data.user.id);
  if (!profile) {
    return (
      <>
        {notice}
        <section className="dw-card">
          <h2 className="dw-display text-2xl font-medium ">Welcome. Let&apos;s set up your profile.</h2>
          <p className="mt-3 leading-relaxed dw-muted">
            It takes about a minute. You are signed in as <span >{data.user.email}</span>.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link href="/apps/dwaar/profile" className="dw-btn dw-btn-primary dw-btn-lg text-center">Create my profile</Link>
            <SignOutButton />
          </div>
        </section>
      </>
    );
  }

  // Company name for the summary (only needed for referral providers).
  let companyName: string | null = null;
  if (profile.is_provider && profile.provider_company_id) {
    const options = await listCompanyOptions(supabase);
    companyName = options.find((c) => c.id === profile.provider_company_id)?.name ?? null;
  }

  return (
    <>
      {notice}
      <section className="dw-card dw-split">
        <div>
        <h2 className="dw-display text-2xl font-medium ">{profile.display_name}</h2>
        {profile.headline && <p className="mt-1 dw-muted">{profile.headline}</p>}

        <div className="mt-5 flex flex-wrap gap-2">
          {profile.is_candidate && <span className="dw-chip dw-chip-good">Looking for referrals</span>}
          {profile.is_provider && <span className="dw-chip dw-chip-info">Can refer people</span>}
        </div>

        {profile.is_provider && (
          <dl className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="dw-muted">Company</dt>
              <dd>{companyName ?? "Not available"}</dd>
            </div>
            <div>
              <dt className="dw-muted">Work email</dt>
              <dd className="break-all">
                {profile.provider_work_email}{" "}
                <span className="dw-muted">({profile.work_email_verified_at ? "confirmed" : "not yet confirmed"})</span>
              </dd>
            </div>
          </dl>
        )}

        </div>

        <div className="dw-actions">
        {profile.is_provider && profile.work_email_verified_at && (
          <Link href="/apps/dwaar/inbox" className="dw-btn dw-btn-primary dw-btn-lg">Open employee desk</Link>
        )}

        {profile.is_candidate && (
          <>
            <Link href="/apps/dwaar/requests/new" className="dw-btn dw-btn-primary dw-btn-lg text-center">Ask for a referral</Link>
            <Link href="/apps/dwaar/find" className="dw-btn dw-btn-quiet dw-btn-lg text-center">Find jobs for my resume</Link>
            <Link href="/apps/dwaar/requests" className="dw-btn dw-btn-quiet dw-btn-lg text-center">My requests</Link>
          </>
        )}

          <Link href="/apps/dwaar/profile" className="dw-btn dw-btn-quiet dw-btn-lg text-center">Edit profile</Link>
          <SignOutButton />
        </div>
      </section>

      {profile.is_provider && profile.provider_work_email && !profile.work_email_verified_at && (
        <WorkEmailConfirm email={profile.provider_work_email} available={workEmailConfirmationConfigured()} />
      )}

      <details className="dw-card mt-6">
        <summary className="cursor-pointer font-medium">Delete my profile</summary>
        <p className="mt-3 text-sm leading-relaxed dw-muted">
          This removes your Dwaar profile: your name, headline, roles, company and work email. It also cancels your open
          requests and deletes your resume files, job descriptions and scores. Your Google sign-in stays, so you can come
          back later. To remove the sign-in account too, write to support@vyuhika.com.
        </p>
        <form action={deleteProfileAction} className="mt-4">
          <button type="submit" className="dw-btn dw-btn-quiet dw-btn-sm">Yes, delete my profile</button>
        </form>
      </details>
    </>
  );
}

function Notice({ params }: { params: Params }) {
  const error = params.error ? ERRORS[params.error] : null;
  const info = params.saved
    ? "Your profile is saved."
    : params.deleted
      ? "Your profile was deleted."
      : params.confirmed
        ? "Your work email is confirmed."
        : null;
  if (!error && !info) return null;
  return (
    <p
      role={error ? "alert" : "status"}
      className={`mb-6 dw-alert ${
        error ? "dw-alert-error" : "dw-alert-info"
      }`}
    >
      {error ?? info}
    </p>
  );
}

function SignedOut({ disabled = false }: { disabled?: boolean }) {
  return (
    <section className="dw-card">
      <h2 className="dw-display text-2xl font-medium ">Sign in to start</h2>
      <p className="mt-3 leading-relaxed dw-muted">
        Sign in with Google to create your Dwaar profile. Choose whether you want referrals, want to refer people, or both.
        Dwaar is in early access, so things may change.
      </p>
      <form action={signInWithGoogle} className="mt-6">
        <button type="submit" disabled={disabled} className="dw-btn dw-btn-primary dw-btn-lg">Continue with Google</button>
      </form>
      {disabled && <p className="mt-3 text-sm dw-muted">Sign-in is not set up on this server yet.</p>}
      <p className="mt-5 text-sm dw-muted">
        We only use your Google name and email address to set up your profile. Read the{" "}
        <Link href="/apps/dwaar/privacy" className="dw-link">privacy notice</Link>.
      </p>
    </section>
  );
}

function SignOutButton() {
  return (
    <form action={signOut}>
      <button type="submit" className="dw-btn dw-btn-quiet dw-btn-lg w-full sm:w-auto">Sign out</button>
    </form>
  );
}
