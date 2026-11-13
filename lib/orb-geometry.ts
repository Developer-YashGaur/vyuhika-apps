// Math for the 3D neural orb in the hero.
// Kept separate from the 3D code so it can be tested without a browser.

export type Point3 = [number, number, number];

// Spreads `count` points evenly over a sphere (the "Fibonacci sphere" trick).
export function fibonacciSphere(count: number, radius: number): Point3[] {
  const points: Point3[] = [];
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));

  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2; // goes from 1 down to -1
    const ringRadius = Math.sqrt(1 - y * y);
    const theta = goldenAngle * i;
    points.push([
      Math.cos(theta) * ringRadius * radius,
      y * radius,
      Math.sin(theta) * ringRadius * radius,
    ]);
  }
  return points;
}

// Connects each point to its `k` nearest neighbours.
// Returns pairs of indexes [a, b] with a < b and no duplicates.
export function nearestEdges(points: Point3[], k: number): [number, number][] {
  const seen = new Set<string>();
  const edges: [number, number][] = [];

  points.forEach((p, i) => {
    const neighbours = points
      .map((q, j) => ({ j, dist: Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]) }))
      .filter(({ j }) => j !== i)
      .sort((a, b) => a.dist - b.dist)
      .slice(0, k);

    for (const { j } of neighbours) {
      const a = Math.min(i, j);
      const b = Math.max(i, j);
      const key = `${a}-${b}`;
      if (!seen.has(key)) {
        seen.add(key);
        edges.push([a, b]);
      }
    }
  });
  return edges;
}
