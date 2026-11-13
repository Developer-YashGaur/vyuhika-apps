const phrases = ["AI Agents", "Automation", "Robotics", "Vision", "Language Models", "Built in Public"];

// A slow, endless strip of topics. The list is drawn twice so it loops seamlessly;
// the second copy is hidden from screen readers.
export default function Marquee() {
  return (
    <div className="marquee" role="region" aria-label="Topics">
      <div className="marquee-track">
        {[0, 1].map((copy) => (
          <ul key={copy} className="marquee-list" aria-hidden={copy === 1}>
            {phrases.map((p) => (
              <li key={p} className="flex items-center gap-10">
                <span>{p}</span>
                <span className="marquee-node" aria-hidden="true" />
              </li>
            ))}
          </ul>
        ))}
      </div>
    </div>
  );
}
