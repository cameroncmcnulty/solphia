import fs from "fs";
import path from "path";
import { PNG } from "pngjs";

const srcPath = process.argv[2];
const outDir = path.join(process.cwd(), "public");
const src = PNG.sync.read(fs.readFileSync(srcPath));

let minX = src.width;
let minY = src.height;
let maxX = 0;
let maxY = 0;
for (let y = 0; y < src.height; y++) {
  for (let x = 0; x < src.width; x++) {
    const i = (src.width * y + x) * 4;
    if (Math.max(src.data[i], src.data[i + 1], src.data[i + 2]) > 14) {
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
}

const bw = maxX - minX + 1;
const bh = maxY - minY + 1;
const pad = Math.round(Math.max(bw, bh) * 0.12);
const side = Math.max(bw, bh) + pad * 2;
const mark = new PNG({ width: side, height: side, colorType: 6 });
const ox = Math.floor((side - bw) / 2);
const oy = Math.floor((side - bh) / 2);

for (let y = 0; y < bh; y++) {
  for (let x = 0; x < bw; x++) {
    const si = ((minY + y) * src.width + (minX + x)) * 4;
    const r = src.data[si];
    const g = src.data[si + 1];
    const b = src.data[si + 2];
    const peak = Math.max(r, g, b);
    const di = ((oy + y) * side + (ox + x)) * 4;
    if (peak < 12) {
      mark.data[di + 3] = 0;
      continue;
    }
    mark.data[di] = r;
    mark.data[di + 1] = g;
    mark.data[di + 2] = b;
    mark.data[di + 3] = peak < 28 ? Math.min(255, peak * 8) : 255;
  }
}

function scaleBox(img, size) {
  const out = new PNG({ width: size, height: size, colorType: 6 });
  const scale = img.width / size;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const x0 = Math.floor(x * scale);
      const y0 = Math.floor(y * scale);
      const x1 = Math.min(img.width, Math.ceil((x + 1) * scale));
      const y1 = Math.min(img.height, Math.ceil((y + 1) * scale));
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      let n = 0;
      for (let yy = y0; yy < y1; yy++) {
        for (let xx = x0; xx < x1; xx++) {
          const i = (yy * img.width + xx) * 4;
          const aa = img.data[i + 3] / 255;
          r += img.data[i] * aa;
          g += img.data[i + 1] * aa;
          b += img.data[i + 2] * aa;
          a += aa;
          n++;
        }
      }
      const di = (y * size + x) * 4;
      if (a < 0.001) continue;
      out.data[di] = Math.round(r / a);
      out.data[di + 1] = Math.round(g / a);
      out.data[di + 2] = Math.round(b / a);
      out.data[di + 3] = Math.round((a / n) * 255);
    }
  }
  return out;
}

function onVoid(img, size) {
  const out = new PNG({ width: size, height: size, colorType: 6 });
  const scaled = scaleBox(img, size);
  for (let i = 0; i < size * size; i++) {
    const a = scaled.data[i * 4 + 3] / 255;
    out.data[i * 4] = Math.round(4 * (1 - a) + scaled.data[i * 4] * a);
    out.data[i * 4 + 1] = Math.round(0 * (1 - a) + scaled.data[i * 4 + 1] * a);
    out.data[i * 4 + 2] = Math.round(10 * (1 - a) + scaled.data[i * 4 + 2] * a);
    out.data[i * 4 + 3] = 255;
  }
  return out;
}

fs.writeFileSync(path.join(outDir, "spha-mark.png"), PNG.sync.write(mark));
fs.writeFileSync(path.join(outDir, "favicon.png"), PNG.sync.write(scaleBox(mark, 64)));
fs.writeFileSync(path.join(outDir, "icon-192.png"), PNG.sync.write(scaleBox(mark, 192)));
fs.writeFileSync(path.join(outDir, "icon-512.png"), PNG.sync.write(scaleBox(mark, 512)));
fs.writeFileSync(path.join(outDir, "apple-touch-icon.png"), PNG.sync.write(onVoid(mark, 180)));
console.log("wrote spha-mark", side, "from bbox", bw, bh);
