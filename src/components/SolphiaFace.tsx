"use client";

import { useEffect, useRef } from "react";

type Node = {
  x: number;
  y: number;
  z: number;
  lum: number;
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
    let rotY = -0.35;
    let rotX = 0.08;
    let targetY = -0.35;
    let targetX = 0.08;
    let mx = 0.5;
    let my = 0.5;
    const ripples: { x: number; y: number; born: number }[] = [];
    let blink = 1;
    let nextBlink = 180;

    const img = new Image();
    img.src = "/solphia-face.jpg";
    img.crossOrigin = "anonymous";

    function sample() {
      const iw = 420;
      const ih = 236;
      const off = document.createElement("canvas");
      off.width = iw;
      off.height = ih;
      const o = off.getContext("2d");
      if (!o) return;
      o.drawImage(img, 0, 0, iw, ih);
      const { data } = o.getImageData(0, 0, iw, ih);
      const raw: Node[] = [];
      for (let y = 0; y < ih; y += 2) {
        for (let x = 0; x < iw; x += 2) {
          if (x > iw * 0.68) continue;
          const i = (y * iw + x) * 4;
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const lum = r * 0.22 + g * 0.55 + b * 0.23;
          if (lum < 26) continue;
          const nx = x / iw;
          const ny = y / ih;
          const face = nx > 0.04 && nx < 0.62 && ny > 0.08 && ny < 0.92;
          if (!face) continue;
          const p = (lum / 255) * (hero ? 0.55 : 0.38);
          if (Math.random() > p) continue;
          raw.push({
            x: nx,
            y: ny,
            z: (lum / 255 - 0.25) * 0.55 + (0.42 - Math.abs(nx - 0.42)) * 0.25,
            lum,
            phase: Math.random() * Math.PI * 2,
            eye: nx > 0.4 && nx < 0.54 && ny > 0.3 && ny < 0.5,
            links: [],
          });
        }
      }
      raw.sort((a, b) => b.lum - a.lum);
      nodes = raw.slice(0, hero ? 1400 : 700);
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        const near: { j: number; d: number }[] = [];
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const d = dx * dx + dy * dy;
          if (d < 0.0045) near.push({ j, d });
        }
        near.sort((u, v) => u.d - v.d);
        a.links = near.slice(0, 3).map((n) => n.j);
      }
    }

    img.onload = sample;
    if (img.complete) sample();

    function project(n: Node, w: number, h: number) {
      const cy = Math.cos(rotY);
      const sy = Math.sin(rotY);
      const cx = Math.cos(rotX);
      const sx = Math.sin(rotX);
      const x = n.x - 0.4;
      const y = n.y - 0.48;
      const z = n.z;
      const xz = x * cy - z * sy;
      const zz = x * sy + z * cy;
      const yz = y * cx - zz * sx;
      const z2 = y * sx + zz * cx;
      const persp = 1.05 / (1.35 + z2);
      return {
        sx: w * 0.52 + xz * w * persp * 1.55,
        sy: h * 0.5 + yz * h * persp * 1.55,
        depth: z2,
        persp,
      };
    }

    const loop = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(1, host.clientWidth);
      const h = Math.max(1, host.clientHeight);
      if (c.width !== w * dpr || c.height !== h * dpr) {
        c.width = w * dpr;
        c.height = h * dpr;
        c.style.width = w + "px";
        c.style.height = h + "px";
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      t += 1;
      rotY += (targetY - rotY) * 0.04;
      rotX += (targetX - rotX) * 0.04;
      rotY += 0.0016;

      nextBlink -= 1;
      if (nextBlink <= 0) {
        blink = blink > 0.2 ? 0.05 : 1;
        if (blink === 1) nextBlink = 200 + Math.random() * 160;
        else nextBlink = 8;
      }

      const cxp = mx * w;
      const cyp = my * h;

      ctx.fillStyle = "rgba(4,0,10,0.15)";
      ctx.fillRect(0, 0, w, h);

      for (const n of nodes) {
        const p = project(n, w, h);
        const pulse = 0.55 + 0.45 * Math.sin(t * 0.03 + n.phase);
        let heat = pulse;
        const dx = p.sx - cxp;
        const dy = p.sy - cyp;
        const md = Math.sqrt(dx * dx + dy * dy);
        if (md < 90) heat += (1 - md / 90) * 1.1;
        for (const r of ripples) {
          const age = t - r.born;
          const rad = age * 4;
          const ddx = p.sx - r.x;
          const ddy = p.sy - r.y;
          const dist = Math.sqrt(ddx * ddx + ddy * ddy);
          const ring = Math.abs(dist - rad);
          if (ring < 18) heat += (1 - ring / 18) * 1.4;
        }
        if (n.eye) heat *= blink;
        n.lum = heat;
        for (const j of n.links) {
          const q = project(nodes[j], w, h);
          const a = Math.min(0.55, 0.06 + heat * 0.12);
          ctx.strokeStyle = heat > 1.3 ? `rgba(20,241,149,${a})` : `rgba(128,210,255,${a})`;
          ctx.lineWidth = heat > 1.4 ? 1.4 : 0.7;
          ctx.beginPath();
          ctx.moveTo(p.sx, p.sy);
          ctx.lineTo(q.sx, q.sy);
          ctx.stroke();
        }
      }

      for (const n of nodes) {
        const p = project(n, w, h);
        const heat = n.lum;
        const r = (hero ? 1.15 : 0.9) * (0.7 + heat * 0.9) * p.persp * 1.6;
        const g = heat > 1.35;
        ctx.fillStyle = g
          ? `rgba(20,241,149,${Math.min(1, 0.35 + heat * 0.4)})`
          : n.eye
            ? `rgba(200,170,255,${0.25 + heat * 0.5})`
            : `rgba(110,200,255,${0.2 + heat * 0.45})`;
        ctx.beginPath();
        ctx.arc(p.sx, p.sy, r, 0, Math.PI * 2);
        ctx.fill();
      }

      while (ripples.length && t - ripples[0].born > 90) ripples.shift();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    const onMove = (e: PointerEvent) => {
      const r = host.getBoundingClientRect();
      mx = (e.clientX - r.left) / r.width;
      my = (e.clientY - r.top) / r.height;
      targetY = -0.2 + (mx - 0.5) * 0.9;
      targetX = 0.05 + (0.5 - my) * 0.4;
    };
    const onDown = (e: PointerEvent) => {
      const r = host.getBoundingClientRect();
      ripples.push({
        x: e.clientX - r.left,
        y: e.clientY - r.top,
        born: t,
      });
    };
    const onLeave = () => {
      targetY = -0.35;
      targetX = 0.08;
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
      className={`relative cursor-crosshair touch-none ${
        hero ? "h-[48vh] min-h-[280px] w-full sm:h-[58vh] lg:h-full lg:min-h-[560px]" : "h-[200px] w-full md:h-[280px]"
      }`}
    >
      <canvas ref={canvas} className="absolute inset-0 h-full w-full" />
      <div className="pointer-events-none absolute inset-y-0 left-0 w-1/4 bg-gradient-to-r from-void to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-void to-transparent" />
    </div>
  );
}
