"use client";

import { useActionState, useState } from "react";
import { practiceFeedbackAction, practiceQuestionsAction, type PracticeFeedbackState, type PracticeQuestionsState } from "@/app/apps/dwaar/actions";

// Plus interview practice: type a job title, get 5 questions, pick one, write an answer, read the feedback.
// Nothing you type is stored.

const startQuestions: PracticeQuestionsState = { message: null, role: "", questions: [] };
const startFeedback: PracticeFeedbackState = { message: null, feedback: null };
const RATING: Record<string, string> = { strong: "Strong answer", good: "Good answer", "needs work": "Needs work" };

function Answer({ role, question }: { role: string; question: string }) {
  const [state, formAction, pending] = useActionState(practiceFeedbackAction.bind(null, role, question), startFeedback);
  return (
    <form action={formAction} className="mt-4 grid gap-3">
      <label htmlFor="dw-answer" className="font-medium">
        Your answer
      </label>
      <textarea id="dw-answer" name="answer" required minLength={40} maxLength={2000} rows={6} className="dw-input" placeholder="Write your answer as you would say it in the interview." />
      <div>
        <button type="submit" className="dw-btn dw-btn-primary" disabled={pending}>
          {pending ? "Reading your answer…" : "Get feedback"}
        </button>
      </div>
      {state.message && (
        <p role="alert" className="dw-alert dw-alert-error">
          {state.message}
        </p>
      )}
      {state.feedback && (
        <div className="dw-card" aria-live="polite">
          <p className="dw-display text-lg">{RATING[state.feedback.rating]}</p>
          {state.feedback.strengths.length > 0 && (
            <>
              <h4 className="mt-3 font-semibold">What worked</h4>
              <ul className="dw-muted mt-1 list-disc pl-5">
                {state.feedback.strengths.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </>
          )}
          {state.feedback.improvements.length > 0 && (
            <>
              <h4 className="mt-3 font-semibold">How to improve it</h4>
              <ul className="dw-muted mt-1 list-disc pl-5">
                {state.feedback.improvements.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </>
          )}
          <h4 className="mt-3 font-semibold">A stronger version</h4>
          <p className="dw-muted mt-1 whitespace-pre-line">{state.feedback.sampleAnswer}</p>
          <p className="dw-muted mt-3 text-sm">Use it as a guide, in your own words. Only say what is true for you.</p>
        </div>
      )}
    </form>
  );
}

export default function PracticeForm() {
  const [state, formAction, pending] = useActionState(practiceQuestionsAction, startQuestions);
  const [picked, setPicked] = useState<number | null>(null);

  return (
    <div className="grid gap-8">
      <form action={formAction} className="grid max-w-2xl gap-3" onSubmit={() => setPicked(null)}>
        <label htmlFor="dw-role" className="font-medium">
          Job title
        </label>
        <input id="dw-role" name="role" required minLength={2} maxLength={80} className="dw-input" placeholder="For example: Backend Developer" />
        <label htmlFor="dw-desc" className="font-medium">
          Job description <span className="dw-muted font-normal">(optional)</span>
        </label>
        <textarea id="dw-desc" name="description" maxLength={3000} rows={5} className="dw-input" placeholder="Paste the job description for sharper questions." />
        <div>
          <button type="submit" className="dw-btn dw-btn-primary" disabled={pending}>
            {pending ? "Writing questions…" : "Get 5 questions"}
          </button>
        </div>
        {state.message && (
          <p role="alert" className="dw-alert dw-alert-error">
            {state.message}
          </p>
        )}
      </form>

      {state.questions.length > 0 && (
        <section aria-labelledby="dw-qs">
          <h2 id="dw-qs" className="dw-h2 dw-display">
            Pick a question to answer
          </h2>
          <ol className="mt-4 grid gap-3">
            {state.questions.map((q, i) => (
              <li key={q} className="dw-card">
                <button type="button" className="text-left font-medium" aria-expanded={picked === i} onClick={() => setPicked(i)}>
                  {i + 1}. {q}
                </button>
                {picked === i && <Answer key={q} role={state.role} question={q} />}
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}
