// "How a visit works": three small paper tickets, like steps of a real office visit.
const STEPS = [
  {
    no: "01",
    title: "Arrive",
    text: "Sign in with Google and make your profile. Say if you want a referral, want to give one, or both.",
  },
  {
    no: "02",
    title: "Ask at reception",
    text: "Pick the company, paste the job link and write a short note. Your request waits at that company's desk.",
  },
  {
    no: "03",
    title: "Meet",
    text: "An employee who works there reads it. If they accept, they get your email and can refer you.",
  },
];

export default function HowItWorks() {
  return (
    <section aria-labelledby="dw-how" className="mt-16 sm:mt-24">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">How a visit works</p>
      <h2 id="dw-how" className="font-display mt-3 max-w-xl text-2xl font-medium tracking-[-0.03em] sm:text-3xl">
        Like walking into an office, without the lift ride.
      </h2>
      <ol className="mt-8 grid gap-5 md:grid-cols-3">
        {STEPS.map((s) => (
          <li key={s.no} className="dw-ticket">
            <span className="dw-ticket-no">{s.no}</span>
            <h3 className="mt-3 text-lg font-bold">{s.title}</h3>
            <p className="dw-muted mt-2 leading-relaxed">{s.text}</p>
          </li>
        ))}
      </ol>
      <p className="mt-6 max-w-2xl text-sm leading-relaxed text-mist">
        Your email stays private until an employee accepts your request. You can cancel a request at any time, and
        requests close by themselves after 30 days.
      </p>
    </section>
  );
}
