import fs from "fs";
import path from "path";
import { PNG } from "pngjs";

const src = path.join(process.cwd(), "public", "solphia-face.png");
const buf = fs.readFileSync(src);
const img = PNG.sync.read(buf);
const { width: w, height: h, data } = img;

for (let i = 0; i < data.length; i += 4) {
  const r = data[i];
  const g = data[i + 1];
  const b = data[i + 2];
  const lum = r * 0.21 + g * 0.72 + b * 0.07;
  if (lum < 22) data[i + 3] = 0;
  else if (lum < 48) data[i + 3] = Math.round(((lum - 22) / 26) * 255);
}

let top = h;
for (let y = 0; y < h; y++) {
  for (let x = 0; x < w; x++) {
    if (data[(y * w + x) * 4 + 3] > 24) {
      top = y;
      y = h;
      break;
    }
  }
}

// Head width from the top 38% of the figure — not the shoulders.
const headBand = Math.max(40, Math.round(h * 0.22));
let hx0 = w;
let hx1 = 0;
for (let y = top; y < Math.min(h, top + headBand); y++) {
  for (let x = 0; x < w; x++) {
    if (data[(y * w + x) * 4 + 3] > 24) {
      if (x < hx0) hx0 = x;
      if (x > hx1) hx1 = x;
    }
  }
}
const headW = Math.max(1, hx1 - hx0 + 1);
const cx = Math.round((hx0 + hx1) / 2);
// Crown → chin. Head width at the temples × 1.42 is a face square, not shoulders.
const side = Math.round(headW * 1.42);
let x0 = Math.round(cx - side / 2);
let y0 = Math.max(0, top - Math.round(side * 0.04));
if (x0 < 0) x0 = 0;
if (x0 + side > w) x0 = Math.max(0, w - side);
if (y0 + side > h) y0 = Math.max(0, h - side);

const square = new PNG({ width: side, height: side, colorType: 6 });
square.data.fill(0);
for (let y = 0; y < side; y++) {
  for (let x = 0; x < side; x++) {
    const sx = x0 + x;
    const sy = y0 + y;
    if (sx < 0 || sy < 0 || sx >= w || sy >= h) continue;
    const si = (sy * w + sx) * 4;
    const di = (y * side + x) * 4;
    square.data[di] = data[si];
    square.data[di + 1] = data[si + 1];
    square.data[di + 2] = data[si + 2];
    square.data[di + 3] = data[si + 3];
  }
}

function resize(srcPng, size) {
  const out = new PNG({ width: size, height: size, colorType: 6 });
  const sw = srcPng.width;
  const sh = srcPng.height;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const sx = Math.min(sw - 1, Math.floor((x + 0.5) * (sw / size)));
      const sy = Math.min(sh - 1, Math.floor((y + 0.5) * (sh / size)));
      const si = (sy * sw + sx) * 4;
      const di = (y * size + x) * 4;
      out.data[di] = srcPng.data[si];
      out.data[di + 1] = srcPng.data[si + 1];
      out.data[di + 2] = srcPng.data[si + 2];
      out.data[di + 3] = srcPng.data[si + 3];
    }
  }
  return out;
}

const outDir = path.join(process.cwd(), "public");
fs.writeFileSync(path.join(outDir, "favicon.png"), PNG.sync.write(resize(square, 64)));
fs.writeFileSync(path.join(outDir, "apple-touch-icon.png"), PNG.sync.write(resize(square, 180)));
fs.writeFileSync(path.join(outDir, "icon-192.png"), PNG.sync.write(resize(square, 192)));
fs.writeFileSync(path.join(outDir, "icon-512.png"), PNG.sync.write(resize(square, 512)));
fs.writeFileSync(path.join(outDir, "solphia-head.png"), PNG.sync.write(resize(square, 512)));
console.log("wrote face-square favicon", { headW, side, x0, y0, top });
