"use client";

import { useEffect, useState } from "react";

export function Cursor() {
  const [pos, setPos] = useState({ x: -40, y: -40 });
  const [down, setDown] = useState(false);

  useEffect(() => {
    const move = (e: PointerEvent) => setPos({ x: e.clientX, y: e.clientY });
    const on = () => setDown(true);
    const off = () => setDown(false);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerdown", on);
    window.addEventListener("pointerup", off);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerdown", on);
      window.removeEventListener("pointerup", off);
    };
  }, []);

  return (
    <>
      <div
        className="cursor-dot pointer-events-none fixed z-[80] mix-blend-screen"
        style={{
          left: pos.x,
          top: pos.y,
          transform: `translate(-50%, -50%) scale(${down ? 0.6 : 1})`,
        }}
      >
        <div className="h-1.5 w-1.5 rounded-full bg-acid" />
      </div>
      <div
        className="cursor-ring pointer-events-none fixed z-[79] border border-violet/60 rounded-full mix-blend-screen transition-transform duration-200"
        style={{
          left: pos.x,
          top: pos.y,
          width: down ? 18 : 28,
          height: down ? 18 : 28,
          transform: "translate(-50%, -50%)",
        }}
      />
    </>
  );
}
