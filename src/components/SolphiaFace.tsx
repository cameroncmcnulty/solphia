"use client";

import { useEffect, useRef } from "react";

const MORSE: Record<string, string> = {
  S: "...",
  O: "---",
  L: ".-..",
  P: ".--.",
  H: "....",
  I: "..",
  A: ".-",
};

export function SolphiaFace({ size = 520, interactive = true }: { size?: number; interactive?: boolean }) {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const el = wrap.current;
    if (!el || !interactive) return;
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      el.style.setProperty("--rx", `${y * -12}deg`);
      el.style.setProperty("--ry", `${x * 16}deg`);
    };
    const leave = () => {
      el.style.setProperty("--rx", "0deg");
      el.style.setProperty("--ry", "0deg");
    };
    window.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", leave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", leave);
    };
  }, [interactive]);

  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const code = "SOLPHIA".split("").map((ch) => MORSE[ch] || "").join(" / ");
    let frame = 0;
    let raf = 0;
    const draw = () => {
      const w = c.width;
      const h = c.height;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "rgba(92,255,216,0.55)";
      const t = frame / 40;
      for (let i = 0; i < code.length; i++) {
        const ch = code[i];
        const a = (i / code.length) * Math.PI * 2 + t;
        const rad = Math.min(w, h) * 0.46;
        const x = w / 2 + Math.cos(a) * rad;
        const y = h / 2 + Math.sin(a) * rad * 0.72;
        if (ch === ".") {
          ctx.beginPath();
          ctx.arc(x, y, 1.4, 0, Math.PI * 2);
          ctx.fill();
        } else if (ch === "-") {
          ctx.fillRect(x - 5, y - 0.7, 10, 1.4);
        }
      }
      frame += 1;
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div
      ref={wrap}
      className="relative"
      style={{
        width: size,
        height: size,
        perspective: 1200,
        transform: "rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg))",
        transition: "transform 0.4s ease-out",
      }}
    >
      <div className="face-orbit absolute inset-0">
        <div className="absolute inset-[8%] overflow-hidden rounded-full border border-cyan/20 shadow-glow">
          <img
            src="/solphia-face.jpg"
            alt="Solphia"
            className="h-full w-full object-cover opacity-90"
            draggable={false}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-void via-transparent to-cyan/10" />
        </div>
      </div>
      <canvas ref={canvas} width={size} height={size} className="absolute inset-0" />
      <div className="pointer-events-none absolute inset-[6%] rounded-full border border-acid/20 animate-[pulse-glow_4s_ease-in-out_infinite]" />
      <div className="pointer-events-none absolute left-1/2 top-[8%] -translate-x-1/2 font-mono text-[10px] tracking-[0.5em] text-cyan/70">
        ··· --- ·-·· ·--· ···· ·· ·-
      </div>
    </div>
  );
}
