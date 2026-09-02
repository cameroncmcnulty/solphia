import fs from "fs";
import path from "path";
import { PNG } from "pngjs";

const src = path.join(process.cwd(), "public", "solphia-face.png");
const img = PNG.sync.read(fs.readFileSync(src));
const { width, height, data } = img;

for (let i = 0; i < data.length; i += 4) {
  const lum = data[i] * 0.21 + data[i + 1] * 0.72 + data[i + 2] * 0.07;
  if (lum < 18) {
    data[i + 3] = 0;
  } else if (lum < 42) {
    data[i + 3] = Math.round(((lum - 18) / 24) * data[i + 3]);
  }
}

const out = path.join(process.cwd(), "public", "solphia-face-alpha.png");
fs.writeFileSync(out, PNG.sync.write(img));
console.log("wrote", out, { width, height });
