import { appContent } from "@/lib/app-content";

// Readable text for people and search engines: who Dwaar is for, what it does not do, and the FAQ.
// A plain server component (nothing hidden, no animation), so the words are in the page's HTML. The same words go into
// the page's FAQ structured data (lib/structured-data.ts), so the two can never disagree. The words live in lib/app-content.ts.
export default function DwaarFaq() {
  const content = appContent.dwaar;
  return (
    <section id="about" aria-labelledby="dw-about" className="mt-20 scroll-mt-24">
      <p className="dw-eyebrow">About Dwaar</p>
      <h2 id="dw-about" className="dw-h2 dw-display mt-2 max-w-xl">
        What Dwaar is, and what it is not
      </h2>
      <p className="dw-muted mt-4 max-w-3xl text-lg leading-relaxed">{content.whatItDoes}</p>
      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <div className="dw-card">
          <h3 className="dw-display text-xl">Who it is for</h3>
          <p className="dw-muted mt-3 leading-relaxed">{content.whoFor}</p>
        </div>
        <div className="dw-card">
          <h3 className="dw-display text-xl">What it does not do</h3>
          <p className="dw-muted mt-3 leading-relaxed">{content.doesNot}</p>
        </div>
      </div>

      <h2 id="dw-faq" className="dw-h2 dw-display mt-16">
        Frequently asked questions
      </h2>
      <dl className="mt-6 grid gap-4 md:grid-cols-2">
        {content.faq.map((item) => (
          <div key={item.question} className="dw-card">
            <dt className="dw-display text-lg">{item.question}</dt>
            <dd className="dw-muted mt-2 leading-relaxed">{item.answer}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
