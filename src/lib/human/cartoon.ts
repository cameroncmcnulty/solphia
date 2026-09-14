import { PIECE, PUZZLE_H, PUZZLE_W, rng } from "./puzzle";

function pick<T>(n: () => number, xs: T[]): T {
  return xs[Math.floor(n() * xs.length)];
}

function blob(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(x, y, r * 0.9, r, 0, 0, Math.PI * 2);
  ctx.fill();
}

function character(ctx: CanvasRenderingContext2D, n: () => number, x: number, y: number, scale: number) {
  const skin = pick(n, ["#f6d0b1", "#e8b894", "#c98a62", "#8d5a3a", "#fbe0c8"]);
  const hair = pick(n, ["#1b1024", "#4a2c12", "#c45c1a", "#f2d36b", "#14F195", "#80eaff", "#9945ff"]);
  const shirt = pick(n, ["#14F195", "#9945ff", "#ff7aa2", "#80eaff", "#ffb020", "#04000a"]);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.fillStyle = shirt;
  ctx.beginPath();
  ctx.ellipse(0, 22, 16, 14, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.arc(0, 0, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = hair;
  ctx.beginPath();
  const kind = Math.floor(n() * 3);
  if (kind === 0) ctx.ellipse(0, -8, 16, 10, 0, Math.PI, 0);
  else if (kind === 1) ctx.arc(0, -2, 16, Math.PI, 0);
  else {
    ctx.moveTo(-14, 2);
    ctx.quadraticCurveTo(-18, -18, 0, -16);
    ctx.quadraticCurveTo(18, -18, 14, 2);
  }
  ctx.fill();
  ctx.fillStyle = "#14081c";
  ctx.beginPath();
  ctx.arc(-5, 0, 2.2, 0, Math.PI * 2);
  ctx.arc(5, 0, 2.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(-4.2, -0.8, 0.8, 0, Math.PI * 2);
  ctx.arc(5.8, -0.8, 0.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#5a2040";
  ctx.lineWidth = 1.6;
  ctx.lineCap = "round";
  ctx.beginPath();
  if (n() > 0.3) ctx.arc(0, 4, 5, 0.15 * Math.PI, 0.85 * Math.PI);
  else ctx.moveTo(-4, 6), ctx.lineTo(4, 6);
  ctx.stroke();
  if (n() > 0.45) {
    ctx.fillStyle = "rgba(255,122,162,0.45)";
    ctx.beginPath();
    ctx.ellipse(-9, 6, 3.2, 1.8, 0, 0, Math.PI * 2);
    ctx.ellipse(9, 6, 3.2, 1.8, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  if (n() > 0.7) {
    ctx.fillStyle = pick(n, ["#14F195", "#9945ff", "#ffb020", "#04000a"]);
    ctx.beginPath();
    ctx.moveTo(-12, -10);
    ctx.lineTo(12, -10);
    ctx.lineTo(8, -18);
    ctx.lineTo(-8, -18);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function rocket(ctx: CanvasRenderingContext2D, x: number, y: number, rot: number, color: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, -16);
  ctx.lineTo(8, 10);
  ctx.lineTo(-8, 10);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#ff7aa2";
  ctx.beginPath();
  ctx.moveTo(-6, 10);
  ctx.lineTo(0, 20);
  ctx.lineTo(6, 10);
  ctx.fill();
  ctx.restore();
}

function coin(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.fillStyle = "#ffb020";
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#ffe08a";
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = "#6b3d00";
  ctx.font = `bold ${Math.round(r)}px Syne, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("S", x, y + 1);
}

/** Full scene. Same seed always draws the same cartoon. */
export function drawCartoonScene(ctx: CanvasRenderingContext2D, seed: string, w = PUZZLE_W, h = PUZZLE_H) {
  const n = rng(seed);
  const sky = pick(n, ["#1b0b33", "#071a28", "#04140f", "#2a1038", "#0b1d3a"]);
  const sky2 = pick(n, ["#14F195", "#80eaff", "#9945ff", "#ff7aa2", "#ffb020"]);
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, sky);
  g.addColorStop(1, sky2);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  ctx.globalAlpha = 0.35;
  for (let i = 0; i < 18; i++) {
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(n() * w, n() * h * 0.55, 0.8 + n() * 1.6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  ctx.fillStyle = pick(n, ["#ffe08a", "#80eaff", "#ffb020"]);
  ctx.beginPath();
  ctx.arc(30 + n() * (w - 60), 28 + n() * 24, 16 + n() * 10, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = pick(n, ["#0d0820", "#052014", "#1a0830"]);
  ctx.beginPath();
  ctx.moveTo(0, h);
  ctx.quadraticCurveTo(w * 0.25, h - 50 - n() * 30, w * 0.5, h - 28);
  ctx.quadraticCurveTo(w * 0.78, h - 70 - n() * 20, w, h - 22);
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fill();

  const count = 2 + Math.floor(n() * 2);
  for (let i = 0; i < count; i++) {
    character(ctx, n, 50 + i * 90 + n() * 24, 108 + n() * 18, 0.85 + n() * 0.35);
  }
  if (n() > 0.4) rocket(ctx, 40 + n() * (w - 80), 40 + n() * 40, -0.4 + n() * 0.8, pick(n, ["#14F195", "#80eaff", "#c9a8ff"]));
  if (n() > 0.35) coin(ctx, 80 + n() * (w - 120), 50 + n() * 50, 10 + n() * 6);
  if (n() > 0.5) {
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    blob(ctx, n() * w, 36 + n() * 20, 18 + n() * 12, "rgba(255,255,255,0.16)");
    blob(ctx, n() * w, 44 + n() * 16, 14 + n() * 10, "rgba(255,255,255,0.12)");
  }
}

export function piecePath(ctx: CanvasRenderingContext2D, x: number, y: number, size = PIECE) {
  const r = 8;
  const tab = 10;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + size - r, y);
  ctx.quadraticCurveTo(x + size, y, x + size, y + r);
  ctx.lineTo(x + size, y + size / 2 - tab);
  ctx.arc(x + size + tab * 0.15, y + size / 2, tab, -Math.PI * 0.7, Math.PI * 0.7);
  ctx.lineTo(x + size, y + size - r);
  ctx.quadraticCurveTo(x + size, y + size, x + size - r, y + size);
  ctx.lineTo(x + r, y + size);
  ctx.quadraticCurveTo(x, y + size, x, y + size - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export function cutPiece(scene: HTMLCanvasElement, x: number, y: number, size = PIECE): HTMLCanvasElement {
  const out = document.createElement("canvas");
  out.width = size + 16;
  out.height = size;
  const ctx = out.getContext("2d");
  if (!ctx) return out;
  ctx.save();
  piecePath(ctx, 0, 0, size);
  ctx.clip();
  ctx.drawImage(scene, -x, -y);
  ctx.restore();
  return out;
}
