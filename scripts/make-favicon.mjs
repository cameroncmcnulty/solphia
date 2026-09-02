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
  if (lum < 22) {
    data[i + 3] = 0;
  } else if (lum < 48) {
    data[i + 3] = Math.round(((lum - 22) / 26) * 255);
  }
}

let minX = w,
  minY = h,
  maxX = 0,
  maxY = 0;
for (let y = 0; y < h; y++) {
  for (let x = 0; x < w; x++) {
    const a = data[(y * w + x) * 4 + 3];
    if (a > 24) {
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
}
const pad = Math.round((maxX - minX) * 0.06);
minX = Math.max(0, minX - pad);
maxX = Math.min(w - 1, maxX + pad);
minY = Math.max(0, minY - pad);
const bw = maxX - minX + 1;
const headH = Math.round(bw * 0.92);
maxY = Math.min(h - 1, minY + headH - 1);
const bh = maxY - minY + 1;
const side = Math.max(bw, bh);
const square = new PNG({ width: side, height: side, colorType: 6 });
square.data.fill(0);
const ox = Math.floor((side - bw) / 2);
const oy = Math.floor((side - bh) / 2);
for (let y = 0; y < bh; y++) {
  for (let x = 0; x < bw; x++) {
    const si = ((minY + y) * w + (minX + x)) * 4;
    const di = ((oy + y) * side + (ox + x)) * 4;
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
console.log("wrote favicon + apple-touch + icons", { bw, bh, side, minX, minY, maxX, maxY });
