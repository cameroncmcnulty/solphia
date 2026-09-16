import fs from "node:fs";
import path from "node:path";
import { PNG } from "pngjs";

function isVoid(r, g, b) {
  const mx = Math.max(r, g, b);
  const teal = g >= r + 3 && g >= 10;
  if (teal) return false;
  return mx < 14;
}

function padTransparent(png, fracX, fracY) {
  const pl = Math.round(png.width * fracX);
  const pr = pl;
  const pt = Math.round(png.height * fracY);
  const pb = Math.round(png.height * fracY * 0.35);
  const out = new PNG({ width: png.width + pl + pr, height: png.height + pt + pb, colorType: 6 });
  PNG.bitblt(png, out, 0, 0, png.width, png.height, pl, pt);
  return out;
}

function knockout(file) {
  const abs = path.resolve(file);
  const png = PNG.sync.read(fs.readFileSync(abs));
  const { width: w, height: h, data } = png;
  const n = w * h;
  const bg = new Uint8Array(n);
  const q = new Uint32Array(n);
  let qh = 0;
  let qt = 0;
  const push = (x, y) => {
    const i = y * w + x;
    if (bg[i]) return;
    const p = i * 4;
    if (!isVoid(data[p], data[p + 1], data[p + 2])) return;
    bg[i] = 1;
    q[qt++] = i;
  };
  for (let x = 0; x < w; x++) {
    push(x, 0);
    push(x, h - 1);
  }
  for (let y = 0; y < h; y++) {
    push(0, y);
    push(w - 1, y);
  }
  while (qh < qt) {
    const i = q[qh++];
    const x = i % w;
    const y = (i / w) | 0;
    if (x > 0) push(x - 1, y);
    if (x + 1 < w) push(x + 1, y);
    if (y > 0) push(x, y - 1);
    if (y + 1 < h) push(x, y + 1);
  }
  for (let i = 0; i < n; i++) {
    const p = i * 4;
    if (bg[i]) {
      data[p] = 0;
      data[p + 1] = 0;
      data[p + 2] = 0;
      data[p + 3] = 0;
    }
  }
  const body = path.basename(abs).includes("body");
  const cx = 0.5 * w;
  const cy = body ? 0.46 * h : 0.5 * h;
  const rx = (body ? 0.34 : 0.22) * w;
  const ry = (body ? 0.52 : 0.4) * h;
  for (let i = 0; i < n; i++) {
    const p = i * 4;
    if (bg[i]) continue;
    const x = i % w;
    const y = (i / w) | 0;
    const dx = (x - cx) / rx;
    const dy = (y - cy) / ry;
    const mx = Math.max(data[p], data[p + 1], data[p + 2]);
    const face = dx * dx + dy * dy <= 1 && y > h * 0.22;
    if (face || mx >= 52) {
      data[p + 3] = 255;
      continue;
    }
    data[p + 3] = Math.max(0, Math.min(140, Math.round(mx * 3.6)));
  }
  const base = path.basename(abs);
  const padded =
    base === "solphia-face.png" ? png : padTransparent(png, 0.14, 0.05);
  fs.writeFileSync(abs, PNG.sync.write(padded));
  let clear = 0;
  for (let i = 3; i < padded.data.length; i += 4) if (padded.data[i] === 0) clear++;
  console.log(base, padded.width + "x" + padded.height, "void", ((clear / (padded.width * padded.height)) * 100).toFixed(1) + "%");
}

const files = process.argv.slice(2);
if (!files.length) {
  console.error("usage: knockout-void.mjs <png...>");
  process.exit(1);
}
for (const f of files) knockout(f);
