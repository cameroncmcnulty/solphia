"use client";

import { useEffect, useRef } from "react";

type Star = { x: number; y: number; lum: number; phase: number; speed: number; cyan: boolean };
type Photon = { path: number[]; t: number; speed: number };

function containRight(iw: number, ih: number, cw: number, ch: number) {
  const ir = iw / ih;
  const cr = cw / ch;
  let dw: number;
  let dh: number;
  if (cr > ir) {
    dh = ch;
    dw = ch * ir;
  } else {
    dw = cw;
    dh = cw / ir;
  }
  return { dx: cw - dw, dy: (ch - dh) / 2, dw, dh };
}

function sampleStars(img: HTMLImageElement): Star[] {
  const iw = img.naturalWidth || 1;
  const ih = img.naturalHeight || 1;
  const scale = Math.min(1, 360 / iw);
  const w = Math.max(1, Math.round(iw * scale));
  const h = Math.max(1, Math.round(ih * scale));
  const off = document.createElement("canvas");
  off.width = w;
  off.height = h;
  const o = off.getContext("2d", { willReadFrequently: true });
  if (!o) return [];
  o.drawImage(img, 0, 0, w, h);
  const { data } = o.getImageData(0, 0, w, h);
  const cand: { x: number; y: number; lum: number; cyan: boolean }[] = [];
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = (y * w + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const lum = r * 0.2 + g * 0.55 + b * 0.25;
      if (lum < 150) continue;
      if (!(g > 155 || b > 165)) continue;
      cand.push({
        x: x / w,
        y: y / h,
        lum: Math.min(1, lum / 255),
        cyan: g >= b,
      });
    }
  }
  cand.sort((a, b) => b.lum - a.lum);
  const kept: Star[] = [];
  const minD2 = 0.0024;
  for (const c of cand) {
    if (kept.some((s) => (s.x - c.x) ** 2 + (s.y - c.y) ** 2 < minD2)) continue;
    kept.push({
      x: c.x,
      y: c.y,
      lum: c.lum,
      cyan: c.cyan,
      phase: Math.random() * Math.PI * 2,
      speed: 0.01 + Math.random() * 0.018,
    });
    if (kept.length >= 64) break;
  }
  return kept;
}

function walk(stars: Star[], from: number, len = 5): number[] {
  const path = [from];
  let cur = from;
  const used = new Set([from]);
  for (let n = 0; n < len; n++) {
    let best = -1;
    let bd = 0.018;
    for (let j = 0; j < stars.length; j++) {
      if (used.has(j)) continue;
      const d = (stars[cur].x - stars[j].x) ** 2 + (stars[cur].y - stars[j].y) ** 2;
      if (d < bd) {
        bd = d;
        best = j;
      }
    }
    if (best < 0) break;
    path.push(best);
    used.add(best);
    cur = best;
  }
  return path;
}

export function SolphiaConstellation() {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const photo = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const host = wrap.current;
    const c = canvas.current;
    const pic = photo.current;
    if (!host || !c || !pic) return;
    const ctx = c.getContext("2d", { alpha: true });
    if (!ctx) return;

    let raf = 0;
    let stars: Star[] = [];
    let box = { dx: 0, dy: 0, dw: 1, dh: 1 };
    let lastPw = 0;
    let lastPh = 0;
    let t = 0;
    let ready = pic.complete && pic.naturalWidth > 0;
    let photon: Photon | null = null;
    let wait = 80;
    const reduce =
      typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const boot = () => {
      if (!pic.naturalWidth) return;
      ready = true;
      stars = sampleStars(pic);
    };
    pic.addEventListener("load", boot);
    if (ready) boot();

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
      if (!ready || !pic.naturalWidth) {
        raf = requestAnimationFrame(loop);
        return;
      }
      box = containRight(pic.naturalWidth, pic.naturalHeight, w, h);
      t += reduce ? 0 : 1;
      ctx.globalCompositeOperation = "screen";

      if (!reduce) {
        if (!photon) {
          wait -= 1;
          if (wait <= 0 && stars.length > 4) {
            const start = (Math.random() * stars.length) | 0;
            const path = walk(stars, start, 4 + ((Math.random() * 3) | 0));
            if (path.length > 1) photon = { path, t: 0, speed: 0.006 + Math.random() * 0.004 };
            wait = 140 + Math.random() * 220;
          }
        } else {
          photon.t += photon.speed;
          if (photon.t >= photon.path.length - 1) photon = null;
        }
      }

      for (const s of stars) {
        const twinkle = reduce ? 0.2 : 0.12 + 0.28 * (0.5 + 0.5 * Math.sin(t * s.speed + s.phase));
        const a = s.lum * twinkle;
        const sx = box.dx + s.x * box.dw;
        const sy = box.dy + s.y * box.dh;
        ctx.fillStyle = s.cyan ? `rgba(20,241,149,${a * 0.42})` : `rgba(201,168,255,${a * 0.34})`;
        ctx.beginPath();
        ctx.arc(sx, sy, s.lum > 0.8 ? 2.1 : 1.5, 0, Math.PI * 2);
        ctx.fill();
      }

      if (photon && photon.path.length > 1) {
        const seg = Math.min(photon.path.length - 2, Math.floor(photon.t));
        const f = photon.t - seg;
        const a = stars[photon.path[seg]];
        const b = stars[photon.path[seg + 1]];
        if (a && b) {
          const sx = box.dx + (a.x + (b.x - a.x) * f) * box.dw;
          const sy = box.dy + (a.y + (b.y - a.y) * f) * box.dh;
          const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, 20);
          g.addColorStop(0, "rgba(230,255,245,0.68)");
          g.addColorStop(0.35, "rgba(20,241,149,0.28)");
          g.addColorStop(1, "rgba(20,241,149,0)");
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(sx, sy, 20, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.globalCompositeOperation = "source-over";
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      pic.removeEventListener("load", boot);
    };
  }, []);

  return (
    <div ref={wrap} className="pointer-events-none fixed inset-0 z-0 isolate overflow-hidden bg-void" aria-hidden="true">
      <div className="solphia-constellation-veil absolute inset-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={photo}
          src="/solphia-body.png?v=8"
          alt=""
          draggable={false}
          className="solphia-breathe absolute inset-0 h-full w-full object-contain object-right"
        />
        <canvas ref={canvas} className="pointer-events-none absolute inset-0 h-full w-full" />
      </div>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_22%_16%,rgba(153,69,255,0.07),transparent_46%),linear-gradient(to_right,rgba(4,0,10,0.45)_0%,rgba(4,0,10,0.06)_42%,transparent_68%)]" />
    </div>
  );
}
