"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { AdaptiveDpr, PointMaterial, Points } from "@react-three/drei";
import * as THREE from "three";
import { fibonacciSphere, nearestEdges } from "@/lib/orb-geometry";

// The 3D centerpiece: a wireframe sphere of glowing nodes with a pulsing core.
// It rotates slowly and leans toward the mouse. This file is heavy (three.js),
// so the hero loads it lazily and only on desktops with WebGL.

const NODE_COUNT = 220;
const RADIUS = 1.6;
const CYAN = new THREE.Color("#22d3ee");
const VIOLET = new THREE.Color("#8b5cf6");
const MAGENTA = new THREE.Color("#e879f9");

// Mouse position from -1 to 1, shared by the whole scene.
const mouse = { x: 0, y: 0 };

// A soft round glow drawn once onto a small canvas.
function makeGlowTexture() {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.2, "rgba(170,240,255,0.8)");
  g.addColorStop(0.5, "rgba(139,92,246,0.25)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(canvas);
}

// Colour each node by height: cyan at the top, violet in the middle, magenta at the bottom.
function colourFor(y: number) {
  const t = (y / RADIUS + 1) / 2; // 0 at bottom, 1 at top
  return t > 0.5
    ? VIOLET.clone().lerp(CYAN, (t - 0.5) * 2)
    : MAGENTA.clone().lerp(VIOLET, t * 2);
}

function Orb() {
  const tiltRef = useRef<THREE.Group>(null);
  const spinRef = useRef<THREE.Group>(null);
  const coreRef = useRef<THREE.Sprite>(null);
  const haloRef = useRef<THREE.Sprite>(null);

  const glow = useMemo(() => makeGlowTexture(), []);

  const { nodePositions, nodeColours, linePositions, lineColours } = useMemo(() => {
    const points = fibonacciSphere(NODE_COUNT, RADIUS);
    const edges = nearestEdges(points, 3);

    const nodePositions = new Float32Array(points.flat());
    const nodeColours = new Float32Array(points.flatMap((p) => colourFor(p[1]).toArray()));

    const linePositions = new Float32Array(edges.flatMap(([a, b]) => [...points[a], ...points[b]]));
    const lineColours = new Float32Array(
      edges.flatMap(([a, b]) => [...colourFor(points[a][1]).toArray(), ...colourFor(points[b][1]).toArray()]),
    );
    return { nodePositions, nodeColours, linePositions, lineColours };
  }, []);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;

    if (spinRef.current) spinRef.current.rotation.y += delta * 0.12;

    // Ease toward the mouse instead of snapping to it.
    if (tiltRef.current) {
      tiltRef.current.rotation.x = THREE.MathUtils.lerp(tiltRef.current.rotation.x, mouse.y * 0.35, 0.04);
      tiltRef.current.rotation.z = THREE.MathUtils.lerp(tiltRef.current.rotation.z, -mouse.x * 0.2, 0.04);
      tiltRef.current.position.x = THREE.MathUtils.lerp(tiltRef.current.position.x, mouse.x * 0.15, 0.04);
    }

    // Heartbeat-like pulse for the core.
    const pulse = 1 + Math.sin(t * 2.2) * 0.12;
    coreRef.current?.scale.setScalar(1.1 * pulse);
    haloRef.current?.scale.setScalar(3.4 + Math.sin(t * 1.1) * 0.25);
  });

  return (
    <group ref={tiltRef}>
      <group ref={spinRef} rotation={[0.35, 0, 0.1]}>
        <lineSegments>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[linePositions, 3]} />
            <bufferAttribute attach="attributes-color" args={[lineColours, 3]} />
          </bufferGeometry>
          <lineBasicMaterial
            vertexColors
            transparent
            opacity={0.32}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </lineSegments>

        <Points positions={nodePositions} colors={nodeColours}>
          <PointMaterial
            vertexColors
            transparent
            size={0.055}
            sizeAttenuation
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </Points>
      </group>

      <sprite ref={haloRef}>
        <spriteMaterial map={glow} transparent opacity={0.35} blending={THREE.AdditiveBlending} depthWrite={false} />
      </sprite>
      <sprite ref={coreRef}>
        <spriteMaterial map={glow} transparent opacity={0.95} blending={THREE.AdditiveBlending} depthWrite={false} />
      </sprite>
    </group>
  );
}

export default function NeuralOrb() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    function onMove(e: PointerEvent) {
      mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.y = (e.clientY / window.innerHeight) * 2 - 1;
    }
    window.addEventListener("pointermove", onMove);

    // Stop rendering when the orb is scrolled out of view, to save battery.
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
    if (wrapperRef.current) observer.observe(wrapperRef.current);

    return () => {
      window.removeEventListener("pointermove", onMove);
      observer.disconnect();
    };
  }, []);

  return (
    <div ref={wrapperRef} className="h-full w-full">
      <Canvas
        camera={{ position: [0, 0, 5.2], fov: 45 }}
        dpr={[1, 1.75]}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        frameloop={visible ? "always" : "never"}
        aria-hidden="true"
      >
        <AdaptiveDpr pixelated={false} />
        <Orb />
      </Canvas>
    </div>
  );
}
