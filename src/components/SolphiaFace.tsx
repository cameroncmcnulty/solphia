"use client";

import { useEffect, useRef } from "react";

type Node = {
  x: number;
  y: number;
  z: number;
  base: number;
  phase: number;
  eye: boolean;
  links: number[];
};

export function SolphiaFace({ mode = "panel" }: { mode?: "hero" | "panel" }) {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const hero = mode === "hero";

  useEffect(() => {
    const c = canvas.current;
    const host = wrap.current;
    if (!c || !host) return;
    const ctx = c.getContext("2d", { alpha: true });
    if (!ctx) return;

    let raf = 0;
    let nodes: Node[] = [];
    let t = 0;
    let rotY = 0;
    let rotX = 0;
    let targetY = 0;
    let targetX = 0;
    let mx = 0.5;
    let my = 0.5;
    const ripples: { x: number; y: number; born: number }[] = [];
    let blink = 1;
    let nextBlink = 220;
    const portrait = new Image();
    portrait.src = "/solphia-face.jpg";

    function sample() {
      const iw = 480;
      const ih = 640;
      const off = document.createElement("canvas");
      off.width = iw;
      off.height = ih;
      const o = off.getContext("2d");
      if (!o) return;
      o.drawImage(portrait, 0, 0, iw, ih);
      const { data } = o.getImageData(0, 0, iw, ih);
      const raw: Node[] = [];
      for (let y = 0; y < ih; y += 2) {
        for (let x = 0; x < iw; x += 2) {
          const i = (y * iw + x) * 4;
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const lum = r * 0.25 + g * 0.5 + b * 0.25;
          if (lum < 18) continue;
          const nx = x / iw;
          const ny = y / ih;
          const keep = lum > 48 ? 0.85 : lum / 90;
          if (Math.random() > keep) continue;
          raw.push({
            x: nx,
            y: ny,
            z: (lum / 255 - 0.2) * 0.22,
            base: lum / 255,
            phase: Math.random() * Math.PI * 2,
            eye: nx > 0.38 && nx < 0.72 && ny > 0.28 && ny < 0.48,
            links: [],
          });
        }
      }
      raw.sort((a, b) => b.base - a.base);
      nodes = raw.slice(0, hero ? 2200 : 900);
      const cell = 0.035;
      const buckets = new Map<string, number[]>();
      nodes.forEach((n, idx) => {
        const key = `${Math.floor(n.x / cell)}_${Math.floor(n.y / cell)}`;
        const arr = buckets.get(key) || [];
        arr.push(idx);
        buckets.set(key, arr);
      });
      nodes.forEach((n, i) => {
        const gx = Math.floor(n.x / cell);
        const gy = Math.floor(n.y / cell);
        const cand: { j: number; d: number }[] = [];
        for (let ox = -1; ox <= 1; ox++) {
          for (let oy = -1; oy <= 1; oy++) {
            const list = buckets.get(`${gx + ox}_${gy + oy}`) || [];
            for (const j of list) {
              if (j <= i) continue;
              const b = nodes[j];
              const d = (n.x - b.x) ** 2 + (n.y - b.y) ** 2;
              if (d < 0.0028) cand.push({ j, d });
            }
          }
        }
        cand.sort((a, b) => a.d - b.d);
        n.links = cand.slice(0, 2).map((x) => x.j);
      });
    }

    portrait.onload = sample;
    if (portrait.complete) sample();

    function project(n: Node, w: number, h: number) {
      const cy = Math.cos(rotY);
      const sy = Math.sin(rotY);
      const cx = Math.cos(rotX);
      const sx = Math.sin(rotX);
      const x = n.x - 0.5;
      const y = n.y - 0.48;
      const xz = x * cy - n.z * sy;
      const zz = x * sy + n.z * cy;
      const yz = y * cx - zz * sx;
      const z2 = y * sx + zz * cx;
      const persp = 1 / (1.12 + z2 * 0.35);
      const scale = Math.min(w / 0.72, h / 0.95);
      return {
        sx: w * 0.5 + xz * scale * persp,
        sy: h * 0.52 + yz * scale * persp,
        persp,
      };
    }

    const loop = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(1, host.clientWidth);
      const h = Math.max(1, host.clientHeight);
      const pw = Math.floor(w * dpr);
      const ph = Math.floor(h * dpr);
      if (c.width !== pw || c.height !== ph) {
        c.width = pw;
        c.height = ph;
        c.style.width = `${w}px`;
        c.style.height = `${h}px`;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      t += 1;
      rotY += (targetY - rotY) * 0.06;
      rotX += (targetX - rotX) * 0.06;

      nextBlink -= 1;
      if (nextBlink <= 0) {
        blink = blink > 0.3 ? 0.12 : 1;
        nextBlink = blink === 1 ? 240 + Math.random() * 180 : 9;
      }

      const faceW = Math.min(w * 0.92, h * 0.72);
      const faceH = faceW * (portrait.naturalHeight / Math.max(portrait.naturalWidth, 1) || 1.33);
      const fx = (w - faceW) / 2;
      const fy = (h - faceH) / 2 + h * 0.02;
      if (portrait.complete && portrait.naturalWidth) {
        ctx.save();
        ctx.globalAlpha = 0.72;
        ctx.filter = "saturate(1.15) contrast(1.08) brightness(0.92)";
        ctx.drawImage(portrait, fx, fy, faceW, faceH);
        ctx.filter = "none";
        ctx.globalCompositeOperation = "screen";
        ctx.globalAlpha = 0.18;
        ctx.fillStyle = "#3a1a88";
        ctx.fillRect(fx, fy, faceW, faceH);
        ctx.globalCompositeOperation = "source-over";
        ctx.restore();
        if (blink < 0.5) {
          ctx.fillStyle = "rgba(4,0,10,0.55)";
          ctx.fillRect(fx + faceW * 0.38, fy + faceH * 0.32, faceW * 0.36, faceH * 0.08);
        }
      }

      const cxp = mx * w;
      const cyp = my * h;

      for (const n of nodes) {
        const p = project(n, w, h);
        let heat = n.base * 0.85 + 0.15 * Math.sin(t * 0.025 + n.phase);
        const md = Math.hypot(p.sx - cxp, p.sy - cyp);
        if (md < 70) heat += (1 - md / 70) * 0.7;
        for (const r of ripples) {
          const age = t - r.born;
          const rad = age * 3.2;
          const ring = Math.abs(Math.hypot(p.sx - r.x, p.sy - r.y) - rad);
          if (ring < 14) heat += (1 - ring / 14) * 0.8;
        }
        if (n.eye) heat *= blink;
        for (const j of n.links) {
          const q = project(nodes[j], w, h);
          const a = Math.min(0.45, 0.05 + heat * 0.22);
          ctx.strokeStyle = heat > 0.85 ? `rgba(20,241,149,${a})` : `rgba(120,210,255,${a})`;
          ctx.lineWidth = 0.6;
          ctx.beginPath();
          ctx.moveTo(p.sx, p.sy);
          ctx.lineTo(q.sx, q.sy);
          ctx.stroke();
        }
        const rad = (hero ? 1.05 : 0.85) * (0.5 + heat * 1.1);
        ctx.fillStyle =
          heat > 0.9
            ? `rgba(20,241,149,${0.25 + heat * 0.45})`
            : `rgba(140,210,255,${0.15 + heat * 0.5})`;
        ctx.beginPath();
        ctx.arc(p.sx, p.sy, rad, 0, Math.PI * 2);
        ctx.fill();
      }

      while (ripples.length && t - ripples[0].born > 80) ripples.shift();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    const onMove = (e: PointerEvent) => {
      const r = host.getBoundingClientRect();
      mx = (e.clientX - r.left) / r.width;
      my = (e.clientY - r.top) / r.height;
      targetY = (mx - 0.5) * 0.28;
      targetX = (0.5 - my) * 0.16;
    };
    const onDown = (e: PointerEvent) => {
      const r = host.getBoundingClientRect();
      ripples.push({ x: e.clientX - r.left, y: e.clientY - r.top, born: t });
    };
    const onLeave = () => {
      targetY = 0;
      targetX = 0;
    };
    host.addEventListener("pointermove", onMove);
    host.addEventListener("pointerdown", onDown);
    host.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(raf);
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerdown", onDown);
      host.removeEventListener("pointerleave", onLeave);
    };
  }, [hero]);

  return (
    <div
      ref={wrap}
      className={`relative touch-none ${
        hero ? "h-[56vh] min-h-[320px] w-full sm:h-[62vh] lg:h-full lg:min-h-[520px]" : "h-[220px] w-full md:h-[280px]"
      }`}
    >
      <canvas ref={canvas} className="absolute inset-0 h-full w-full" />
    </div>
  );
}
