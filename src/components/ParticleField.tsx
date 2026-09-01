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
    const dots = Array.from({ length: 55 }, () => ({
      x: Math.random(),
      y: Math.random(),
      v: 0.00012 + Math.random() * 0.0003,
      green: Math.random() > 0.55,
    }));
    const resize = () => {
      c.width = window.innerWidth;
      c.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);
    const loop = () => {
      ctx.clearRect(0, 0, c.width, c.height);
      for (const d of dots) {
        d.y -= d.v;
        if (d.y < 0) d.y = 1;
        ctx.fillStyle = d.green ? "rgba(20,241,149,0.28)" : "rgba(153,69,255,0.28)";
        ctx.beginPath();
        ctx.arc(d.x * c.width, d.y * c.height, d.green ? 1.4 : 1.1, 0, Math.PI * 2);
        ctx.fill();
      }
      raf = requestAnimationFrame(loop);
    };
    loop();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={ref} className="pointer-events-none fixed inset-0 z-0 opacity-60" />;
}
