"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { createRequestAction, type RequestFormState } from "@/app/apps/dwaar/actions";
import { REQUEST_LIMITS, type RequestFieldName } from "@/lib/dwaar/request-form";
import type { CompanyOption } from "@/lib/dwaar/profile";

// "Ask for a referral": pick the company, the job, and a short note. Like filling in the visitor book at reception.

const initialState: RequestFormState = { errors: {}, message: null };

export default function RequestForm({ companies }: { companies: CompanyOption[] }) {
  const [state, formAction, pending] = useActionState(createRequestAction, initialState);
  const [values, setValues] = useState({ companyId: "", jobTitle: "", jobUrl: "", note: "" });
  const set = (key: keyof typeof values, value: string) => setValues((v) => ({ ...v, [key]: value }));

  const { errors } = state;
  const errorId = (n: RequestFieldName) => `${n}-error`;
  const describe = (n: RequestFieldName) => (errors[n] ? errorId(n) : undefined);

  return (
    <form action={formAction} className="dw-paper flex max-w-2xl flex-col gap-7" noValidate>
      {state.message && (
        <p role="alert" className="rounded-xl border border-rose-700/40 bg-rose-100 px-4 py-3 text-sm text-rose-900">
          {state.message}
        </p>
      )}

      <div>
        <label htmlFor="companyId" className="font-display text-lg font-medium tracking-[-0.03em]">
          Which company?
        </label>
        {companies.length === 0 ? (
          <p className="dw-muted mt-3 text-sm">No companies are listed yet. Please check back soon.</p>
        ) : (
          <select
            id="companyId"
            name="companyId"
            value={values.companyId}
            onChange={(e) => set("companyId", e.target.value)}
            aria-invalid={errors.companyId ? true : undefined}
            aria-describedby={describe("companyId")}
            className="field-input mt-3"
          >
            <option value="">Choose a company</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        )}
        <FieldError id={errorId("companyId")} message={errors.companyId} />
      </div>

      <div>
        <label htmlFor="jobTitle" className="font-display text-lg font-medium tracking-[-0.03em]">
          Job you are applying for
        </label>
        <input
          id="jobTitle"
          name="jobTitle"
          value={values.jobTitle}
          onChange={(e) => set("jobTitle", e.target.value)}
          maxLength={REQUEST_LIMITS.jobTitle}
          placeholder="For example: Backend Engineer"
          aria-invalid={errors.jobTitle ? true : undefined}
          aria-describedby={describe("jobTitle")}
          className="field-input mt-3"
        />
        <FieldError id={errorId("jobTitle")} message={errors.jobTitle} />
      </div>

      <div>
        <label htmlFor="jobUrl" className="font-display text-lg font-medium tracking-[-0.03em]">
          Link to the job posting
        </label>
        <input
          id="jobUrl"
          name="jobUrl"
          type="url"
          inputMode="url"
          value={values.jobUrl}
          onChange={(e) => set("jobUrl", e.target.value)}
          maxLength={REQUEST_LIMITS.jobUrl}
          placeholder="https://company.com/careers/123"
          aria-invalid={errors.jobUrl ? true : undefined}
          aria-describedby={describe("jobUrl")}
          className="field-input mt-3"
        />
        <FieldError id={errorId("jobUrl")} message={errors.jobUrl} />
      </div>

      <div>
        <label htmlFor="note" className="font-display text-lg font-medium tracking-[-0.03em]">
          A short note <span className="dw-muted text-sm font-normal">(optional)</span>
        </label>
        <textarea
          id="note"
          name="note"
          rows={4}
          value={values.note}
          onChange={(e) => set("note", e.target.value)}
          maxLength={REQUEST_LIMITS.note}
          placeholder="Two or three lines: your experience and why this role fits you."
          aria-invalid={errors.note ? true : undefined}
          aria-describedby={describe("note")}
          className="field-input mt-3"
        />
        <p className="dw-muted mt-1 text-right text-xs">{values.note.length}/{REQUEST_LIMITS.note}</p>
        <FieldError id={errorId("note")} message={errors.note} />
      </div>

      <p className="dw-muted text-sm leading-relaxed">
        Employees at this company will see your name, headline, job and note. Your email is shared only with the person who
        accepts.
      </p>

      <div className="flex flex-col gap-3 sm:flex-row">
        <button type="submit" disabled={pending} className="btn-glow btn-lg">
          {pending ? "Sending…" : "Send to reception"}
        </button>
        <Link href="/apps/dwaar/requests" className="btn-ghost btn-lg text-center">
          Cancel
        </Link>
      </div>
    </form>
  );
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-2 text-sm text-rose-800">
      {message}
    </p>
  );
}
