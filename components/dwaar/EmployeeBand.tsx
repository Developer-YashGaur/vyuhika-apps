import Link from "next/link";

// A short note for employees on the front page: what they get to do and that they stay in control.
export default function EmployeeBand() {
  return (
    <section id="employees" aria-labelledby="dw-emp" className="dw-band mt-20 scroll-mt-24">
      <div>
        <p className="dw-eyebrow">For employees</p>
        <h2 id="dw-emp" className="dw-h2 dw-display mt-2">
          Refer people you can trust, in minutes.
        </h2>
        <p className="dw-lede mt-4">
          See each candidate&apos;s match score first, then accept only the ones you want. After you accept, their resume and
          details appear in your chat. You can pause any time.
        </p>
        <Link href="/apps/dwaar/profile" className="dw-btn dw-btn-quiet dw-btn-lg mt-6">
          Set up as a referrer
        </Link>
      </div>
      <ul className="dw-band-list">
        <li>
          <strong>You choose</strong>
          <span>Nothing is sent to anyone until you accept.</span>
        </li>
        <li>
          <strong>Your email stays private</strong>
          <span>Candidates never see your work email.</span>
        </li>
        <li>
          <strong>No chat emails</strong>
          <span>Messages stay inside Dwaar. No inbox clutter.</span>
        </li>
      </ul>
    </section>
  );
}
