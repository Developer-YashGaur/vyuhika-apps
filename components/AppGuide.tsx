import { appContent } from "@/lib/app-content";

// The readable text under an app's tool: what it does, how it works, who it is for, what it does not do, and an FAQ.
// A plain server component with no animation, so the words are in the page's HTML and visible before any JavaScript runs.
// The words live in lib/app-content.ts.
export default function AppGuide({ slug, name }: { slug: string; name: string }) {
  const content = appContent[slug];
  if (!content) throw new Error(`No app content for "${slug}"`);

  return (
    <div className="mt-24 flex flex-col gap-20 sm:mt-32 sm:gap-28">
      <section aria-labelledby="what-it-does">
        <h2 id="what-it-does" className="section-subtitle font-display">
          What {name} does
        </h2>
        <p className="measure mt-5 text-lg leading-relaxed text-mist">{content.whatItDoes}</p>
      </section>

      <section aria-labelledby="how-it-works">
        <h2 id="how-it-works" className="section-subtitle font-display">
          How it works
        </h2>
        <ol className="mt-8 grid gap-5 md:grid-cols-3">
          {content.steps.map((step, i) => (
            <li key={step.title} className="glass-panel glow-cyan">
              <span className="guide-step-number font-display" aria-hidden="true">
                {i + 1}
              </span>
              <h3 className="mt-5 font-display text-lg font-medium tracking-[-0.02em] text-ink">{step.title}</h3>
              <p className="mt-3 leading-relaxed text-mist">{step.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <div className="grid gap-12 lg:grid-cols-2 lg:gap-8">
        <section aria-labelledby="who-for">
          <h2 id="who-for" className="section-subtitle font-display">
            Who it is for
          </h2>
          <p className="measure mt-5 text-lg leading-relaxed text-mist">{content.whoFor}</p>
        </section>

        <section aria-labelledby="does-not" className="glass-panel glow-violet self-start">
          <h2 id="does-not" className="section-subtitle font-display">
            What it does not do
          </h2>
          <p className="mt-5 leading-relaxed text-mist">{content.doesNot}</p>
        </section>
      </div>

      <section aria-labelledby="faq">
        <h2 id="faq" className="section-subtitle font-display">
          Frequently asked questions
        </h2>
        <div className="mt-8 grid gap-5 lg:grid-cols-2">
          {content.faq.map((item) => (
            <div key={item.question} className="glass-panel glow-cyan lg:last:odd:col-span-2">
              <h3 className="font-display text-lg font-medium tracking-[-0.02em] text-ink">{item.question}</h3>
              <p className="mt-3 leading-relaxed text-mist">{item.answer}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
