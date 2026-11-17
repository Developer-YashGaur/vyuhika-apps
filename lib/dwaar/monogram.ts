// A company "logo tile" made from the company name: one or two letters on a calm colour.
// We never use real company logos. The same name always gives the same tile.

export type Monogram = { letters: string; hue: number };

export function monogramFor(name: string): Monogram {
  const words = name
    .normalize("NFKD")
    .replace(/[^A-Za-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  let letters = "?";
  if (words.length >= 2) letters = words[0][0] + words[1][0];
  else if (words.length === 1) letters = words[0].slice(0, 2);

  // Simple hash to a hue (0-359). Same name, same colour.
  let hash = 0;
  for (const ch of name.trim().toLowerCase()) hash = (hash * 31 + ch.charCodeAt(0)) % 360;
  return { letters: letters.toUpperCase(), hue: hash };
}

// Visitor pass number, like "#0412", made from the request id so it stays the same.
export function passNumber(id: string): string {
  const hex = id.replace(/[^0-9a-f]/gi, "").slice(0, 6);
  const n = hex ? parseInt(hex, 16) % 10000 : 0;
  return `#${String(n).padStart(4, "0")}`;
}
