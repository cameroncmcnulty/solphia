/** Deterministic niche PNG for each Tools campaign token. */
import { deflateSync } from "node:zlib";
import { createHash } from "node:crypto";

const W = 256;
const H = 256;

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]!) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const t = Buffer.from(type);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([len, t, data, crc]);
}

function hashBytes(seed: string): Uint8Array {
  return createHash("sha256").update(seed).digest();
}

type RGB = [number, number, number];

function hsl(h: number, s: number, l: number): RGB {
  const sat = Math.max(0, Math.min(1, s));
  const lit = Math.max(0, Math.min(1, l));
  const a = sat * Math.min(lit, 1 - lit);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    return lit - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
  };
  return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
}

function themeHue(theme: string, b: Uint8Array): number {
  const map: Record<string, number> = {
    pepe: 120, frog: 130, cat: 28, dog: 32, ai: 195, robot: 210, space: 250,
    moon: 220, rocket: 12, king: 48, coin: 46, fire: 14, ice: 198, ocean: 205,
    food: 22, anime: 320, game: 280, skull: 0, alien: 110, wolf: 210, bull: 8,
    bear: 24, world: 160, gold: 44, neon: 300, meme: 95, bird: 200, fish: 188,
    dragon: 5, ape: 38,
  };
  return (map[theme] ?? 280) + (b[0]! % 18) - 8;
}

/** 5x7 caps for A-Z0-9. Bits are rows. */
const FONT: Record<string, number[]> = {
  A: [0x0e, 0x11, 0x11, 0x1f, 0x11, 0x11, 0x11],
  B: [0x1e, 0x11, 0x11, 0x1e, 0x11, 0x11, 0x1e],
  C: [0x0e, 0x11, 0x10, 0x10, 0x10, 0x11, 0x0e],
  D: [0x1e, 0x11, 0x11, 0x11, 0x11, 0x11, 0x1e],
  E: [0x1f, 0x10, 0x10, 0x1e, 0x10, 0x10, 0x1f],
  F: [0x1f, 0x10, 0x10, 0x1e, 0x10, 0x10, 0x10],
  G: [0x0e, 0x11, 0x10, 0x17, 0x11, 0x11, 0x0e],
  H: [0x11, 0x11, 0x11, 0x1f, 0x11, 0x11, 0x11],
  I: [0x0e, 0x04, 0x04, 0x04, 0x04, 0x04, 0x0e],
  J: [0x07, 0x01, 0x01, 0x01, 0x11, 0x11, 0x0e],
  K: [0x11, 0x12, 0x14, 0x18, 0x14, 0x12, 0x11],
  L: [0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x1f],
  M: [0x11, 0x1b, 0x15, 0x15, 0x11, 0x11, 0x11],
  N: [0x11, 0x19, 0x15, 0x13, 0x11, 0x11, 0x11],
  O: [0x0e, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0e],
  P: [0x1e, 0x11, 0x11, 0x1e, 0x10, 0x10, 0x10],
  Q: [0x0e, 0x11, 0x11, 0x11, 0x15, 0x12, 0x0d],
  R: [0x1e, 0x11, 0x11, 0x1e, 0x14, 0x12, 0x11],
  S: [0x0e, 0x11, 0x10, 0x0e, 0x01, 0x11, 0x0e],
  T: [0x1f, 0x04, 0x04, 0x04, 0x04, 0x04, 0x04],
  U: [0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0e],
  V: [0x11, 0x11, 0x11, 0x11, 0x11, 0x0a, 0x04],
  W: [0x11, 0x11, 0x11, 0x15, 0x15, 0x1b, 0x11],
  X: [0x11, 0x11, 0x0a, 0x04, 0x0a, 0x11, 0x11],
  Y: [0x11, 0x11, 0x0a, 0x04, 0x04, 0x04, 0x04],
  Z: [0x1f, 0x01, 0x02, 0x04, 0x08, 0x10, 0x1f],
  "0": [0x0e, 0x11, 0x13, 0x15, 0x19, 0x11, 0x0e],
  "1": [0x04, 0x0c, 0x04, 0x04, 0x04, 0x04, 0x0e],
  "2": [0x0e, 0x11, 0x01, 0x06, 0x08, 0x10, 0x1f],
  "3": [0x1f, 0x01, 0x02, 0x06, 0x01, 0x11, 0x0e],
  "4": [0x02, 0x06, 0x0a, 0x12, 0x1f, 0x02, 0x02],
  "5": [0x1f, 0x10, 0x1e, 0x01, 0x01, 0x11, 0x0e],
  "6": [0x06, 0x08, 0x10, 0x1e, 0x11, 0x11, 0x0e],
  "7": [0x1f, 0x01, 0x02, 0x04, 0x08, 0x08, 0x08],
  "8": [0x0e, 0x11, 0x11, 0x0e, 0x11, 0x11, 0x0e],
  "9": [0x0e, 0x11, 0x11, 0x0f, 0x01, 0x02, 0x0c],
};

