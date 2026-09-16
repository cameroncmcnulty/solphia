"use client";

import { useEffect, useRef } from "react";

type Node = {
  x: number;
  y: number;
  lum: number;
  green: boolean;
  eye: boolean;
  links: number[];
};

type Eye = { x: number; y: number; r: number };
type Packet = { a: number; b: number; t: number; speed: number; wait: number; hue: number };
type Hair = { x: number; y: number; len: number; phase: number; curl: number; thick: number; dir: number };
type Wave = { x: number; y: number; r: number; life: number };
type Spark = { x: number; y: number; vx: number; vy: number; life: number; hue: number };

function fit(iw: number, ih: number, cw: number, ch: number, mode: "contain" | "cover") {
  const ir = iw / ih;
  const cr = cw / ch;
  let dw: number;
  let dh: number;
  if (mode === "contain" ? cr > ir : cr < ir) {
    dh = ch;
    dw = ch * ir;
  } else {
    dw = cw;
    dh = cw / ir;
  }
  return { dx: (cw - dw) / 2, dy: (ch - dh) / 2, dw, dh };
}

function luma(r: number, g: number, b: number) {
  return r * 0.2126 + g * 0.7152 + b * 0.0722;
}

function inFace(nx: number, ny: number) {
  return ((nx - 0.5) / 0.22) ** 2 + ((ny - 0.4) / 0.26) ** 2 < 1;
}

function analyze(img: HTMLImageElement, dense: boolean) {
  const iw = img.naturalWidth || 1;
  const ih = img.naturalHeight || 1;
  const scale = Math.min(1, 480 / iw);
  const w = Math.max(1, Math.round(iw * scale));
  const h = Math.max(1, Math.round(ih * scale));
  const off = document.createElement("canvas");
  off.width = w;
  off.height = h;
  const o = off.getContext("2d", { willReadFrequently: true });
  if (!o) return { nodes: [] as Node[], eyes: [] as Eye[], hair: [] as Hair[] };
  o.drawImage(img, 0, 0, w, h);
  const { data } = o.getImageData(0, 0, w, h);

  const cand: { x: number; y: number; lum: number; green: boolean; purple: boolean }[] = [];
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = (y * w + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const L = luma(r, g, b);
      if (L < 42) continue;
      let peak = true;
      for (let oy = -1; oy <= 1 && peak; oy++) {
        for (let ox = -1; ox <= 1; ox++) {
          if (!ox && !oy) continue;
          const j = ((y + oy) * w + (x + ox)) * 4;
          if (luma(data[j], data[j + 1], data[j + 2]) > L) {
            peak = false;
            break;
          }
        }
      }
      if (!peak) continue;
      cand.push({
        x: x / w,
        y: y / h,
        lum: L / 255,
        green: g > r + 10 && g > b - 8,
        purple: b > 145 && r > 55 && b > g + 25,
      });
    }
  }
  cand.sort((a, b) => b.lum - a.lum);

  const minD = dense ? 0.013 : 0.02;
  const minD2 = minD * minD;
  const kept: Node[] = [];
  for (const c of cand) {
    let ok = true;
    for (const n of kept) {
      const dx = n.x - c.x;
      const dy = n.y - c.y;
      if (dx * dx + dy * dy < minD2) {
        ok = false;
        break;
      }
    }
    if (!ok) continue;
    kept.push({
      x: c.x,
      y: c.y,
      lum: c.lum,
      green: c.green,
      eye: c.purple && c.y > 0.3 && c.y < 0.5,
      links: [],
    });
    if (kept.length >= (dense ? 560 : 280)) break;
  }

  const cell = 0.04;
  const buckets = new Map<string, number[]>();
  kept.forEach((n, idx) => {
    const k = `${(n.x / cell) | 0}_${(n.y / cell) | 0}`;
    const arr = buckets.get(k);
    if (arr) arr.push(idx);
    else buckets.set(k, [idx]);
  });
  const maxLink = dense ? 0.0034 : 0.0044;
  for (let i = 0; i < kept.length; i++) {
    const n = kept[i];
    const gx = (n.x / cell) | 0;
    const gy = (n.y / cell) | 0;
    const near: { j: number; d: number }[] = [];
    for (let ox = -1; ox <= 1; ox++) {
      for (let oy = -1; oy <= 1; oy++) {
        const list = buckets.get(`${gx + ox}_${gy + oy}`);
        if (!list) continue;
        for (const j of list) {
          if (j <= i) continue;
          const b = kept[j];
          const d = (n.x - b.x) ** 2 + (n.y - b.y) ** 2;
          if (d < maxLink) near.push({ j, d });
        }
      }
    }
    near.sort((a, b) => a.d - b.d);
    n.links = near.slice(0, dense ? 4 : 3).map((x) => x.j);
  }

  const iris: { x: number; y: number }[] = [];
  for (let y = Math.floor(h * 0.28); y < h * 0.52; y++) {
    for (let x = Math.floor(w * 0.18); x < w * 0.82; x++) {
      const i = (y * w + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const L = luma(r, g, b);
      const purple = b > 150 && r > 60 && b > g + 30 && L > 50;
      const teal = g > 90 && b > 70 && L > 55 && L < 170 && Math.abs(x / w - 0.5) > 0.04;
      if (purple || teal) iris.push({ x: x / w, y: y / h });
    }
  }
  let eyes = clusterEyes(iris);
  if (eyes.length < 2) {
    eyes = [
      { x: 0.38, y: 0.4, r: 0.034 },
      { x: 0.62, y: 0.4, r: 0.034 },
    ];
  }

  const hairCand: { x: number; y: number; lum: number }[] = [];
  for (let y = 1; y < h * 0.78; y += 2) {
    for (let x = 1; x < w - 1; x += 2) {
      const i = ((y | 0) * w + (x | 0)) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      if (g < 100 || g < r + 6) continue;
      const nx = x / w;
      const ny = y / h;
      if (inFace(nx, ny) && ny > 0.22) continue;
      hairCand.push({ x: nx, y: ny, lum: luma(r, g, b) / 255 });
    }
  }
  hairCand.sort((a, b) => b.lum - a.lum);
  const hair: Hair[] = [];
  const hairD2 = 0.0016;
  for (const c of hairCand) {
    if (hair.some((h0) => (h0.x - c.x) ** 2 + (h0.y - c.y) ** 2 < hairD2)) continue;
    hair.push({
      x: c.x,
      y: c.y,
      len: 0.018 + c.lum * 0.022,
      phase: Math.random() * Math.PI * 2,
      curl: 0.45 + Math.random() * 0.85,
      thick: 0.8 + c.lum * 1.4,
      dir: Math.atan2(c.y - 0.34, c.x - 0.5),
    });
    if (hair.length >= (dense ? 160 : 90)) break;
  }
  return { nodes: kept, eyes, hair };
}

