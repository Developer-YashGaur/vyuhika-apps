"use client";

import { useEffect, useRef } from "react";

// A full-screen canvas of drifting dots. Dots that are close to each other
// (or to the mouse) get connected by faint lines, like a neural network.

const LINK_DISTANCE = 130; // px: max distance for a line between two dots
const MOUSE_DISTANCE = 180; // px: max distance for a line to the mouse
const CYAN = "34, 211, 238";
const VIOLET = "139, 92, 246";

type Dot = { x: number; y: number; vx: number; vy: number; color: string };

export default function NeuralBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const mouse = { x: -9999, y: -9999 };
    let dots: Dot[] = [];
    let width = 0;
    let height = 0;
    let frameId = 0;

    function setup() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas!.width = width * dpr;
      canvas!.height = height * dpr;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Fewer dots on small screens so phones stay smooth.
      const count = Math.min(60, Math.floor((width * height) / 20000));
      dots = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        color: Math.random() < 0.6 ? CYAN : VIOLET,
      }));
    }

    function draw() {
      ctx!.clearRect(0, 0, width, height);

      for (let i = 0; i < dots.length; i++) {
        const a = dots[i];

        for (let j = i + 1; j < dots.length; j++) {
          const b = dots[j];
          const dist = Math.hypot(a.x - b.x, a.y - b.y);
          if (dist < LINK_DISTANCE) {
            ctx!.strokeStyle = `rgba(${a.color}, ${0.1 * (1 - dist / LINK_DISTANCE)})`;
            ctx!.lineWidth = 1;
            ctx!.beginPath();
            ctx!.moveTo(a.x, a.y);
            ctx!.lineTo(b.x, b.y);
            ctx!.stroke();
          }
        }

        const mouseDist = Math.hypot(a.x - mouse.x, a.y - mouse.y);
        if (mouseDist < MOUSE_DISTANCE) {
          ctx!.strokeStyle = `rgba(${CYAN}, ${0.25 * (1 - mouseDist / MOUSE_DISTANCE)})`;
          ctx!.beginPath();
          ctx!.moveTo(a.x, a.y);
          ctx!.lineTo(mouse.x, mouse.y);
          ctx!.stroke();
        }

        ctx!.fillStyle = `rgba(${a.color}, 0.5)`;
        ctx!.beginPath();
        ctx!.arc(a.x, a.y, 1.3, 0, Math.PI * 2);
        ctx!.fill();
      }
    }

    function step() {
      for (const d of dots) {
        d.x += d.vx;
        d.y += d.vy;
        if (d.x < 0 || d.x > width) d.vx *= -1;
        if (d.y < 0 || d.y > height) d.vy *= -1;
      }
      draw();
      frameId = requestAnimationFrame(step);
    }

    function onResize() {
      setup();
      if (reduceMotion) draw();
    }

    function onMouseMove(e: MouseEvent) {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    }

    function onMouseLeave() {
      mouse.x = -9999;
      mouse.y = -9999;
    }

    setup();
    window.addEventListener("resize", onResize);

    // With reduced motion we draw one still frame and skip the animation.
    if (reduceMotion) {
      draw();
    } else {
      window.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseleave", onMouseLeave);
      frameId = requestAnimationFrame(step);
    }

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseleave", onMouseLeave);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
    />
  );
}
