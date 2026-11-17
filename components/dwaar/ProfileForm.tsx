"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { saveProfileAction, type ProfileFormState } from "@/app/apps/dwaar/actions";
import { LIMITS, type FieldName } from "@/lib/dwaar/profile-form";
import type { CompanyOption } from "@/lib/dwaar/profile";

// The Dwaar profile form: name, a short headline, roles, and (for referral providers) company and work email.
// The same form creates a new profile and edits an existing one.

export type ProfileFormValues = {
  displayName: string;
  headline: string;
  isCandidate: boolean;
  isProvider: boolean;
  companyId: string;
  workEmail: string;
  acceptsRequests: boolean;
  weeklyLimit: string;
};

type Props = {
  isNew: boolean;
  initial: ProfileFormValues;
  companies: CompanyOption[];
  accountEmail: string;
};

const initialState: ProfileFormState = { errors: {}, message: null };

export default function ProfileForm({ isNew, initial, companies, accountEmail }: Props) {
  const [state, formAction, pending] = useActionState(saveProfileAction, initialState);
  // Controlled fields, so what the person typed stays on screen if the server sends back an error.
  const [values, setValues] = useState<ProfileFormValues>(initial);
  const set = <K extends keyof ProfileFormValues>(key: K, value: ProfileFormValues[K]) =>
    setValues((previous) => ({ ...previous, [key]: value }));

  const { errors } = state;
  const errorId = (name: FieldName) => `${name}-error`;
  const describe = (name: FieldName, extra?: string) =>
    [errors[name] ? errorId(name) : null, extra].filter(Boolean).join(" ") || undefined;

  return (
    <form action={formAction} className="dw-card dw-cols" noValidate>
      {state.message && (
        <p role="alert" className="dw-alert dw-alert-error dw-span">
          {state.message}
        </p>
      )}

      <p className="text-sm dw-muted">
        Signed in as <strong>{accountEmail}</strong>
      </p>

      <div>
        <label htmlFor="displayName" className="dw-display text-lg font-medium ">
          Your name
        </label>
        <input
          id="displayName"
          name="displayName"
          value={values.displayName}
          onChange={(e) => set("displayName", e.target.value)}
          maxLength={LIMITS.displayName}
          autoComplete="name"
          aria-invalid={errors.displayName ? true : undefined}
          aria-describedby={describe("displayName")}
          className="dw-input mt-3"
        />
        <FieldError id={errorId("displayName")} message={errors.displayName} />
      </div>

      <div>
        <label htmlFor="headline" className="dw-display text-lg font-medium ">
          Headline <span className="text-sm font-normal dw-muted">(optional)</span>
        </label>
        <input
          id="headline"
          name="headline"
          value={values.headline}
          onChange={(e) => set("headline", e.target.value)}
          maxLength={LIMITS.headline}
          placeholder="For example: Backend developer, 3 years"
          aria-invalid={errors.headline ? true : undefined}
          aria-describedby={describe("headline")}
          className="dw-input mt-3"
        />
        <FieldError id={errorId("headline")} message={errors.headline} />
      </div>

      <fieldset aria-describedby={describe("roles")}>
        <legend className="dw-display text-lg font-medium ">What do you want to do?</legend>
        <p className="mt-1 text-sm dw-muted">You can choose both.</p>
        <div className="mt-3 flex flex-col gap-3">
          <label className="dw-option">
            <span className="flex items-center gap-3">
              <input
                type="checkbox"
                name="isCandidate"
                className="h-4 w-4 "
                checked={values.isCandidate}
                onChange={(e) => set("isCandidate", e.target.checked)}
              />
              <span className="font-medium">I am looking for referrals</span>
            </span>
            <span className="pl-7 text-sm dw-muted">Ask employees at a company to refer you for a job.</span>
          </label>
          <label className="dw-option">
            <span className="flex items-center gap-3">
              <input
                type="checkbox"
                name="isProvider"
                className="h-4 w-4 "
                checked={values.isProvider}
                onChange={(e) => set("isProvider", e.target.checked)}
              />
              <span className="font-medium">I can refer people</span>
            </span>
            <span className="pl-7 text-sm dw-muted">You work at a company and can refer candidates.</span>
          </label>
        </div>
        <FieldError id={errorId("roles")} message={errors.roles} />
      </fieldset>

      {values.isProvider && (
        <div className="flex flex-col gap-5 dw-panel">
          <div>
            <label htmlFor="companyId" className="dw-display text-lg font-medium ">
              Company you work at
            </label>
            {companies.length === 0 ? (
              <p className="mt-3 text-sm dw-muted">
                No companies are listed yet. Please check back soon, or write to support@vyuhika.com.
              </p>
            ) : (
              <select
                id="companyId"
                name="companyId"
                value={values.companyId}
                onChange={(e) => set("companyId", e.target.value)}
                aria-invalid={errors.companyId ? true : undefined}
                aria-describedby={describe("companyId")}
                className="dw-input mt-3"
              >
                <option value="">Choose a company</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
            )}
            <FieldError id={errorId("companyId")} message={errors.companyId} />
          </div>

          <div>
            <label htmlFor="workEmail" className="dw-display text-lg font-medium ">
              Work email
            </label>
            <input
              id="workEmail"
              name="workEmail"
              type="email"
              value={values.workEmail}
              onChange={(e) => set("workEmail", e.target.value)}
              autoComplete="email"
              maxLength={LIMITS.email}
              placeholder="name@yourcompany.com"
              aria-invalid={errors.workEmail ? true : undefined}
              aria-describedby={describe("workEmail", "workEmail-hint")}
              className="dw-input mt-3"
            />
            <p id="workEmail-hint" className="mt-2 text-sm dw-muted">
              It must use your company&apos;s email domain. Personal addresses like Gmail do not work. After you save, we
              will email a code to this address so you can confirm it. If you change it later, you confirm again.
            </p>
            <FieldError id={errorId("workEmail")} message={errors.workEmail} />
          </div>

          <div className="border-t border-[var(--dw-line)] pt-5">
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                name="acceptsRequests"
                checked={values.acceptsRequests}
                onChange={(e) => set("acceptsRequests", e.target.checked)}
                className="mt-1 h-4 w-4"
              />
              <span>
                <span className="dw-display text-lg font-medium">Send me referral requests</span>
                <span className="mt-1 block text-sm dw-muted">
                  Off by default. Switch it on to see requests for your company and get an email when someone asks. You can
                  switch it off at any time. It works once your work email is confirmed.
                </span>
              </span>
            </label>
            {!values.acceptsRequests && <input type="hidden" name="weeklyLimit" value={values.weeklyLimit} />}
            {values.acceptsRequests && (
              <div className="mt-4">
                <label htmlFor="weeklyLimit" className="text-sm font-semibold">
                  Most requests per week
                </label>
                <input
                  id="weeklyLimit"
                  name="weeklyLimit"
                  type="number"
                  inputMode="numeric"
                  min={LIMITS.weeklyMin}
                  max={LIMITS.weeklyMax}
                  value={values.weeklyLimit}
                  onChange={(e) => set("weeklyLimit", e.target.value)}
                  aria-invalid={errors.weeklyLimit ? true : undefined}
                  aria-describedby={describe("weeklyLimit")}
                  className="dw-input mt-2 max-w-[8rem]"
                />
                <FieldError id={errorId("weeklyLimit")} message={errors.weeklyLimit} />
              </div>
            )}
          </div>
        </div>
      )}

      {isNew && (
        <div>
          <label className="flex items-start gap-3 text-sm leading-relaxed">
            <input
              type="checkbox"
              name="consent"
              aria-invalid={errors.consent ? true : undefined}
              aria-describedby={describe("consent")}
              className="mt-1 h-4 w-4 "
            />
            <span>
              I have read the{" "}
              <Link href="/apps/dwaar/privacy" target="_blank" className="dw-link">
                terms and privacy notice
              </Link>{" "}
              and I agree to Dwaar saving the details above.
            </span>
          </label>
          <FieldError id={errorId("consent")} message={errors.consent} />
        </div>
      )}

      <div className="dw-span flex flex-col gap-3 sm:flex-row">
        <button type="submit" disabled={pending} className="dw-btn dw-btn-primary dw-btn-lg">
          {pending ? "Saving…" : isNew ? "Create my profile" : "Save changes"}
        </button>
        <Link href="/apps/dwaar" className="dw-btn dw-btn-quiet dw-btn-lg text-center">
          Cancel
        </Link>
      </div>
    </form>
  );
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-2 text-sm dw-bad-text">
      {message}
    </p>
  );
}
