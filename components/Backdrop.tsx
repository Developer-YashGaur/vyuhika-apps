import NeuralBackground from "@/components/NeuralBackground";

// The layered background behind every page, from back to front:
// aurora colour blobs, a perspective grid, the neural dots, and film grain.
export default function Backdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div className="aurora">
        <span className="aurora-blob aurora-cyan" />
        <span className="aurora-blob aurora-violet" />
        <span className="aurora-blob aurora-magenta" />
      </div>
      <div className="horizon-grid">
        <div className="horizon-plane" />
      </div>
      <NeuralBackground />
      <div className="grain" />
    </div>
  );
}
