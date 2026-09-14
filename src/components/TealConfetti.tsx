"use client";

import { useEffect, useState, type CSSProperties } from "react";

const COLORS = ["#14f195", "#5eead4", "#80eaff", "#99f6e4", "#c9a8ff", "#67e8f9"];

export function TealConfetti({ fire }: { fire: boolean }) {
  const [bits, setBits] = useState<{ id: number; style: Record<string, string> }[]>([]);
  useEffect(() => {
    if (!fire) return;
    const next = Array.from({ length: 42 }, (_, i) => ({
      id: i,
      style: {
        "--cl": `${Math.random() * 100}%`,
        "--cw": `${6 + Math.random() * 10}px`,
        "--ch": `${8 + Math.random() * 14}px`,
        "--cc": COLORS[i % COLORS.length],
        "--cd": `${1.1 + Math.random() * 1.4}s`,
        "--cx": `${-40 + Math.random() * 80}px`,
      },
    }));
    setBits(next);
    const t = window.setTimeout(() => setBits([]), 2600);
    return () => window.clearTimeout(t);
  }, [fire]);
  if (!bits.length) return null;
  return (
    <div className="teal-confetti" aria-hidden>
      {bits.map((b) => (
        <i key={b.id} style={b.style as CSSProperties} />
      ))}
    </div>
  );
}
