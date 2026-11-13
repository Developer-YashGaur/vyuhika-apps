import Image from "next/image";
import { logoSrc, type LogoLayout, type LogoVariant } from "@/lib/brand/logo";
import { LOGO_SIZES } from "@/lib/brand/logo-sizes";

// The Vyuhika Apps logo. `size` is the height in pixels; the width follows the logo's shape.
// Pass `decorative` when nearby text already says what it is (it's then hidden from screen readers).
// `glow` adds a soft glow when a surrounding link is hovered or focused (see .logo-glow in globals.css).

type Props = {
  variant?: LogoLayout;
  tone?: LogoVariant;
  size?: number;
  label?: string;
  decorative?: boolean;
  glow?: boolean;
  priority?: boolean;
  className?: string;
};

export default function Logo({
  variant = "horizontal",
  tone = "color",
  size = 32,
  label = "Vyuhika Apps",
  decorative = false,
  glow = false,
  priority = false,
  className = "",
}: Props) {
  const natural = LOGO_SIZES[variant];
  const width = Math.round((size * natural.width) / natural.height);

  return (
    <Image
      src={logoSrc(variant, tone)}
      width={width}
      height={size}
      alt={decorative ? "" : label}
      aria-hidden={decorative || undefined}
      // SVGs don't need Next's image resizing, and must keep their exact shapes.
      unoptimized
      priority={priority}
      className={`${glow ? "logo-glow" : ""} ${className}`.trim()}
    />
  );
}
