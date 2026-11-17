import { monogramFor } from "@/lib/dwaar/monogram";

// A square company tile with letters. Decorative: the company name is always written next to it.
export default function CompanyMonogram({ name, size = 48 }: { name: string; size?: number }) {
  const { letters, hue } = monogramFor(name);
  return (
    <span
      aria-hidden="true"
      className="dw-monogram"
      style={{ width: size, height: size, fontSize: size * 0.38, background: `hsl(${hue} 36% 30%)` }}
    >
      {letters}
    </span>
  );
}
