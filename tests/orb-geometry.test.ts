import { describe, expect, it } from "vitest";
import { fibonacciSphere, nearestEdges } from "@/lib/orb-geometry";

describe("fibonacciSphere", () => {
  it("creates the requested number of points", () => {
    expect(fibonacciSphere(50, 2)).toHaveLength(50);
  });

  it("puts every point on the sphere's surface", () => {
    for (const [x, y, z] of fibonacciSphere(80, 1.5)) {
      expect(Math.hypot(x, y, z)).toBeCloseTo(1.5, 6);
    }
  });
});

describe("nearestEdges", () => {
  const points = fibonacciSphere(40, 1);
  const edges = nearestEdges(points, 3);

  it("returns each connection only once, smaller index first", () => {
    const keys = edges.map(([a, b]) => `${a}-${b}`);
    expect(new Set(keys).size).toBe(keys.length);
    for (const [a, b] of edges) expect(a).toBeLessThan(b);
  });

  it("connects every point to at least k others", () => {
    const degree = new Array(points.length).fill(0);
    for (const [a, b] of edges) {
      degree[a]++;
      degree[b]++;
    }
    for (const d of degree) expect(d).toBeGreaterThanOrEqual(3);
  });
});
