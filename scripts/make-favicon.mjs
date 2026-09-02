import fs from "fs";
import path from "path";
import { PNG } from "pngjs";

const src = path.join(process.cwd(), "public", "solphia-face.png");
const buf = fs.readFileSync(src);
const img = PNG.sync.read(buf);
const { width: w, height: h, data } = img;

function lumAt(i) {
  return data[i] * 0.21 + data[i + 1] * 0.72 + data[i + 2] * 0.07;
}

for (let i = 0; i < data.length; i += 4) {
  const lum = lumAt(i);
  if (lum < 22) data[i + 3] = 0;
  else if (lum < 48) data[i + 3] = Math.round(((lum - 22) / 26) * 255);
}

function alpha(x, y) {
  if (x < 0 || y < 0 || x >= w || y >= h) return 0;
  return data[(y * w + x) * 4 + 3];
}

let top = h;
for (let y = 0; y < h; y++) {
  for (let x = 0; x < w; x++) {
    if (alpha(x, y) > 24) {
      top = y;
      y = h;
      break;
    }
  }
}

const probe = Math.max(40, Math.round(h * 0.2));
let hx0 = w;
let hx1 = 0;
for (let y = top; y < Math.min(h, top + probe); y++) {
  for (let x = 0; x < w; x++) {
    if (alpha(x, y) > 24) {
      if (x < hx0) hx0 = x;
      if (x > hx1) hx1 = x;
    }
  }
}
const headW = Math.max(1, hx1 - hx0 + 1);
const cx = Math.round((hx0 + hx1) / 2);

// Walk down the head. Neck is where the opaque span gets clearly narrower than the temples.
let chin = Math.min(h - 1, top + Math.round(headW * 1.55));
for (let y = top + Math.round(headW * 0.7); y < Math.min(h - 1, top + Math.round(headW * 1.7)); y++) {
  let lo = w;
  let hi = 0;
  for (let x = Math.max(0, cx - headW); x < Math.min(w, cx + headW); x++) {
    if (alpha(x, y) > 24) {
      if (x < lo) lo = x;
      if (x > hi) hi = x;
    }
  }
  const span = hi >= lo ? hi - lo + 1 : 0;
  if (span > 0 && span < headW * 0.62) {
    chin = y;
    break;
  }
}

const contentH = chin - top + 1;
const contentW = headW;
// Shrink her inside the square so circular/browser chrome doesn't clip the chin.
const pad = Math.round(Math.max(contentW, contentH) * 0.22);
const side = Math.max(contentW, contentH) + pad * 2;
const square = new PNG({ width: side, height: side, colorType: 6 });
square.data.fill(0);

const ox = Math.round((side - contentW) / 2);
const oy = Math.round((side - contentH) / 2);
const srcX = Math.max(0, cx - Math.floor(contentW / 2));

for (let y = 0; y < contentH; y++) {
  for (let x = 0; x < contentW; x++) {
    const sx = srcX + x;
    const sy = top + y;
    if (sx < 0 || sy < 0 || sx >= w || sy >= h) continue;
    const si = (sy * w + sx) * 4;
    const di = ((oy + y) * side + (ox + x)) * 4;
    square.data[di] = data[si];
    square.data[di + 1] = data[si + 1];
    square.data[di + 2] = data[si + 2];
    square.data[di + 3] = data[si + 3];
  }
}

// Soft circular fade so round favicon masks don't hard-clip.
const r = side * 0.48;
const rInner = r * 0.82;
const mid = (side - 1) / 2;
for (let y = 0; y < side; y++) {
  for (let x = 0; x < side; x++) {
    const d = Math.hypot(x - mid, y - mid);
    const i = (y * side + x) * 4;
    if (d >= r) {
      square.data[i + 3] = 0;
    } else if (d > rInner) {
      const t = 1 - (d - rInner) / (r - rInner);
      square.data[i + 3] = Math.round(square.data[i + 3] * t);
    }
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
console.log("wrote padded face favicon", { headW, contentH, side, top, chin, pad });
