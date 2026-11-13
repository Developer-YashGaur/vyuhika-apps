"use client";

import { Component, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import OrbFallback from "@/components/OrbFallback";

// three.js is only downloaded when this actually renders.
const NeuralOrb = dynamic(() => import("@/components/NeuralOrb"), {
  ssr: false,
  loading: () => <OrbFallback />,
});

// Use the 3D orb only on larger screens with a mouse, WebGL, and normal motion.
function canShow3D() {
  const desktop = window.matchMedia("(min-width: 1024px) and (pointer: fine)").matches;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!desktop || reduceMotion) return false;
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

// If the 3D scene crashes (for example, the GPU refuses), show the CSS orb instead.
class OrbErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: Error) {
    console.error("3D orb failed, showing the CSS orb instead:", error);
  }
  render() {
    return this.state.failed ? <OrbFallback /> : this.props.children;
  }
}

export default function HeroOrb() {
  const [show3D] = useState(canShow3D);

  if (!show3D) return <OrbFallback />;
  return (
    <OrbErrorBoundary>
      <NeuralOrb />
    </OrbErrorBoundary>
  );
}
