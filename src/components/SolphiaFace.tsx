"use client";

import { useEffect, useRef } from "react";

export function SolphiaFace({
  mode = "panel",
}: {
  mode?: "hero" | "panel";
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      el.style.transform = `perspective(1400px) rotateY(${x * 10}deg) rotateX(${-y * 6}deg)`;
    };
    const leave = () => {
      el.style.transform = "perspective(1400px) rotateY(-8deg) rotateX(2deg)";
    };
    leave();
    window.addEventListener("pointermove", move);
    el.addEventListener("pointerleave", leave);
    return () => {
      window.removeEventListener("pointermove", move);
      el.removeEventListener("pointerleave", leave);
    };
  }, []);

  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    let raf = 0;
    let t = 0;
    const nodes = Array.from({ length: 48 }, (_, i) => ({
      a: (i / 48) * Math.PI * 2,
      r: 0.28 + (i % 7) * 0.04,
      phase: Math.random() * Math.PI * 2,
      hot: Math.random(),
    }));
    const loop = () => {
      const w = (c.width = c.clientWidth * 2);
      const h = (c.height = c.clientHeight * 2);
      ctx.clearRect(0, 0, w, h);
      t += 0.008;
      const cx = w * 0.42;
      const cy = h * 0.48;
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        const pulse = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * 0.9 + n.phase));
        n.hot = pulse;
        const x = cx + Math.cos(n.a + t * 0.05) * n.r * w;
        const y = cy + Math.sin(n.a + t * 0.05) * n.r * h * 0.85;
        const nxt = nodes[(i + 5) % nodes.length];
        const x2 = cx + Math.cos(nxt.a + t * 0.05) * nxt.r * w;
        const y2 = cy + Math.sin(nxt.a + t * 0.05) * nxt.r * h * 0.85;
        ctx.strokeStyle = `rgba(153,69,255,${0.08 + pulse * 0.18})`;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        ctx.fillStyle = pulse > 0.82 ? `rgba(20,241,149,${pulse})` : `rgba(128,234,255,${0.35 + pulse * 0.5})`;
        ctx.beginPath();
        ctx.arc(x, y, pulse > 0.82 ? 3.2 : 1.6, 0, Math.PI * 2);
        ctx.fill();
      }
      raf = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(raf);
  }, []);

  const hero = mode === "hero";

  return (
    <div
      ref={wrap}
      className={`relative ${hero ? "h-[42vh] min-h-[240px] w-full sm:h-[56vh] lg:h-[78vh] lg:min-h-[520px]" : "h-[180px] w-full md:h-[280px]"}`}
      style={{ transformStyle: "preserve-3d", transition: "transform 0.45s ease" }}
    >
      <img
        src="/solphia-face.jpg"
        alt="Solphia"
        className="absolute inset-0 h-full w-full object-cover object-[18%_center] opacity-95"
        draggable={false}
      />
      <div className="absolute inset-0 bg-gradient-to-r from-void via-void/10 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-void via-transparent to-void/40" />
      <canvas ref={canvas} className="absolute inset-0 h-full w-full mix-blend-screen opacity-80" />
      <div
        className="pointer-events-none absolute rounded-full bg-void"
        style={{
          left: "46%",
          top: "38%",
          width: hero ? 42 : 22,
          height: hero ? 14 : 8,
          animation: "blink-lid 5.6s ease-in-out infinite",
          boxShadow: "0 0 18px 8px #04000a",
        }}
      />
    </div>
  );
}
