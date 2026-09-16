import fs from "node:fs";
import path from "node:path";
import { PNG } from "pngjs";

function isVoid(r, g, b) {
  const mx = Math.max(r, g, b);
  const teal = g >= r + 3 && g >= 10;
  if (teal) return false;
  return mx < 14;
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
  let sx = 0;
  let sy = 0;
  let cnt = 0;
  for (let i = 0; i < n; i++) {
    if (bg[i]) continue;
    const p = i * 4;
    if (Math.max(data[p], data[p + 1], data[p + 2]) < 40) continue;
    sx += i % w;
    sy += (i / w) | 0;
    cnt++;
  }
  const cx = cnt ? sx / cnt : w / 2;
  const cy = cnt ? sy / cnt : h / 2;
  const rx = 0.36 * w;
  const ry = 0.56 * h;
  for (let i = 0; i < n; i++) {
    const p = i * 4;
    if (bg[i]) continue;
    const x = i % w;
    const y = (i / w) | 0;
    const dx = (x - cx) / rx;
    const dy = (y - cy) / ry;
    if (dx * dx + dy * dy <= 1) {
      data[p + 3] = 255;
      continue;
    }
    const mx = Math.max(data[p], data[p + 1], data[p + 2]);
    if (mx >= 48) {
      data[p + 3] = 255;
      continue;
    }
    data[p + 3] = Math.max(0, Math.min(150, Math.round(mx * 4.2)));
  }
  fs.writeFileSync(abs, PNG.sync.write(png));
  let clear = 0;
  for (let i = 3; i < data.length; i += 4) if (data[i] === 0) clear++;
  console.log(path.basename(abs), w + "x" + h, "void", ((clear / n) * 100).toFixed(1) + "%");
}

const files = process.argv.slice(2);
if (!files.length) {
  console.error("usage: knockout-void.mjs <png...>");
  process.exit(1);
}
for (const f of files) knockout(f);
