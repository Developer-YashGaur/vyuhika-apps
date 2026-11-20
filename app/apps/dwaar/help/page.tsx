import Link from "next/link";
import { dwaarMetadata } from "@/lib/dwaar/metadata";

export const metadata = dwaarMetadata;

// Plain help page: short answers for job seekers and for employees who refer. Static text only.
const SEEKER = [
  { q: "How do I ask for a referral?", a: "Pick a job from Latest jobs or Find jobs, check your match, then send a request. Employees at that company can accept it." },
  { q: "Who sees my resume?", a: "Only an employee who accepts your request, and only inside your chat. You can stop sharing any time." },
  { q: "What does Resume Boost do?", a: "It rewrites your resume to fit one job better and shows your new match score. You choose what to do next." },
  { q: "Does Plus guarantee a referral?", a: "No. Plus gives you more daily checks and credits. It never decides who gets a referral." },
];
const EMPLOYEE = [
  { q: "How do I start referring?", a: "Open your Profile, confirm your work email, then check the Employee desk for requests at your company." },
  { q: "Do I have to accept every request?", a: "No. You see the match score and a short summary first. You see the full resume and contact details only after you accept." },
  { q: "Can I stop a chat?", a: "Yes. You can close a chat and decline to share any contact detail." },
];

function Group({ title, items }: { title: string; items: { q: string; a: string }[] }) {
  return (
    <section className="mt-10">
      <h2 className="dw-h2 dw-display">{title}</h2>
      <dl className="mt-5 grid gap-4 md:grid-cols-2">
        {items.map((i) => (
          <div key={i.q} className="dw-card">
            <dt className="dw-display text-lg">{i.q}</dt>
            <dd className="dw-muted mt-2 leading-relaxed">{i.a}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export default function HelpPage() {
  return (
    <div className="dw-wrap dw-page">
      <p className="dw-eyebrow">Help</p>
      <h1 className="dw-title dw-display mt-2 mb-3">How can we help?</h1>
      <p className="dw-muted max-w-2xl text-lg leading-relaxed">Quick answers below. If you still need us, write to support@vyuhika.com.</p>
      <Group title="For job seekers" items={SEEKER} />
      <Group title="For employees who refer" items={EMPLOYEE} />
      <div className="mt-10 flex flex-wrap gap-3">
        <Link href="/apps/dwaar/find" className="dw-btn dw-btn-primary">Find jobs</Link>
        <Link href="/contact" className="dw-btn dw-btn-quiet">Contact us</Link>
      </div>
    </div>
  );
}
