import { resumeDisplayName, type ResumeContact, type ResumeDoc } from "@/lib/dwaar/resume-doc";

// A resume laid out like a real one. It prints as the only thing on the page (see the print rules in dwaar.css).
export default function ResumeView({ doc, contact }: { doc: ResumeDoc; contact: ResumeContact }) {
  const details = [contact.email, contact.phone, contact.linkedin, ...contact.links].filter((d): d is string => Boolean(d));
  const skills = doc.skills.filter((s) => s.items.length > 0);
  return (
    <article id="dw-resume-paper" className="dw-paper" aria-label="Your improved resume">
      <header className="dw-paper-head">
        <h2 className="dw-paper-name">{resumeDisplayName(doc, contact.name)}</h2>
        {doc.headline && <p className="dw-paper-headline">{doc.headline}</p>}
        {details.length > 0 && <p className="dw-paper-contact">{details.join("  |  ")}</p>}
      </header>

      {doc.summary && (
        <PaperSection title="Summary">
          <p>{doc.summary}</p>
        </PaperSection>
      )}

      {skills.length > 0 && (
        <PaperSection title="Skills">
          <ul className="dw-paper-plain">
            {skills.map((s, i) => (
              <li key={i}>
                {s.label && <strong>{s.label}: </strong>}
                {s.items.join(", ")}
              </li>
            ))}
          </ul>
        </PaperSection>
      )}

      {doc.experience.length > 0 && (
        <PaperSection title="Experience">
          {doc.experience.map((e, i) => (
            <div key={i} className="dw-paper-item">
              <p className="dw-paper-row">
                <strong>{[e.title, e.company].filter(Boolean).join(" · ")}</strong>
                <span>{e.dates}</span>
              </p>
              {e.location && <p className="dw-paper-sub">{e.location}</p>}
              <Bullets items={e.bullets} />
            </div>
          ))}
        </PaperSection>
      )}

      {doc.projects.length > 0 && (
        <PaperSection title="Projects">
          {doc.projects.map((p, i) => (
            <div key={i} className="dw-paper-item">
              <p>
                <strong>{p.name}</strong>
              </p>
              <Bullets items={p.bullets} />
            </div>
          ))}
        </PaperSection>
      )}

      {doc.education.length > 0 && (
        <PaperSection title="Education">
          {doc.education.map((e, i) => (
            <div key={i} className="dw-paper-item">
              <p className="dw-paper-row">
                <strong>{[e.degree, e.school].filter(Boolean).join(" · ")}</strong>
                <span>{e.dates}</span>
              </p>
              {e.detail && <p className="dw-paper-sub">{e.detail}</p>}
            </div>
          ))}
        </PaperSection>
      )}

      {doc.certifications.length > 0 && (
        <PaperSection title="Certifications">
          <Bullets items={doc.certifications} />
        </PaperSection>
      )}
    </article>
  );
}

function PaperSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="dw-paper-section">
      <h3 className="dw-paper-title">{title}</h3>
      {children}
    </section>
  );
}

function Bullets({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  return (
    <ul className="dw-paper-bullets">
      {items.map((b, i) => (
        <li key={i}>{b}</li>
      ))}
    </ul>
  );
}
