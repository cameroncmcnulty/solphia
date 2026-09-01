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
    const dots = Array.from({ length: 70 }, () => ({
      x: Math.random(),
      y: Math.random(),
      v: 0.00015 + Math.random() * 0.0004,
      dash: Math.random() > 0.55,
    }));
    const resize = () => {
      c.width = window.innerWidth;
      c.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);
    const loop = () => {
      ctx.clearRect(0, 0, c.width, c.height);
      ctx.fillStyle = "rgba(184,255,60,0.22)";
      for (const d of dots) {
        d.y -= d.v;
        if (d.y < 0) d.y = 1;
        const x = d.x * c.width;
        const y = d.y * c.height;
        if (d.dash) ctx.fillRect(x, y, 8, 1);
        else {
          ctx.beginPath();
          ctx.arc(x, y, 1.1, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      raf = requestAnimationFrame(loop);
    };
    loop();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={ref} className="pointer-events-none fixed inset-0 z-0 opacity-70" />;
}
