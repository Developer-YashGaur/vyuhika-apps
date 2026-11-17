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

## Not in Phase 1
Emailed code to confirm a work email, referral requests, resumes, chat, payments, account deletion of the sign-in record itself.
