// "How it works": three plain steps.
const STEPS = [
  {
    no: "1",
    title: "Create your profile",
    text: "Sign in with Google. Say whether you want a referral, want to give one, or both.",
  },
  {
    no: "2",
    title: "Ask for a referral",
    text: "Pick the company, add the job and your resume. Dwaar checks how well your resume fits and gives free tips. With a match of 60 or more, your request goes to employees there.",
  },
  {
    no: "3",
    title: "An employee accepts",
    text: "Someone who works there reads your headline and the job. If they agree, you can send them a message inside Dwaar.",
  },
];

export default function HowItWorks() {
  return (
    <section id="how" aria-labelledby="dw-how" className="mt-20 scroll-mt-24">
      <p className="dw-eyebrow">How it works</p>
      <h2 id="dw-how" className="dw-h2 dw-display mt-2 max-w-xl">
        Three steps to a warm introduction
      </h2>
      <ol className="dw-steps">
        {STEPS.map((s) => (
          <li key={s.no} className="dw-stepcard">
            <span className="dw-stepno" aria-hidden="true">
              {s.no}
            </span>
            <h3 className="dw-display mt-4 text-lg">
              <span className="sr-only">Step {s.no}: </span>
              {s.title}
            </h3>
            <p className="dw-muted mt-2">{s.text}</p>
          </li>
        ))}
      </ol>
      <p className="dw-muted mt-6 max-w-2xl text-sm">
        Employees see your match score and which skills matched. Your email is never shared. After an employee accepts, you can chat live inside Dwaar, and that employee can see your resume (you can switch this off). You can cancel a
        request at any time, and requests close by themselves after 30 days.
      </p>
    </section>
  );
}
