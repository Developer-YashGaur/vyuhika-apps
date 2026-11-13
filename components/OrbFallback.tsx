// A lightweight CSS-only orb, used on phones, when WebGL isn't available,
// when motion is reduced, and while the 3D version is loading.
export default function OrbFallback() {
  return (
    <div className="orb-fallback" aria-hidden="true">
      <span className="orb-ring orb-ring-1" />
      <span className="orb-ring orb-ring-2" />
      <span className="orb-ring orb-ring-3" />
      <span className="orb-core" />
    </div>
  );
}
