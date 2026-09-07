import fs from "fs";
import path from "path";
import { PNG } from "pngjs";

const VOID = { r: 4, g: 0, b: 10, a: 255 };

export function loadPng(file: string): PNG {
  const abs = path.isAbsolute(file) ? file : path.join(process.cwd(), "public", file);
  return PNG.sync.read(fs.readFileSync(abs));
}

export function encodePng(png: PNG): Buffer {
  return PNG.sync.write(png);
}

export function blank(width: number, height: number, fill = VOID): PNG {
  const png = new PNG({ width, height, colorType: 6 });
  for (let i = 0; i < png.data.length; i += 4) {
    png.data[i] = fill.r;
    png.data[i + 1] = fill.g;
    png.data[i + 2] = fill.b;
    png.data[i + 3] = fill.a;
  }
  return png;
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

/** Bilinear sample. Same scale on X and Y — never stretch. */
function sample(src: PNG, x: number, y: number): [number, number, number, number] {
  const x0 = clamp(Math.floor(x), 0, src.width - 1);
  const y0 = clamp(Math.floor(y), 0, src.height - 1);
  const x1 = clamp(x0 + 1, 0, src.width - 1);
  const y1 = clamp(y0 + 1, 0, src.height - 1);
  const fx = x - x0;
  const fy = y - y0;
  const mix = (a: number, b: number, t: number) => a + (b - a) * t;
  const p = (ix: number, iy: number) => {
    const i = (iy * src.width + ix) * 4;
    return [src.data[i], src.data[i + 1], src.data[i + 2], src.data[i + 3]] as const;
  };
  const a = p(x0, y0);
  const b = p(x1, y0);
  const c = p(x0, y1);
  const d = p(x1, y1);
  return [
    mix(mix(a[0], b[0], fx), mix(c[0], d[0], fx), fy),
    mix(mix(a[1], b[1], fx), mix(c[1], d[1], fx), fy),
    mix(mix(a[2], b[2], fx), mix(c[2], d[2], fx), fy),
    mix(mix(a[3], b[3], fx), mix(c[3], d[3], fx), fy),
  ];
}

function blitUniform(
  src: PNG,
  dest: PNG,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
  scale: number,
  ox: number,
  oy: number,
) {
  for (let y = 0; y < dh; y++) {
    for (let x = 0; x < dw; x++) {
      const [r, g, b, a] = sample(src, (x + ox) / scale, (y + oy) / scale);
      const i = ((dy + y) * dest.width + (dx + x)) * 4;
      dest.data[i] = r;
      dest.data[i + 1] = g;
      dest.data[i + 2] = b;
      dest.data[i + 3] = a;
    }
  }
}

/** Cover-crop into dest box. Uniform scale — no stretch. */
export function coverBlit(
  src: PNG,
  dest: PNG,
  box: { x: number; y: number; w: number; h: number },
  cropX: number,
  cropY: number,
) {
  const scale = Math.max(box.w / src.width, box.h / src.height);
  const sw = src.width * scale;
  const sh = src.height * scale;
  const ox = (cropX / 100) * Math.max(0, sw - box.w);
  const oy = (cropY / 100) * Math.max(0, sh - box.h);
  blitUniform(src, dest, box.x, box.y, box.w, box.h, scale, ox, oy);
  return { scale };
}

/** Fit inside dest box, letterbox the rest. Uniform scale — no stretch. */
export function containBlit(
  src: PNG,
  dest: PNG,
  box: { x: number; y: number; w: number; h: number },
  cropX: number,
  cropY: number,
) {
  const scale = Math.min(box.w / src.width, box.h / src.height);
  const dw = Math.round(src.width * scale);
  const dh = Math.round(src.height * scale);
  const extraX = Math.max(0, box.w - dw);
  const extraY = Math.max(0, box.h - dh);
  const dx = box.x + Math.round((cropX / 100) * extraX);
  const dy = box.y + Math.round((cropY / 100) * extraY);
  blitUniform(src, dest, dx, dy, dw, dh, scale, 0, 0);
  return { scale, dx, dy, dw, dh };
}

export function flatten(base: PNG, over: PNG): PNG {
  const w = Math.min(base.width, over.width);
  const h = Math.min(base.height, over.height);
  const out = blank(base.width, base.height);
  out.data.set(base.data);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * base.width + x) * 4;
      const j = (y * over.width + x) * 4;
      const a = over.data[j + 3] / 255;
      if (a <= 0) continue;
      const ia = 1 - a;
      out.data[i] = Math.round(over.data[j] * a + out.data[i] * ia);
      out.data[i + 1] = Math.round(over.data[j + 1] * a + out.data[i + 1] * ia);
      out.data[i + 2] = Math.round(over.data[j + 2] * a + out.data[i + 2] * ia);
      out.data[i + 3] = 255;
    }
  }
  return out;
}
