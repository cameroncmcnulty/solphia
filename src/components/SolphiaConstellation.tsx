"use client";

import { useEffect, useRef } from "react";

type Star = { x: number; y: number; lum: number; phase: number; speed: number; cyan: boolean };

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
      if (lum < 88) continue;
      if (!(g > 90 || b > 110)) continue;
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
  const minD2 = 0.00055;
  for (const c of cand) {
    let ok = true;
    for (const s of kept) {
      const dx = s.x - c.x;
      const dy = s.y - c.y;
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
      cyan: c.cyan,
      phase: Math.random() * Math.PI * 2,
      speed: 0.018 + Math.random() * 0.042,
    });
    if (kept.length >= 220) break;
  }
  return kept;
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
      for (const s of stars) {
        const twinkle = reduce ? 0.55 : 0.22 + 0.78 * (0.5 + 0.5 * Math.sin(t * s.speed + s.phase)) ** 2;
        const a = s.lum * twinkle;
        const sx = box.dx + s.x * box.dw;
        const sy = box.dy + s.y * box.dh;
        const rad = (s.lum > 0.72 ? 2.4 : 1.15) * (0.65 + a);
        if (a > 0.55) {
          ctx.fillStyle = s.cyan ? `rgba(20,241,149,${a * 0.28})` : `rgba(201,168,255,${a * 0.26})`;
          ctx.beginPath();
          ctx.arc(sx, sy, rad * 3.2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = s.cyan
          ? `rgba(180,255,230,${Math.min(0.95, 0.2 + a * 0.8)})`
          : `rgba(230,210,255,${Math.min(0.92, 0.18 + a * 0.75)})`;
        ctx.beginPath();
        ctx.arc(sx, sy, rad, 0, Math.PI * 2);
        ctx.fill();
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
    <div ref={wrap} className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={photo}
        src="/solphia-constellation.jpg?v=2"
        alt=""
        draggable={false}
        className="absolute inset-0 h-full w-full object-contain object-right"
        style={{ opacity: 0.4 }}
      />
      <canvas ref={canvas} className="pointer-events-none absolute inset-0 h-full w-full" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_28%_18%,rgba(153,69,255,0.08),transparent_42%),linear-gradient(to_right,rgba(4,0,10,0.58)_0%,rgba(4,0,10,0.18)_42%,transparent_70%),linear-gradient(to_bottom,transparent_62%,rgba(4,0,10,0.62)_100%)]" />
    </div>
  );
}
