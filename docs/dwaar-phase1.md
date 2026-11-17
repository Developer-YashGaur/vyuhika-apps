# Dwaar, Phase 1: sign-in, profile, roles

Dwaar is the Referral Marketplace app. Phase 1 only: Google sign-in, a profile, role choice (candidate, provider, or both),
and for providers a company plus a work email whose domain must match the company.

## What is where
- `proxy.ts` refreshes the sign-in cookie for `/apps/dwaar/*` and `/auth/*` only. Other pages stay static.
- `app/auth/callback/route.ts` finishes Google sign-in. `lib/auth/redirect.ts` only allows going back to Dwaar pages.
- `app/apps/dwaar/` pages: front page, profile form, draft privacy notice. `actions.ts` holds the server actions.
- `lib/dwaar/profile-form.ts` checks what the person typed. `lib/dwaar/profile.ts` talks to the database.
- `components/dwaar/` the form and the front-page states.
- Database (owned by `../vyuhika-platform`): `dwaar_profiles`, the `company_options` view, `email_matches_company()`.

## Rules
- Browser and server use the signed-in person's session and the public anon key. No service-role key anywhere.
- The database enforces: own-row access only, work-email domain must match the company, one work email per account,
  and users cannot mark their own email as verified. The form checks the same things first for friendly messages.
- Dwaar is hidden until launch: noindex pages, not in `lib/apps.ts`, not in the sitemap. To launch: add the app to `lib/apps.ts`
  (with page content in `lib/app-content.ts`), remove `robots` from `lib/dwaar/metadata.ts`, and replace the draft privacy
  notice with the lawyer-approved one (and bump `CONSENT_VERSION`).

## Setup on your computer
1. `.env.local` needs `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (same values as the admin app).
2. Supabase, Authentication, URL Configuration: add `http://localhost:3000/auth/callback` and `https://apps.vyuhika.com/auth/callback`.
3. Google sign-in is already enabled in Supabase (set up for the admin app).
4. Staff must add companies and their email domains in the admin panel before providers can pick a company.

## Phase 2: confirming a work email with a code
- The database makes and checks the code (`dwaar_issue_work_email_code`, `dwaar_confirm_work_email`, owned by vyuhika-platform).
  Codes last 15 minutes, allow 5 tries, 60 seconds between sends and 5 sends per hour. Only a hash is stored.
- `lib/dwaar/work-email.tsx` passes the code along: it asks the database for a code with `DWAAR_SERVER_SECRET`, then emails it with the existing
  Resend setup (`components/emails/WorkEmailCodeEmail.tsx`). The address comes from the database, never from the browser.
- `DWAAR_SERVER_SECRET` is a server-only value (no NEXT_PUBLIC_ prefix) of at least 32 characters. Its SHA-256 hash is stored in
  `private.dwaar_config` (see vyuhika-platform docs/CHANGELOG.md for the one-time setup). Set it in `.env.local` and in Vercel.
- The confirm panel (`components/dwaar/WorkEmailConfirm.tsx`) shows on the Dwaar page for providers whose email is not confirmed.
  If the secret or email settings are missing, it says confirming is not switched on yet.
- Several accounts may claim one email, but only the account that confirms the code holds it as confirmed.

## Not built yet
Referral requests, resumes, chat, payments, deleting the sign-in record itself.