function setPx(px: Uint8Array, x: number, y: number, c: RGB) {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 3;
  px[i] = c[0];
  px[i + 1] = c[1];
  px[i + 2] = c[2];
}

function disc(px: Uint8Array, cx: number, cy: number, r: number, c: RGB) {
  const r2 = r * r;
  for (let y = cy - r; y <= cy + r; y++) {
    for (let x = cx - r; x <= cx + r; x++) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= r2) setPx(px, x, y, c);
    }
  }
}

function glyph(px: Uint8Array, ch: string, ox: number, oy: number, scale: number, c: RGB) {
  const rows = FONT[ch] || FONT.X!;
  for (let y = 0; y < 7; y++) {
    const row = rows[y]!;
    for (let x = 0; x < 5; x++) {
      if (row & (1 << (4 - x))) {
        for (let dy = 0; dy < scale; dy++) {
          for (let dx = 0; dx < scale; dx++) setPx(px, ox + x * scale + dx, oy + y * scale + dy, c);
        }
      }
    }
  }
}

function paintTheme(px: Uint8Array, theme: string, b: Uint8Array, bg: RGB, fg: RGB, accent: RGB) {
  const cx = 128 + ((b[4]! % 21) - 10);
  const cy = 118 + ((b[5]! % 21) - 10);
  if (theme === "cat" || theme === "dog" || theme === "wolf" || theme === "bear" || theme === "ape") {
    disc(px, cx, cy, 62, fg);
    disc(px, cx - 48, cy - 48, 22, fg);
    disc(px, cx + 48, cy - 48, 22, fg);
    disc(px, cx - 22, cy - 8, 10, bg);
    disc(px, cx + 22, cy - 8, 10, bg);
    disc(px, cx, cy + 18, 16, accent);
  } else if (theme === "frog" || theme === "pepe") {
    disc(px, cx, cy + 8, 70, fg);
    disc(px, cx - 28, cy - 28, 22, fg);
    disc(px, cx + 28, cy - 28, 22, fg);
    disc(px, cx - 28, cy - 28, 10, bg);
    disc(px, cx + 28, cy - 28, 10, bg);
  } else if (theme === "space" || theme === "moon" || theme === "rocket" || theme === "alien") {
    for (let i = 0; i < 48; i++) {
      setPx(px, (b[i % 32]! * (i + 3)) % W, (b[(i + 7) % 32]! * (i + 5)) % 180, accent);
    }
    disc(px, cx, cy, theme === "rocket" ? 28 : 54, fg);
    if (theme === "rocket") disc(px, cx, cy + 48, 22, accent);
  } else if (theme === "ai" || theme === "robot" || theme === "neon" || theme === "game") {
    for (let y = 24; y < 200; y += 16) {
      for (let x = 24; x < 232; x += 16) {
        if ((x + y + b[6]!) % 32 < 10) disc(px, x, y, 4, accent);
      }
    }
    disc(px, cx, cy, 40, fg);
  } else if (theme === "fire" || theme === "gold" || theme === "coin" || theme === "king") {
    disc(px, cx, cy, 58, fg);
    disc(px, cx, cy, 38, accent);
    disc(px, cx, cy, 18, fg);
  } else {
    disc(px, cx, cy, 70, fg);
    disc(px, cx - 36, cy - 20, 24, accent);
    disc(px, cx + 40, cy + 28, 18, accent);
  }
}

export function renderTokenPng(seed: string, symbol: string, theme: string): Buffer {
  const b = hashBytes(`${seed}|${symbol}|${theme}`);
  const hue = themeHue(theme, b);
  const bg = hsl(hue, 0.55, 0.1);
  const fg = hsl(hue, 0.72, 0.52);
  const accent = hsl((hue + 40) % 360, 0.8, 0.62);
  const ink: RGB = [247, 244, 255];
  const px = new Uint8Array(W * H * 3);
  for (let i = 0; i < px.length; i += 3) {
    px[i] = bg[0];
    px[i + 1] = bg[1];
    px[i + 2] = bg[2];
  }
  paintTheme(px, theme, b, bg, fg, accent);
  const ticker = (symbol || "COIN").toUpperCase().slice(0, 10);
  const scale = ticker.length > 6 ? 4 : 5;
  const gw = 5 * scale + 2;
  const total = ticker.length * gw - 2;
  let ox = Math.max(8, Math.floor((W - total) / 2));
  const oy = 214;
  for (const ch of ticker) {
    glyph(px, ch, ox, oy, scale, ink);
    ox += gw;
  }
  const raw = Buffer.alloc((W * 3 + 1) * H);
  for (let y = 0; y < H; y++) {
    const row = y * (W * 3 + 1);
    raw[row] = 0;
    Buffer.from(px.buffer, px.byteOffset + y * W * 3, W * 3).copy(raw, row + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

export function pngMagic(buf: Buffer): boolean {
  return buf.length > 24 && buf[0] === 137 && buf[1] === 80 && buf[2] === 78 && buf[3] === 71;
}
