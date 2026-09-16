"use client";

import { useEffect, useRef } from "react";

type Node = { x: number; y: number; lum: number; links: number[] };
type Packet = { a: number; b: number; t: number; speed: number };

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

function analyze(img: HTMLImageElement) {
  const iw = img.naturalWidth || 1;
  const ih = img.naturalHeight || 1;
  const scale = Math.min(1, 380 / iw);
  const w = Math.max(1, Math.round(iw * scale));
  const h = Math.max(1, Math.round(ih * scale));
  const off = document.createElement("canvas");
  off.width = w;
  off.height = h;
  const o = off.getContext("2d", { willReadFrequently: true });
  if (!o) return [] as Node[];
  o.drawImage(img, 0, 0, w, h);
  const { data } = o.getImageData(0, 0, w, h);
  const cand: { x: number; y: number; lum: number }[] = [];
  for (let y = 2; y < h - 2; y++) {
    for (let x = 2; x < w - 2; x++) {
      const i = (y * w + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const L = luma(r, g, b);
      if (L < 70) continue;
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
      if (peak) cand.push({ x: x / w, y: y / h, lum: L / 255 });
    }
  }
  cand.sort((a, b) => b.lum - a.lum);
  const kept: Node[] = [];
  const minD2 = 0.00115;
  for (const c of cand) {
    if (kept.some((n) => (n.x - c.x) ** 2 + (n.y - c.y) ** 2 < minD2)) continue;
    kept.push({ x: c.x, y: c.y, lum: c.lum, links: [] });
    if (kept.length >= 96) break;
  }
  const maxLink = 0.0048;
  for (let i = 0; i < kept.length; i++) {
    const near: { j: number; d: number }[] = [];
    for (let j = i + 1; j < kept.length; j++) {
      const d = (kept[i].x - kept[j].x) ** 2 + (kept[i].y - kept[j].y) ** 2;
      if (d < maxLink) near.push({ j, d });
    }
    near.sort((a, b) => a.d - b.d);
    kept[i].links = near.slice(0, 2).map((x) => x.j);
  }
  return kept;
}

const VOID = "#04000a";
const PANEL_FADE = [
  `linear-gradient(to bottom, transparent 0%, transparent 55%, rgba(4,0,10,0.4) 75%, ${VOID} 100%)`,
  `radial-gradient(ellipse 80% 85% at 50% 42%, transparent 50%, ${VOID} 100%)`,
].join(", ");

export function SolphiaFace({ mode = "panel" }: { mode?: "hero" | "panel" | "launch" }) {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const photo = useRef<HTMLImageElement>(null);
  const hero = mode === "hero";
  const launch = mode === "launch";
  const src = launch ? "/solphia-launch.jpg?v=7" : hero ? "/solphia-hero.jpg?v=7" : "/solphia-face.jpg?v=7";

  useEffect(() => {
    const c = canvas.current;
    const host = wrap.current;
    const pic = photo.current;
    if (!c || !host || !pic) return;
    const ctx = c.getContext("2d", { alpha: true });
    if (!ctx) return;

    let raf = 0;
    let nodes: Node[] = [];
    let mx = 0.5;
    let my = 0.4;
    let box = { dx: 0, dy: 0, dw: 1, dh: 1 };
    let lastPw = 0;
    let lastPh = 0;
    let ready = pic.complete && pic.naturalWidth > 0;
    let nextSpawn = 24 + Math.random() * 50;
    let tw = 0;
    const packets: Packet[] = [];
    const reduce =
      typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const boot = () => {
      if (!pic.naturalWidth) return;
      ready = true;
      nodes = analyze(pic);
    };
    pic.addEventListener("load", boot);
    if (ready) boot();

    const toScreen = (x: number, y: number) => ({
      sx: box.dx + x * box.dw,
      sy: box.dy + y * box.dh,
    });

    const spawn = (prefer?: { x: number; y: number }) => {
      if (!nodes.length || packets.length >= 4) return;
      let i = (Math.random() * nodes.length) | 0;
      if (prefer) {
        let bd = 1e9;
        for (let k = 0; k < nodes.length; k++) {
          const d = (nodes[k].x - prefer.x) ** 2 + (nodes[k].y - prefer.y) ** 2;
          if (d < bd && nodes[k].links.length) {
            bd = d;
            i = k;
          }
        }
      }
      const n = nodes[i];
      if (!n?.links.length) return;
      packets.push({
        a: i,
        b: n.links[(Math.random() * n.links.length) | 0],
        t: 0,
        speed: 0.0048 + Math.random() * 0.0035,
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
      tw += 1;
      if (!ready || !pic.naturalWidth) {
        raf = requestAnimationFrame(loop);
        return;
      }
      box = fit(pic.naturalWidth, pic.naturalHeight, w, h, hero ? "contain" : "cover");

      if (!reduce) {
        nextSpawn -= 1;
        if (nextSpawn <= 0) {
          spawn();
          nextSpawn = 55 + Math.random() * 110;
        }
      }

      ctx.globalCompositeOperation = "screen";
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      ctx.beginPath();
      ctx.strokeStyle = "rgba(20,241,149,0.11)";
      ctx.lineWidth = 0.75;
      for (const n of nodes) {
        const p = toScreen(n.x, n.y);
        for (const j of n.links) {
          const q = toScreen(nodes[j].x, nodes[j].y);
          ctx.moveTo(p.sx, p.sy);
          ctx.lineTo(q.sx, q.sy);
        }
      }
      ctx.stroke();

      for (const n of nodes) {
        const p = toScreen(n.x, n.y);
        const g = 0.1 + 0.22 * (0.5 + 0.5 * Math.sin(tw * 0.03 + n.lum * 18));
        ctx.fillStyle = `rgba(20,241,149,${n.lum * g})`;
        ctx.beginPath();
        ctx.arc(p.sx, p.sy, n.lum > 0.72 ? 1.35 : 0.7, 0, Math.PI * 2);
        ctx.fill();
      }

      for (const p of packets) {
        const a = nodes[p.a];
        const b = nodes[p.b];
        if (!a || !b) continue;
        const s0 = toScreen(a.x, a.y);
        const s1 = toScreen(b.x, b.y);
        const glow = 0.25 + 0.55 * (1 - Math.abs(p.t - 0.5) * 2);
        ctx.beginPath();
        ctx.strokeStyle = `rgba(20,241,149,${0.28 + glow * 0.4})`;
        ctx.lineWidth = hero ? 1.5 : 1.1;
        ctx.moveTo(s0.sx, s0.sy);
        ctx.lineTo(s1.sx, s1.sy);
        ctx.stroke();
        const sx = s0.sx + (s1.sx - s0.sx) * p.t;
        const sy = s0.sy + (s1.sy - s0.sy) * p.t;
        const rad = ctx.createRadialGradient(sx, sy, 0, sx, sy, hero ? 18 : 12);
        rad.addColorStop(0, `rgba(230,255,245,${0.7 + glow * 0.22})`);
        rad.addColorStop(0.3, `rgba(20,241,149,${0.36 + glow * 0.22})`);
        rad.addColorStop(1, "rgba(20,241,149,0)");
        ctx.fillStyle = rad;
        ctx.beginPath();
        ctx.arc(sx, sy, hero ? 18 : 12, 0, Math.PI * 2);
        ctx.fill();
      }

      const hx = box.dx + mx * box.dw;
      const hy = box.dy + my * box.dh;
      const washR = Math.min(box.dw, box.dh) * 0.22;
      const wash = ctx.createRadialGradient(hx, hy, 4, hx, hy, washR);
      wash.addColorStop(0, "rgba(20,241,149,0.06)");
      wash.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = wash;
      ctx.beginPath();
      ctx.arc(hx, hy, washR, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = "source-over";

      for (let i = packets.length - 1; i >= 0; i--) {
        packets[i].t += packets[i].speed;
        if (packets[i].t >= 1) {
          const fin = packets[i];
          const n = nodes[fin.b];
          packets.splice(i, 1);
          if (n?.links.length && packets.length < 4 && Math.random() < 0.5) {
            const next = n.links.filter((j) => j !== fin.a);
            if (next.length) {
              packets.push({
                a: fin.b,
                b: next[(Math.random() * next.length) | 0],
                t: 0,
                speed: fin.speed,
              });
            }
          }
        }
      }

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    const onMove = (e: PointerEvent) => {
      const r = host.getBoundingClientRect();
      mx = (e.clientX - r.left) / Math.max(1, r.width);
      my = (e.clientY - r.top) / Math.max(1, r.height);
    };
    const onDown = (e: PointerEvent) => {
      const r = host.getBoundingClientRect();
      const nx = (e.clientX - r.left - box.dx) / Math.max(1, box.dw);
      const ny = (e.clientY - r.top - box.dy) / Math.max(1, box.dh);
      spawn({ x: nx, y: ny });
    };
    host.addEventListener("pointermove", onMove, { passive: true });
    host.addEventListener("pointerdown", onDown);
    return () => {
      cancelAnimationFrame(raf);
      pic.removeEventListener("load", boot);
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerdown", onDown);
    };
  }, [hero, launch, src]);

  return (
    <div
      ref={wrap}
      className={`relative select-none outline-none ${
        launch
          ? "h-full w-full overflow-hidden"
          : hero
            ? "solphia-hero-veil mx-auto aspect-[3/4] w-full overflow-visible"
            : "h-[240px] w-full overflow-hidden md:h-[300px]"
      }`}
      style={{ isolation: "isolate", WebkitTapHighlightColor: "transparent" }}
    >
      <div className={hero ? "solphia-hero-extend absolute inset-0" : "absolute inset-0"}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={photo}
          src={src}
          alt=""
          draggable={false}
          className={`pointer-events-none absolute inset-0 h-full w-full outline-none ${
            hero ? "object-contain object-top" : launch ? "object-cover object-[82%_42%]" : "object-cover"
          }`}
        />
        {hero ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt=""
            draggable={false}
            className="solphia-locks pointer-events-none absolute inset-0 h-full w-full object-contain object-top"
          />
        ) : null}
        <canvas ref={canvas} className="pointer-events-none absolute inset-0 h-full w-full" />
      </div>
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
