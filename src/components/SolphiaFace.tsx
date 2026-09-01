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
type Packet = { a: number; b: number; t: number; speed: number; wait: number };

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

function analyze(img: HTMLImageElement, dense: boolean) {
  const iw = img.naturalWidth || 1;
  const ih = img.naturalHeight || 1;
  const scale = Math.min(1, 440 / iw);
  const w = Math.max(1, Math.round(iw * scale));
  const h = Math.max(1, Math.round(ih * scale));
  const off = document.createElement("canvas");
  off.width = w;
  off.height = h;
  const o = off.getContext("2d", { willReadFrequently: true });
  if (!o) return { nodes: [] as Node[], eyes: [] as Eye[] };
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
      if (L < 78) continue;
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
        green: g > r + 18 && g > b,
        purple: b > 145 && r > 55 && b > g + 25,
      });
    }
  }
  cand.sort((a, b) => b.lum - a.lum);

  const minD = dense ? 0.016 : 0.022;
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
    if (kept.length >= (dense ? 480 : 240)) break;
  }

  const cell = 0.045;
  const buckets = new Map<string, number[]>();
  kept.forEach((n, idx) => {
    const k = `${(n.x / cell) | 0}_${(n.y / cell) | 0}`;
    const arr = buckets.get(k);
    if (arr) arr.push(idx);
    else buckets.set(k, [idx]);
  });
  const maxLink = dense ? 0.0028 : 0.0036;
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
    n.links = near.slice(0, dense ? 3 : 2).map((x) => x.j);
  }

  const purple: { x: number; y: number }[] = [];
  for (let y = Math.floor(h * 0.28); y < h * 0.52; y++) {
    for (let x = Math.floor(w * 0.18); x < w * 0.82; x++) {
      const i = (y * w + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      if (b > 150 && r > 60 && b > g + 30 && luma(r, g, b) > 50) {
        purple.push({ x: x / w, y: y / h });
      }
    }
  }
  const eyes = clusterEyes(purple);
  for (const n of kept) {
    n.eye = eyes.some((e) => Math.hypot(n.x - e.x, n.y - e.y) < e.r * 1.35);
  }
  return { nodes: kept, eyes };
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

export function SolphiaFace({ mode = "panel" }: { mode?: "hero" | "panel" }) {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const photo = useRef<HTMLImageElement>(null);
  const hero = mode === "hero";

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
    let t = 0;
    let mx = 0.5;
    let my = 0.4;
    let tx = 0.5;
    let ty = 0.4;
    let hover = false;
    let blink = 1;
    let blinkT = 0;
    let nextBlink = 220 + Math.random() * 180;
    let box = { dx: 0, dy: 0, dw: 1, dh: 1 };
    let lastPw = 0;
    let lastPh = 0;
    let ready = pic.complete && pic.naturalWidth > 0;
    const packets: Packet[] = [];
    const reduce =
      typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const boot = () => {
      if (!pic.naturalWidth) return;
      ready = true;
      const out = analyze(pic, hero);
      nodes = out.nodes;
      eyes = out.eyes;
    };
    pic.addEventListener("load", boot);
    if (ready) boot();

    const toScreen = (x: number, y: number) => ({
      sx: box.dx + x * box.dw,
      sy: box.dy + y * box.dh,
    });

    const sparkAt = (nx: number, ny: number) => {
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
        if (cur.depth > 6) continue;
        for (const j of nodes[cur.i].links) {
          packets.push({
            a: cur.i,
            b: j,
            t: 0,
            speed: 0.045 + Math.random() * 0.03,
            wait: cur.depth * 3,
          });
          if (!seen.has(j)) {
            seen.add(j);
            q.push({ i: j, depth: cur.depth + 1 });
          }
        }
      }
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
      if (!hover) {
        tx = 0.5 + Math.sin(t * 0.0042) * 0.045;
        ty = 0.4 + Math.sin(t * 0.0031 + 0.7) * 0.028;
      }
      mx += (tx - mx) * 0.07;
      my += (ty - my) * 0.07;

      nextBlink -= reduce ? 0 : 1;
      if (nextBlink <= 0) {
        blinkT = 1;
        nextBlink = 260 + Math.random() * 240;
      }
      if (blinkT > 0) {
        blinkT -= 0.085;
        const k = Math.abs(blinkT - 0.5) * 2;
        blink = blinkT > 0 ? 0.12 + 0.88 * k : 1;
        if (blinkT <= 0) blink = 1;
      }

      const lookX = (mx - 0.5) * (hero ? 12 : 7);
      const lookY = (my - 0.4) * (hero ? 7 : 4);
      const breath = reduce ? 1 : 1 + Math.sin(t * 0.012) * 0.006;
      host.style.transform = `translate3d(${lookX}px, ${lookY}px, 0) scale(${breath})`;

      if (!ready || !pic.naturalWidth) {
        raf = requestAnimationFrame(loop);
        return;
      }

      box = fit(pic.naturalWidth, pic.naturalHeight, w, h, hero ? "contain" : "cover");
      const pulseY = 0.92 - ((t * 0.0026) % 1.15);
      const px = box.dx + mx * box.dw;
      const py = box.dy + my * box.dh;
      const heatR = hero ? 92 : 64;

      ctx.imageSmoothingEnabled = true;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.globalCompositeOperation = "screen";

      const heatOf = (n: Node, p: { sx: number; sy: number }) => {
        let heat = n.lum * 0.2 + 0.04 * (0.5 + 0.5 * Math.sin(t * 0.018 + n.lum * 12));
        const md = Math.hypot(p.sx - px, p.sy - py);
        if (md < heatR) heat += (1 - md / heatR) * 0.75;
        const gy = (n.y - pulseY) / 0.055;
        heat += Math.exp(-(gy * gy)) * 0.42;
        if (n.eye) heat *= 0.35 + 0.65 * blink;
        return heat;
      };

      ctx.beginPath();
      ctx.strokeStyle = "rgba(140,200,255,0.18)";
      ctx.lineWidth = 0.6;
      for (const n of nodes) {
        const p = toScreen(n.x, n.y);
        if (heatOf(n, p) > 0.85) continue;
        for (const j of n.links) {
          const q = toScreen(nodes[j].x, nodes[j].y);
          ctx.moveTo(p.sx, p.sy);
          ctx.lineTo(q.sx, q.sy);
        }
      }
      ctx.stroke();

      ctx.beginPath();
      ctx.strokeStyle = "rgba(20,241,149,0.42)";
      ctx.lineWidth = hero ? 1.1 : 0.85;
      for (const n of nodes) {
        const p = toScreen(n.x, n.y);
        if (heatOf(n, p) <= 0.85) continue;
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
        const rad = (hero ? 1.05 : 0.8) * (0.35 + heat * 1.05);
        if (heat > 0.95) {
          ctx.fillStyle = `rgba(20,241,149,${Math.min(0.8, 0.16 + heat * 0.32)})`;
          ctx.beginPath();
          ctx.arc(p.sx, p.sy, rad * 3.4, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = n.green
          ? `rgba(20,241,149,${Math.min(0.9, 0.12 + heat * 0.55)})`
          : `rgba(180,220,255,${Math.min(0.88, 0.1 + heat * 0.5)})`;
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
        ctx.fillStyle = `rgba(20,241,149,${0.4 + glow * 0.55})`;
        ctx.beginPath();
        ctx.arc(s.sx, s.sy, hero ? 2.2 : 1.6, 0, Math.PI * 2);
        ctx.fill();
      }

      const lookNX = (mx - 0.5) * 2;
      const lookNY = (my - 0.4) * 2;
      for (const e of eyes) {
        const p = toScreen(e.x, e.y);
        const rx = e.r * box.dw;
        const ry = e.r * box.dh * (0.55 + 0.45 * blink);
        const gx = p.sx + lookNX * rx * 0.28;
        const gy = p.sy + lookNY * ry * 0.22;
        const glow = ctx.createRadialGradient(gx, gy, 1, p.sx, p.sy, rx * 1.7);
        glow.addColorStop(0, `rgba(220,180,255,${0.28 * blink})`);
        glow.addColorStop(0.4, `rgba(153,69,255,${0.18 * blink})`);
        glow.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.ellipse(p.sx, p.sy, rx * 1.2, ry * 1.2, 0, 0, Math.PI * 2);
        ctx.fill();
        if (blink > 0.2) {
          ctx.fillStyle = `rgba(255,255,255,${0.62 * blink})`;
          ctx.beginPath();
          ctx.arc(gx + rx * 0.18, gy - ry * 0.12, Math.max(1.3, rx * 0.13), 0, Math.PI * 2);
          ctx.fill();
        }
      }

      const wash = ctx.createRadialGradient(px, py, 6, px, py, Math.max(box.dw, box.dh) * 0.38);
      wash.addColorStop(0, "rgba(20,241,149,0.09)");
      wash.addColorStop(0.4, "rgba(153,69,255,0.05)");
      wash.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = wash;
      ctx.fillRect(box.dx, box.dy, box.dw, box.dh);
      ctx.globalCompositeOperation = "source-over";

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
    host.addEventListener("pointermove", onMove, { passive: true });
    host.addEventListener("pointerdown", onDown);
    host.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(raf);
      pic.removeEventListener("load", boot);
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerdown", onDown);
      host.removeEventListener("pointerleave", onLeave);
      host.style.transform = "";
    };
  }, [hero]);

  return (
    <div
      ref={wrap}
      className={`relative touch-none select-none ${
        hero
          ? "h-[42vh] min-h-[260px] w-full sm:h-[56vh] lg:h-full lg:min-h-[560px]"
          : "h-[240px] w-full md:h-[300px]"
      }`}
      style={{
        willChange: "transform",
        transformOrigin: "50% 48%",
        isolation: "isolate",
        ...(hero
          ? {
              WebkitMaskImage: "linear-gradient(to bottom, #000 68%, transparent 96%)",
              maskImage: "linear-gradient(to bottom, #000 68%, transparent 96%)",
            }
          : {}),
      }}
      aria-hidden="true"
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 55% 60% at 50% 48%, rgba(20,241,149,0.10), rgba(153,69,255,0.06) 42%, transparent 70%)",
        }}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={photo}
        src="/solphia-face.png"
        alt=""
        draggable={false}
        className={`pointer-events-none absolute inset-0 h-full w-full ${
          hero ? "object-contain" : "object-cover"
        }`}
        style={{ filter: "brightness(1.12) saturate(1.08) contrast(1.06)" }}
      />
      <canvas ref={canvas} className="pointer-events-none absolute inset-0 h-full w-full" />
    </div>
  );
}
