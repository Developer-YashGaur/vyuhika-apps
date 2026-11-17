import { monogramFor } from "@/lib/dwaar/monogram";

// A square company tile with letters. Decorative: the company name is always written next to it.
export default function CompanyMonogram({ name, size = 48 }: { name: string; size?: number }) {
  const { letters, hue } = monogramFor(name);
  return (
    <span
      aria-hidden="true"
      className="dw-monogram"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.4,
        background: `linear-gradient(145deg, hsl(${hue} 55% 34%), hsl(${(hue + 40) % 360} 60% 22%))`,
      }}
    >
      {letters}
    </span>
  );
}