function clusterEyes(pts: { x: number; y: number }[]): Eye[] {
  if (pts.length < 12) return [];
  const seeds: Eye[] = [];
  for (const p of pts) {
    let hit = false;
    for (const s of seeds) {
      if (Math.hypot(p.x - s.x, p.y - s.y) < 0.055) {
        s.x = (s.x * s.r + p.x) / (s.r + 1);
        s.y = (s.y * s.r + p.y) / (s.r + 1);
        s.r += 1;
        hit = true;
        break;
      }
    }
    if (!hit) seeds.push({ x: p.x, y: p.y, r: 1 });
  }
  seeds.sort((a, b) => b.r - a.r);
  return seeds.slice(0, 2).map((s) => ({
    x: s.x,
    y: s.y,
    r: Math.min(0.055, Math.max(0.028, Math.sqrt(s.r) * 0.0048)),
  }));
}

const VOID = "#04000a";
const PANEL_FADE = [
  `linear-gradient(to bottom, transparent 0%, transparent 55%, rgba(4,0,10,0.4) 75%, ${VOID} 100%)`,
  `radial-gradient(ellipse 80% 85% at 50% 42%, transparent 50%, ${VOID} 100%)`,
].join(", ");

function drawWarpedHair(
  ctx: CanvasRenderingContext2D,
  pic: HTMLImageElement,
  box: { dx: number; dy: number; dw: number; dh: number },
  t: number,
  windX: number,
  windY: number,
) {
  const iw = pic.naturalWidth;
  const ih = pic.naturalHeight;
  ctx.drawImage(pic, box.dx, box.dy, box.dw, box.dh);
  const bands = 26;
  for (let i = 0; i < bands; i++) {
    const y0 = (i / bands) * 0.22;
    const y1 = ((i + 1) / bands) * 0.22;
    const amp = 14 + (1 - i / bands) * 18;
    const wave =
      Math.sin(t * 0.042 + i * 0.38) * amp * 0.45 * windX +
      Math.sin(t * 0.023 + i * 0.19 + 1.1) * amp * 0.7 +
      windY * 4;
    const sy = y0 * ih;
    const sh = Math.max(1, (y1 - y0) * ih);
    ctx.drawImage(pic, 0, sy, iw, sh, box.dx + wave, box.dy + y0 * box.dh, box.dw, (y1 - y0) * box.dh);
  }
  const sideBands = 16;
  for (const side of [-1, 1] as const) {
    const x0 = side < 0 ? 0 : 0.7;
    const x1 = side < 0 ? 0.3 : 1;
    for (let i = 0; i < sideBands; i++) {
      const y0 = 0.12 + (i / sideBands) * 0.58;
      const y1 = 0.12 + ((i + 1) / sideBands) * 0.58;
      const amp = 11 + Math.abs(0.4 - (y0 + y1) / 2) * 16;
      const wave =
        Math.sin(t * 0.038 + i * 0.42 + side) * amp * 0.55 * windX +
        Math.sin(t * 0.019 + i * 0.27) * amp * 0.5 +
        side * windX * 6;
      const sx = x0 * iw;
      const sw = Math.max(1, (x1 - x0) * iw);
      const sy = y0 * ih;
      const sh = Math.max(1, (y1 - y0) * ih);
      ctx.drawImage(
        pic,
        sx,
        sy,
        sw,
        sh,
        box.dx + x0 * box.dw + wave,
        box.dy + y0 * box.dh,
        (x1 - x0) * box.dw,
        (y1 - y0) * box.dh,
      );
    }
  }
}

