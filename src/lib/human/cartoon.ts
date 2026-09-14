import { KNOB, PIECE, PUZZLE_H, PUZZLE_W, rng } from "./puzzle";

function pick<T>(n: () => number, xs: T[]): T {
  return xs[Math.floor(n() * xs.length)];
}

function lerp(a: string, b: string, t: number): string {
  const h = (s: string) => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)];
  const A = h(a);
  const B = h(b);
  const m = (i: number) => Math.round(A[i] + (B[i] - A[i]) * t);
  return `rgb(${m(0)},${m(1)},${m(2)})`;
}

/** Rounded square with a right-side knob. Hole and piece share this path so they lock. */
export function piecePath(ctx: CanvasRenderingContext2D, x: number, y: number, size = PIECE, knob = KNOB) {
  const r = 10;
  const mid = y + size / 2;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + size - r, y);
  ctx.quadraticCurveTo(x + size, y, x + size, y + r);
  ctx.lineTo(x + size, mid - knob);
  ctx.arc(x + size, mid, knob, -Math.PI / 2, Math.PI / 2, false);
  ctx.lineTo(x + size, y + size - r);
  ctx.quadraticCurveTo(x + size, y + size, x + size - r, y + size);
  ctx.lineTo(x + r, y + size);
  ctx.quadraticCurveTo(x, y + size, x, y + size - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function hill(ctx: CanvasRenderingContext2D, w: number, h: number, y0: number, amp: number, color: string, n: () => number) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, h);
  ctx.lineTo(0, y0);
  ctx.quadraticCurveTo(w * 0.25, y0 - amp - n() * 16, w * 0.5, y0 + 8);
  ctx.quadraticCurveTo(w * 0.75, y0 - amp * 0.7, w, y0 + 6);
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fill();
}

function tree(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, leaf: string, trunk: string) {
  ctx.fillStyle = trunk;
  ctx.fillRect(x - s * 0.12, y - s * 0.15, s * 0.24, s * 0.4);
  ctx.fillStyle = leaf;
  ctx.beginPath();
  ctx.moveTo(x, y - s);
  ctx.lineTo(x + s * 0.55, y - s * 0.12);
  ctx.lineTo(x - s * 0.55, y - s * 0.12);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x, y - s * 0.72);
  ctx.lineTo(x + s * 0.42, y - s * 0.02);
  ctx.lineTo(x - s * 0.42, y - s * 0.02);
  ctx.closePath();
  ctx.fill();
}

function cabin(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, wall: string, roof: string) {
  ctx.fillStyle = wall;
  ctx.fillRect(x, y, s, s * 0.7);
  ctx.fillStyle = roof;
  ctx.beginPath();
  ctx.moveTo(x - s * 0.12, y + 2);
  ctx.lineTo(x + s / 2, y - s * 0.45);
  ctx.lineTo(x + s + s * 0.12, y + 2);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#1b1024";
  ctx.fillRect(x + s * 0.4, y + s * 0.28, s * 0.22, s * 0.42);
}

/** Randomized scenery. Same seed always paints the same landscape. */
export function drawCartoonScene(ctx: CanvasRenderingContext2D, seed: string, w = PUZZLE_W, h = PUZZLE_H) {
  const n = rng(seed);
  const palettes = [
    { sky: "#1a1038", sky2: "#ff7aa2", sun: "#ffe08a", hill: "#24143a", hill2: "#14F195", leaf: "#0b3d2a", trunk: "#3a2410", cabin: "#c98a62", roof: "#6b2040" },
    { sky: "#071a2c", sky2: "#80eaff", sun: "#fff4c8", hill: "#0b2a22", hill2: "#1a6b4a", leaf: "#14F195", trunk: "#2a1810", cabin: "#e8b894", roof: "#9945ff" },
    { sky: "#2a0c18", sky2: "#ffb020", sun: "#fff1c2", hill: "#3a1020", hill2: "#9945ff", leaf: "#5eead4", trunk: "#1b1024", cabin: "#f6d0b1", roof: "#14F195" },
    { sky: "#04000a", sky2: "#9945ff", sun: "#c9a8ff", hill: "#12081c", hill2: "#2a1450", leaf: "#80eaff", trunk: "#3a2c12", cabin: "#8d5a3a", roof: "#ff7aa2" },
  ];
  const p = pick(n, palettes);
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, p.sky);
  g.addColorStop(0.55, lerp(p.sky, p.sky2, 0.55));
  g.addColorStop(1, p.sky2);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  const sunX = 70 + n() * (w - 140);
  const sunY = 48 + n() * 36;
  const glow = ctx.createRadialGradient(sunX, sunY, 6, sunX, sunY, 70);
  glow.addColorStop(0, p.sun);
  glow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(sunX, sunY, 70, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = p.sun;
  ctx.beginPath();
  ctx.arc(sunX, sunY, 18 + n() * 8, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalAlpha = 0.55;
  for (let i = 0; i < 22; i++) {
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(n() * w, n() * h * 0.42, 0.7 + n() * 1.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  if (n() > 0.35) {
    ctx.fillStyle = "rgba(255,255,255,0.22)";
    for (let i = 0; i < 3; i++) {
      const cx = n() * w;
      const cy = 28 + n() * 40;
      ctx.beginPath();
      ctx.ellipse(cx, cy, 28 + n() * 18, 12 + n() * 6, 0, 0, Math.PI * 2);
      ctx.ellipse(cx + 22, cy + 4, 22, 10, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  hill(ctx, w, h, h * 0.56, 36, p.hill, n);
  hill(ctx, w, h, h * 0.68, 28, p.hill2, n);

  const ground = h * 0.78;
  ctx.fillStyle = lerp(p.hill2, "#04140f", 0.35);
  ctx.fillRect(0, ground, w, h - ground);
  ctx.fillStyle = "rgba(20,241,149,0.18)";
  ctx.beginPath();
  ctx.moveTo(0, h);
  ctx.quadraticCurveTo(w * 0.4, ground - 8, w, h);
  ctx.fill();

  for (let i = 0; i < 7; i++) {
    tree(ctx, 30 + i * (w / 7) + n() * 18, ground + 6, 28 + n() * 22, p.leaf, p.trunk);
  }
  if (n() > 0.4) cabin(ctx, w * (0.55 + n() * 0.2), ground - 28, 36 + n() * 10, p.cabin, p.roof);

  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.lineWidth = 7;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(0, h - 18);
  ctx.quadraticCurveTo(w * 0.45, ground + 18, w, h - 10);
  ctx.stroke();
}

export function paintPuzzle(
  view: HTMLCanvasElement,
  scene: HTMLCanvasElement,
  opts: { targetX: number; targetY: number; slideX: number },
) {
  const ctx = view.getContext("2d");
  if (!ctx) return;
  const w = view.width;
  const h = view.height;
  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(scene, 0, 0, w, h);

  ctx.save();
  piecePath(ctx, opts.targetX, opts.targetY);
  ctx.fillStyle = "rgba(4,0,10,0.55)";
  ctx.fill();
  ctx.strokeStyle = "rgba(20,241,149,0.85)";
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.45)";
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 3;
  piecePath(ctx, opts.slideX, opts.targetY);
  ctx.clip();
  ctx.drawImage(scene, opts.slideX - opts.targetX, 0);
  ctx.restore();

  ctx.save();
  piecePath(ctx, opts.slideX, opts.targetY);
  ctx.strokeStyle = "rgba(255,255,255,0.55)";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}
