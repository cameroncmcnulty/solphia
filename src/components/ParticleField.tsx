"use client";

import { useEffect, useRef } from "react";

export function ParticleField() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    let raf = 0;
    const dots = Array.from({ length: 88 }, () => ({
      x: Math.random(),
      y: Math.random(),
      v: 0.0001 + Math.random() * 0.00028,
      green: Math.random() > 0.52,
      tw: Math.random() * Math.PI * 2,
      tws: 0.012 + Math.random() * 0.02,
      r: 1.2 + Math.random() * 0.9,
    }));
    const resize = () => {
      c.width = window.innerWidth;
      c.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const draw = (animate: boolean) => {
      ctx.clearRect(0, 0, c.width, c.height);
      for (const d of dots) {
        if (animate) {
          d.y -= d.v;
          if (d.y < 0) d.y = 1;
          d.tw += d.tws;
        }
        const a = 0.42 + 0.28 * (0.5 + 0.5 * Math.sin(d.tw));
        ctx.fillStyle = d.green ? `rgba(20,241,149,${a.toFixed(3)})` : `rgba(201,168,255,${a.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(d.x * c.width, d.y * c.height, d.green ? d.r : d.r * 0.85, 0, Math.PI * 2);
        ctx.fill();
      }
    };
    if (reduced) {
      draw(false);
      return () => window.removeEventListener("resize", resize);
    }
    const loop = () => {
      draw(true);
      raf = requestAnimationFrame(loop);
    };
    loop();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={ref} className="pointer-events-none fixed inset-0 z-0 opacity-90" />;
}