export function SolphiaFace({ mode = "panel" }: { mode?: "hero" | "panel" | "launch" }) {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const photo = useRef<HTMLImageElement>(null);
  const hero = mode === "hero";
  const launch = mode === "launch";

  useEffect(() => {
    const c = canvas.current;
    const host = wrap.current;
    const pic = photo.current;
    if (!c || !host || !pic) return;
    const ctx = c.getContext("2d", { alpha: true });
    if (!ctx) return;

    let raf = 0;
    let nodes: Node[] = [];
    let eyes: Eye[] = [];
    let hair: Hair[] = [];
    let t = 0;
    let mx = 0.5;
    let my = 0.4;
    let tx = 0.5;
    let ty = 0.4;
    let hover = false;
    let blink = 1;
    let blinkT = 0;
    let nextBlink = 180 + Math.random() * 140;
    let box = { dx: 0, dy: 0, dw: 1, dh: 1 };
    let lastPw = 0;
    let lastPh = 0;
    let ready = pic.complete && pic.naturalWidth > 0;
    let solUsd = 0;
    let live = false;
    let lastFeedAt = 0;
    let feedFlash = 0;
    const packets: Packet[] = [];
    const waves: Wave[] = [];
    const sparks: Spark[] = [];
    const reduce =
      typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const boot = () => {
      if (!pic.naturalWidth) return;
      ready = true;
      const out = analyze(pic, hero || launch);
      nodes = out.nodes;
      eyes = out.eyes;
      hair = out.hair;
    };
    pic.addEventListener("load", boot);
    if (ready) boot();

    const pullFeed = () => {
      fetch("/api/feed", { cache: "no-store" })
        .then((r) => r.json())
        .then((j) => {
          solUsd = Number(j?.solUsd) || solUsd;
          live = Boolean(j?.liveTrading);
          const at = Number(j?.lastTickAt) || 0;
          if (at && at !== lastFeedAt) {
            lastFeedAt = at;
            feedFlash = 1;
            sparkAt(0.5, 0.38);
          }
        })
        .catch(() => undefined);
    };
    pullFeed();
    const feedId = window.setInterval(pullFeed, 8000);

    const toScreen = (x: number, y: number) => ({
      sx: box.dx + x * box.dw,
      sy: box.dy + y * box.dh,
    });

    const burst = (nx: number, ny: number, n = 18) => {
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + Math.random() * 0.3;
        sparks.push({
          x: nx,
          y: ny,
          vx: Math.cos(a) * (0.004 + Math.random() * 0.01),
          vy: Math.sin(a) * (0.004 + Math.random() * 0.01) - 0.002,
          life: 1,
          hue: Math.random() > 0.45 ? 0 : 1,
        });
      }
    };

    const sparkAt = (nx: number, ny: number) => {
      waves.push({ x: nx, y: ny, r: 0.02, life: 1 });
      burst(nx, ny, hero ? 26 : 14);
      if (!nodes.length) return;
      let best = 0;
      let bd = 1e9;
      for (let i = 0; i < nodes.length; i++) {
        const d = (nodes[i].x - nx) ** 2 + (nodes[i].y - ny) ** 2;
        if (d < bd) {
          bd = d;
          best = i;
        }
      }
      const seen = new Set<number>([best]);
      const q: { i: number; depth: number }[] = [{ i: best, depth: 0 }];
      while (q.length) {
        const cur = q.shift()!;
        if (cur.depth > 8) continue;
        for (const j of nodes[cur.i].links) {
          packets.push({
            a: cur.i,
            b: j,
            t: 0,
            speed: 0.05 + Math.random() * 0.04,
            wait: cur.depth * 2,
            hue: cur.depth % 2,
          });
          if (!seen.has(j)) {
            seen.add(j);
            q.push({ i: j, depth: cur.depth + 1 });
          }
        }
      }
    };

    const idleTraffic = () => {
      if (!nodes.length) return;
      const cap = hero ? 72 : 32;
      if (packets.length >= cap) return;
      const i = (Math.random() * nodes.length) | 0;
      const n = nodes[i];
      if (!n.links.length) return;
      const j = n.links[(Math.random() * n.links.length) | 0];
      packets.push({
        a: i,
        b: j,
        t: 0,
        speed: 0.028 + Math.random() * 0.04,
        wait: 0,
        hue: Math.random() > 0.55 ? 0 : 1,
      });
    };

    const loop = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(1, host.clientWidth);
      const h = Math.max(1, host.clientHeight);
      const pw = Math.floor(w * dpr);
      const ph = Math.floor(h * dpr);
      if (pw !== lastPw || ph !== lastPh) {
        c.width = pw;
        c.height = ph;
        c.style.width = `${w}px`;
        c.style.height = `${h}px`;
        lastPw = pw;
        lastPh = ph;
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      t += 1;
      if (feedFlash > 0) feedFlash *= 0.94;
      if (!hover) {
        tx = 0.5 + Math.sin(t * 0.006) * 0.06;
        ty = 0.38 + Math.sin(t * 0.0044 + 0.7) * 0.035;
      }
      mx += (tx - mx) * 0.09;
      my += (ty - my) * 0.09;

      nextBlink -= reduce ? 0 : 1;
      if (nextBlink <= 0) {
        blinkT = 1;
        nextBlink = 220 + Math.random() * 200;
      }
      if (blinkT > 0) {
        blinkT -= 0.09;
        const k = Math.abs(blinkT - 0.5) * 2;
        blink = blinkT > 0 ? 0.12 + 0.88 * k : 1;
        if (blinkT <= 0) blink = 1;
      }

      if (!ready || !pic.naturalWidth) {
        raf = requestAnimationFrame(loop);
        return;
      }

      box = fit(pic.naturalWidth, pic.naturalHeight, w, h, hero ? "contain" : "cover");
      const pulseY = 0.95 - ((t * 0.0042) % 1.2);
      const px = box.dx + mx * box.dw;
      const py = box.dy + my * box.dh;
      const heatR = hero ? 120 : 72;
      const windX = 0.65 + (mx - 0.5) * 1.6;
      const windY = (my - 0.4) * 1.2;

      ctx.imageSmoothingEnabled = true;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";

      if (hero && !reduce) {
        drawWarpedHair(ctx, pic, box, t, windX, windY);
      } else if (hero) {
        ctx.drawImage(pic, box.dx, box.dy, box.dw, box.dh);
      }

      if (!reduce) idleTraffic();
      if (!reduce && t % 2 === 0) idleTraffic();

      ctx.globalCompositeOperation = "screen";

      const heatOf = (n: Node, p: { sx: number; sy: number }) => {
        let heat = n.lum * 0.28 + 0.08 * (0.5 + 0.5 * Math.sin(t * 0.028 + n.lum * 14));
        const md = Math.hypot(p.sx - px, p.sy - py);
        if (md < heatR) heat += (1 - md / heatR) * 0.95;
        const gy = (n.y - pulseY) / 0.05;
        heat += Math.exp(-(gy * gy)) * 0.7;
        heat += feedFlash * 0.55;
        if (n.eye) heat *= 0.35 + 0.65 * blink;
        return heat;
      };

      ctx.beginPath();
      ctx.strokeStyle = `rgba(140,200,255,${0.28 + feedFlash * 0.25})`;
      ctx.lineWidth = hero ? 0.85 : 0.6;
      for (const n of nodes) {
        const p = toScreen(n.x, n.y);
        if (heatOf(n, p) > 0.72) continue;
        for (const j of n.links) {
          const q = toScreen(nodes[j].x, nodes[j].y);
          ctx.moveTo(p.sx, p.sy);
          ctx.lineTo(q.sx, q.sy);
        }
      }
      ctx.stroke();

      ctx.beginPath();
      ctx.strokeStyle = `rgba(20,241,149,${0.62 + feedFlash * 0.3})`;
      ctx.lineWidth = hero ? 1.45 : 1;
      for (const n of nodes) {
        const p = toScreen(n.x, n.y);
        if (heatOf(n, p) <= 0.72) continue;
        for (const j of n.links) {
          const q = toScreen(nodes[j].x, nodes[j].y);
          ctx.moveTo(p.sx, p.sy);
          ctx.lineTo(q.sx, q.sy);
        }
      }
      ctx.stroke();

      for (const n of nodes) {
        const p = toScreen(n.x, n.y);
        const heat = heatOf(n, p);
        const rad = (hero ? 1.25 : 0.9) * (0.4 + heat * 1.2);
        if (heat > 0.85) {
          ctx.fillStyle = `rgba(20,241,149,${Math.min(0.9, 0.22 + heat * 0.4)})`;
          ctx.beginPath();
          ctx.arc(p.sx, p.sy, rad * 3.8, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = n.green
          ? `rgba(20,241,149,${Math.min(1, 0.22 + heat * 0.7)})`
          : `rgba(190,230,255,${Math.min(0.95, 0.18 + heat * 0.6)})`;
        ctx.beginPath();
        ctx.arc(p.sx, p.sy, rad, 0, Math.PI * 2);
        ctx.fill();
      }

      for (let i = packets.length - 1; i >= 0; i--) {
        const p = packets[i];
        if (p.wait > 0) {
          p.wait -= 1;
          continue;
        }
        p.t += p.speed;
        if (p.t >= 1) {
          packets.splice(i, 1);
          continue;
        }
        const a = nodes[p.a];
        const b = nodes[p.b];
        if (!a || !b) continue;
        const s = toScreen(a.x + (b.x - a.x) * p.t, a.y + (b.y - a.y) * p.t);
        const glow = 1 - Math.abs(p.t - 0.5) * 2;
        ctx.fillStyle =
          p.hue === 0
            ? `rgba(20,241,149,${0.55 + glow * 0.45})`
            : `rgba(180,140,255,${0.5 + glow * 0.45})`;
        ctx.beginPath();
        ctx.arc(s.sx, s.sy, hero ? 2.8 : 1.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = `rgba(255,255,255,${0.35 + glow * 0.4})`;
        ctx.beginPath();
        ctx.arc(s.sx, s.sy, hero ? 1.1 : 0.8, 0, Math.PI * 2);
        ctx.fill();
      }

      const lookNX = (mx - 0.5) * 2;
      const lookNY = (my - 0.4) * 2;
      for (const e of eyes) {
        const p = toScreen(e.x, e.y);
        const rx = e.r * box.dw;
        const ry = e.r * box.dh * (0.55 + 0.45 * blink);
        const gx = p.sx + lookNX * rx * 0.32;
        const gy = p.sy + lookNY * ry * 0.24;
        const glow = ctx.createRadialGradient(gx, gy, 1, p.sx, p.sy, rx * 1.9);
        glow.addColorStop(0, `rgba(20,241,149,${0.42 * blink})`);
        glow.addColorStop(0.35, `rgba(153,69,255,${0.22 * blink})`);
        glow.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.ellipse(p.sx, p.sy, rx * 1.35, ry * 1.35, 0, 0, Math.PI * 2);
        ctx.fill();
        if (blink > 0.2) {
          ctx.fillStyle = `rgba(255,255,255,${0.7 * blink})`;
          ctx.beginPath();
          ctx.arc(gx + rx * 0.16, gy - ry * 0.12, Math.max(1.4, rx * 0.14), 0, Math.PI * 2);
          ctx.fill();
        }
      }

      if (!reduce && hair.length) {
        for (const s of hair) {
          const wind = Math.sin(t * 0.028 + s.phase) * 0.9 + Math.sin(t * 0.015 + s.phase * 1.6) * 0.55;
          const lift = Math.cos(t * 0.02 + s.phase) * 0.45 + 0.25;
          ctx.beginPath();
          let hx = s.x;
          let hy = s.y;
          const p0 = toScreen(hx, hy);
          ctx.moveTo(p0.sx, p0.sy);
          const steps = hero ? 12 : 8;
          for (let step = 1; step <= steps; step++) {
            const ang = s.dir + wind * 0.7 * windX + step * 0.1 * s.curl - 0.15 * lift;
            hx += Math.cos(ang) * s.len;
            hy += Math.sin(ang) * s.len - 0.004 * lift - 0.0015 * windY;
            const p = toScreen(hx, hy);
            ctx.lineTo(p.sx, p.sy);
          }
          ctx.strokeStyle = `rgba(20,241,149,${0.16 + s.thick * 0.14})`;
          ctx.lineWidth = (hero ? 1.7 : 1.1) * s.thick;
          ctx.stroke();
          const tip = toScreen(hx, hy);
          ctx.fillStyle = `rgba(180,255,230,${0.18 + 0.2 * (0.5 + 0.5 * Math.sin(t * 0.05 + s.phase))})`;
          ctx.beginPath();
          ctx.arc(tip.sx, tip.sy, hero ? 1.6 : 1.1, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.x += s.vx;
        s.y += s.vy;
        s.vy -= 0.00012;
        s.life -= 0.018;
        if (s.life <= 0) {
          sparks.splice(i, 1);
          continue;
        }
        const p = toScreen(s.x, s.y);
        ctx.fillStyle =
          s.hue === 0 ? `rgba(20,241,149,${s.life})` : `rgba(190,150,255,${s.life})`;
        ctx.beginPath();
        ctx.arc(p.sx, p.sy, 1.4 + s.life * 1.6, 0, Math.PI * 2);
        ctx.fill();
      }

      for (let i = waves.length - 1; i >= 0; i--) {
        const wv = waves[i];
        wv.r += 0.012;
        wv.life -= 0.02;
        if (wv.life <= 0) {
          waves.splice(i, 1);
          continue;
        }
        const p = toScreen(wv.x, wv.y);
        ctx.strokeStyle = `rgba(20,241,149,${wv.life * 0.55})`;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.ellipse(p.sx, p.sy, wv.r * box.dw, wv.r * box.dh * 1.05, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      if (hero) {
        const hx = box.dx + 0.5 * box.dw;
        const hy = box.dy + 0.36 * box.dh;
        const rx = box.dw * 0.46;
        const ry = box.dh * 0.38;
        ctx.save();
        ctx.globalCompositeOperation = "screen";
        ctx.strokeStyle = `rgba(20,241,149,${0.22 + 0.18 * Math.sin(t * 0.04)})`;
        ctx.lineWidth = 1.1;
        ctx.setLineDash([7, 11]);
        ctx.lineDashOffset = -t * 0.35;
        ctx.beginPath();
        ctx.ellipse(hx, hy, rx, ry, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([3, 16]);
        ctx.strokeStyle = `rgba(153,69,255,${0.16 + 0.12 * Math.sin(t * 0.03 + 1)})`;
        ctx.beginPath();
        ctx.ellipse(hx, hy, rx * 1.12, ry * 1.12, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      }

      const washR = Math.min(box.dw, box.dh) * 0.46;
      const wash = ctx.createRadialGradient(px, py, 6, px, py, washR);
      wash.addColorStop(0, `rgba(20,241,149,${0.14 + feedFlash * 0.2})`);
      wash.addColorStop(0.45, "rgba(153,69,255,0.07)");
      wash.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = wash;
      ctx.beginPath();
      ctx.ellipse(px, py, washR, washR * 1.15, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = "source-over";

      if (hero) {
        ctx.font = "600 10px ui-monospace, SFMono-Regular, Menlo, monospace";
        ctx.fillStyle = "rgba(20,241,149,0.78)";
        ctx.textAlign = "center";
        const hud = solUsd
          ? `${live ? "LIVE" : "MESH"}  ·  SOL ${solUsd >= 10 ? solUsd.toFixed(2) : solUsd.toFixed(3)}  ·  TAP`
          : "LIVE MESH  ·  TAP";
        ctx.fillText(hud, box.dx + box.dw / 2, box.dy + box.dh * 0.97);
      }

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    const onMove = (e: PointerEvent) => {
      const r = host.getBoundingClientRect();
      tx = (e.clientX - r.left) / Math.max(1, r.width);
      ty = (e.clientY - r.top) / Math.max(1, r.height);
      hover = true;
    };
    const onDown = (e: PointerEvent) => {
      const r = host.getBoundingClientRect();
      const nx = (e.clientX - r.left - box.dx) / Math.max(1, box.dw);
      const ny = (e.clientY - r.top - box.dy) / Math.max(1, box.dh);
      sparkAt(nx, ny);
    };
    const onLeave = () => {
      hover = false;
    };
    const onPulse = () => sparkAt(0.5, 0.34);
    host.addEventListener("pointermove", onMove, { passive: true });
    host.addEventListener("pointerdown", onDown);
    host.addEventListener("pointerleave", onLeave);
    window.addEventListener("solphia-pulse", onPulse);
    return () => {
      cancelAnimationFrame(raf);
      window.clearInterval(feedId);
      pic.removeEventListener("load", boot);
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerdown", onDown);
      host.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("solphia-pulse", onPulse);
    };
  }, [hero, launch]);

  return (
    <div
      ref={wrap}
      className={`relative cursor-crosshair touch-none select-none outline-none ${
        launch
          ? "h-full w-full overflow-hidden"
          : hero
            ? "mx-auto aspect-[3/4] w-full overflow-visible"
            : "h-[240px] w-full overflow-hidden md:h-[300px]"
      }`}
      style={{
        isolation: "isolate",
        WebkitTapHighlightColor: "transparent",
        WebkitUserSelect: "none",
        userSelect: "none",
        outline: "none",
      }}
      title="Tap Solphia — mesh pulses with the tape"
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 55% 60% at 50% 42%, rgba(20,241,149,0.14), rgba(153,69,255,0.08) 42%, transparent 70%)",
        }}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={photo}
        src={launch ? "/solphia-launch.jpg?v=6" : hero ? "/solphia-hero.jpg?v=6" : "/solphia-face.jpg?v=6"}
        alt=""
        draggable={false}
        className={`pointer-events-none absolute inset-0 h-full w-full outline-none ${
          hero ? "object-contain object-top opacity-0" : launch ? "object-cover object-[82%_42%]" : "object-cover"
        }`}
        style={{
          filter: launch
            ? "brightness(1.06) saturate(1.22) contrast(1.12)"
            : "brightness(1.18) saturate(1.12) contrast(1.08)",
          opacity: hero ? 0 : launch ? 0.94 : 1,
          outline: "none",
          userSelect: "none",
          transform: launch ? "scale(1.18)" : undefined,
          transformOrigin: launch ? "82% 48%" : undefined,
        }}
      />
      <canvas
        ref={canvas}
        className="pointer-events-none absolute inset-0 h-full w-full outline-none"
        style={{
          outline: "none",
          ...(hero
            ? {
                WebkitMaskImage:
                  "linear-gradient(to bottom, #000 0%, #000 78%, rgba(0,0,0,0.7) 90%, transparent 100%)",
                maskImage:
                  "linear-gradient(to bottom, #000 0%, #000 78%, rgba(0,0,0,0.7) 90%, transparent 100%)",
              }
            : {}),
        }}
      />
      {launch ? (
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(to right, rgba(4,0,10,0.58) 0%, rgba(4,0,10,0.22) 36%, transparent 62%), linear-gradient(to bottom, transparent 52%, rgba(4,0,10,0.7) 100%)",
          }}
        />
      ) : !hero ? (
        <div className="pointer-events-none absolute inset-0" style={{ background: PANEL_FADE }} />
      ) : null}
    </div>
  );
}
