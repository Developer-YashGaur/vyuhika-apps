// Draws the email header images and saves them in public/email/:
//   header.png  1200×400 (shown at 600×200, sharp on retina screens), used where animation isn't wanted
//   header.gif   600×200, a short loop of the orb softly pulsing (first frame is the brightest,
//                so Outlook, which only shows the first frame, still gets a good image)
//
// Run with: npm run email:images
// The drawing happens on a <canvas> in a headless browser (Playwright); sharp turns the frames into a GIF.

import { mkdir, stat, writeFile } from "node:fs/promises";
import { chromium } from "playwright";
import sharp from "sharp";

const OUT = "public/email";
const FRAMES = 14;
const FRAME_DELAY_MS = 110; // about 1.5 seconds per loop

// Runs inside the browser. Draws one frame at time t (0 to 1) onto a canvas of the given scale.
function drawFrame({ t, scale }) {
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

  // Deep-space background.
  ctx.fillStyle = "#050816";
  ctx.fillRect(0, 0, W, H);

  // Aurora: soft cyan on the left, violet on the right, a hint of magenta above the orb.
  const glow = (x, y, r, color, alpha) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${color}, ${alpha})`);
    g.addColorStop(1, `rgba(${color}, 0)`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  };
  glow(110, 40, 260, "34, 211, 238", 0.22);
  glow(500, 170, 280, "139, 92, 246", 0.28);
  glow(330, -20, 160, "232, 121, 249", 0.1);

  // Stars.
  for (let i = 0; i < 70; i++) {
    const x = rand() * W;
    const y = rand() * H;
    const twinkle = 0.25 + 0.5 * (0.5 + 0.5 * Math.sin(2 * Math.PI * (t + rand())));
    ctx.fillStyle = `rgba(238, 242, 251, ${twinkle * 0.6})`;
    ctx.beginPath();
    ctx.arc(x, y, rand() < 0.15 ? 1.1 : 0.6, 0, Math.PI * 2);
    ctx.fill();
  }

  // The neural orb: points on a sphere (tilted), projected onto the page.
  const cx = 300;
  const cy = 100;
  const R = 72;
  const points = [];
  const N = 64;
  for (let i = 0; i < N; i++) {
    const y = 1 - (i / (N - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const a = i * 2.399963 + 0.6; // golden angle spreads the points evenly
    const x = Math.cos(a) * r;
    let z = Math.sin(a) * r;
    // Tilt the sphere a little towards the viewer.
    const tilt = 0.45;
    const y2 = y * Math.cos(tilt) - z * Math.sin(tilt);
    z = y * Math.sin(tilt) + z * Math.cos(tilt);
    points.push({ x: cx + x * R, y: cy + y2 * R, z });
  }

  // Links between nearby points; links on the far side are fainter.
  ctx.lineWidth = 0.7;
  for (let i = 0; i < N; i++) {
    for (let j = i + 1; j < N; j++) {
      const a = points[i];
      const b = points[j];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (d > 34) continue;
      const depth = (a.z + b.z + 2) / 4; // 0 = far, 1 = near
      const alpha = (0.12 + 0.45 * depth) * (1 - d / 34) * (0.75 + 0.25 * pulse);
      const g = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
      g.addColorStop(0, `rgba(34, 211, 238, ${alpha})`);
      g.addColorStop(1, `rgba(139, 92, 246, ${alpha})`);
      ctx.strokeStyle = g;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
  }

  // Core glow, pulsing softly.
  const coreR = 58 + 14 * pulse;
  const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR);
  core.addColorStop(0, `rgba(255, 255, 255, ${0.75 + 0.2 * pulse})`);
  core.addColorStop(0.18, `rgba(34, 211, 238, ${0.55 + 0.25 * pulse})`);
  core.addColorStop(0.55, `rgba(139, 92, 246, ${0.22 + 0.12 * pulse})`);
  core.addColorStop(1, "rgba(139, 92, 246, 0)");
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(cx, cy, coreR, 0, Math.PI * 2);
  ctx.fill();

  // Nodes, brighter on the near side.
  for (const p of points) {
    const depth = (p.z + 1) / 2;
    ctx.fillStyle = `rgba(${depth > 0.5 ? "165, 243, 252" : "196, 181, 253"}, ${0.3 + 0.6 * depth})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 0.9 + 1.4 * depth, 0, Math.PI * 2);
    ctx.fill();
  }

  // Thin orbit ring around the orb.
  ctx.strokeStyle = `rgba(34, 211, 238, ${0.18 + 0.12 * pulse})`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(cx, cy, 128, 30, -0.12, 0, Math.PI * 2);
  ctx.stroke();
}

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent('<body style="margin:0;background:#050816"><canvas id="c"></canvas></body>');
const canvas = page.locator("#c");

// 1. Still PNG at 2×, so it stays crisp on retina screens.
await page.evaluate(drawFrame, { t: 0, scale: 2 });
await writeFile(`${OUT}/header.png`, await sharp(await canvas.screenshot()).png({ compressionLevel: 9, palette: true, colours: 256, dither: 0.8 }).toBuffer());

// 2. Animated GIF frames at 1× (keeps the file small).
const frames = [];
for (let i = 0; i < FRAMES; i++) {
  await page.evaluate(drawFrame, { t: i / FRAMES, scale: 1 });
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
