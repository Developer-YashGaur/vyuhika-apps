// Draws the email header images and saves them in public/email/:
//   header.png  1200×400 (shown at 600×200, sharp on retina screens)
//   header.gif   600×200, a short loop where the glow behind the logo softly pulses
//                (the first frame is the brightest, so Outlook, which only shows the first frame, still looks good)
//
// Both show the Vyuhika Apps horizontal logo on a deep-space background with aurora glows and faint nodes.
// Run `npm run brand` first (it makes the logo), then: npm run email:images
// The drawing happens on a <canvas> in a headless browser (Playwright); sharp turns the frames into a GIF.

import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { chromium } from "playwright";
import sharp from "sharp";

const OUT = "public/email";
const LOGO = "public/brand/vyuhika-horizontal-color.svg";
const FRAMES = 14;
const FRAME_DELAY_MS = 110; // about 1.5 seconds per loop

// Runs inside the browser. Draws one frame at time t (0 to 1) onto a canvas of the given scale.
async function drawFrame({ t, scale, logoUrl, logoRatio }) {
  const W = 600;
  const H = 200;
  const canvas = document.getElementById("c");
  canvas.width = W * scale;
  canvas.height = H * scale;
  const ctx = canvas.getContext("2d");
  ctx.scale(scale, scale);

  // A tiny seeded random generator, so every frame has the same stars and nodes.
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

  // pulse is 1 at t = 0 (the first frame is the brightest) and 0 half way through the loop.
  const pulse = 0.5 + 0.5 * Math.cos(2 * Math.PI * t);

  ctx.fillStyle = "#050816";
  ctx.fillRect(0, 0, W, H);

  const glow = (x, y, r, color, alpha) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${color}, ${alpha})`);
    g.addColorStop(1, `rgba(${color}, 0)`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  };
  // Aurora: soft cyan on the left, violet on the right.
  glow(90, 30, 260, "34, 211, 238", 0.2);
  glow(520, 180, 280, "139, 92, 246", 0.26);

  // Faint network of nodes across the background.
  const nodes = Array.from({ length: 34 }, () => [rand() * W, rand() * H]);
  ctx.lineWidth = 0.6;
  nodes.forEach((a, i) =>
    nodes.slice(i + 1).forEach((b) => {
      const d = Math.hypot(a[0] - b[0], a[1] - b[1]);
      if (d > 85) return;
      ctx.strokeStyle = `rgba(34, 211, 238, ${0.14 * (1 - d / 85)})`;
      ctx.beginPath();
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(b[0], b[1]);
      ctx.stroke();
    }),
  );
  for (const [x, y] of nodes) {
    ctx.fillStyle = `rgba(238, 242, 251, ${0.25 + 0.2 * (0.5 + 0.5 * Math.sin(2 * Math.PI * (t + x / W)))})`;
    ctx.beginPath();
    ctx.arc(x, y, 1, 0, Math.PI * 2);
    ctx.fill();
  }

  // The logo, centred. Its icon is the square on the left (as wide as the logo is tall).
  const logoH = 76;
  const logoW = logoH * logoRatio;
  const lx = (W - logoW) / 2;
  const ly = (H - logoH) / 2;
  const iconCx = lx + logoH / 2;
  const iconCy = ly + (logoH * 31) / 64;
  const coreCy = ly + (logoH * 56) / 64;

  // Pulsing glow behind the icon and around its core node.
  glow(iconCx, iconCy, 70 + 16 * pulse, "139, 92, 246", 0.28 + 0.18 * pulse);
  glow(iconCx, coreCy, 26 + 10 * pulse, "34, 211, 238", 0.35 + 0.35 * pulse);

  const img = new Image();
  img.src = logoUrl;
  await img.decode();
  ctx.drawImage(img, lx, ly, logoW, logoH);
}

await mkdir(OUT, { recursive: true });
const logoSvg = await readFile(LOGO, "utf8");
const [, w, h] = logoSvg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
const logo = { logoUrl: `data:image/svg+xml;base64,${Buffer.from(logoSvg).toString("base64")}`, logoRatio: Number(w) / Number(h) };

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent('<body style="margin:0;background:#050816"><canvas id="c"></canvas></body>');
const canvas = page.locator("#c");

// 1. Still PNG at 2×, so it stays crisp on retina screens.
await page.evaluate(drawFrame, { t: 0, scale: 2, ...logo });
await writeFile(
  `${OUT}/header.png`,
  await sharp(await canvas.screenshot()).png({ compressionLevel: 9, palette: true, colours: 256, dither: 0.8 }).toBuffer(),
);

// 2. Animated GIF frames at 1× (keeps the file small).
const frames = [];
for (let i = 0; i < FRAMES; i++) {
  await page.evaluate(drawFrame, { t: i / FRAMES, scale: 1, ...logo });
  frames.push(await canvas.screenshot());
}
await browser.close();

await sharp(frames, { join: { animated: true } })
  .gif({ delay: Array(FRAMES).fill(FRAME_DELAY_MS), loop: 0, colours: 128, dither: 0.6, effort: 10 })
  .toFile(`${OUT}/header.gif`);

for (const name of ["header.png", "header.gif"]) {
  const { size } = await stat(`${OUT}/${name}`);
  const meta = await sharp(`${OUT}/${name}`, { animated: true }).metadata();
  console.log(`${name}: ${meta.width}×${meta.pageHeight ?? meta.height}, ${meta.pages ?? 1} frame(s), ${(size / 1024).toFixed(0)} KB`);
}
if ((await stat(`${OUT}/header.gif`)).size > 300 * 1024) {
  console.error("header.gif is over 300 KB: reduce FRAMES or colours.");
  process.exitCode = 1;
}
