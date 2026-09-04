import fs from "fs";
import path from "path";
import { PNG } from "pngjs";

const srcPath = path.join(process.cwd(), "public", "solphia-face-full.png");
const rawPath = path.join(process.cwd(), "public", "solphia-face.png");
if (!fs.existsSync(srcPath)) fs.copyFileSync(rawPath, srcPath);

const img = PNG.sync.read(fs.readFileSync(srcPath));
const { width: w, height: h, data } = img;

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}
function smooth(t) {
  t = clamp(t, 0, 1);
  return t * t * (3 - 2 * t);
}

const fadeY0 = h * 0.6;
const cx = w * 0.5;
const cy = h * 0.36;
const rx = w * 0.46;
const ry = h * 0.5;

for (let y = 0; y < h; y++) {
  for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4;
    let a = 1;

    if (y > fadeY0) {
      a *= 1 - smooth((y - fadeY0) / (h - fadeY0));
    }

    const nx = (x - cx) / rx;
    const ny = (y - cy) / ry;
    const r = Math.sqrt(nx * nx + ny * ny);
    if (r > 0.7) {
      a *= 1 - smooth((r - 0.7) / 0.55);
    }

    data[i + 3] = Math.round(data[i + 3] * clamp(a, 0, 1));
  }
}

const out = path.join(process.cwd(), "public", "solphia-hero.png");
fs.writeFileSync(out, PNG.sync.write(img));
console.log("wrote", out, { w, h, fadeY0: Math.round(fadeY0) });
