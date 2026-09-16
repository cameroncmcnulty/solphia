"use client";

import type { CSSProperties } from "react";
import { useMarket } from "@/lib/hooks";

const MARKS: { id: string; t: string; cls: string; delay: string; dur: string; key: "sol" | "spyx" | "qqqx" | "gldx" | "spha" }[] = [
  { id: "SPYx", t: "SPYx", cls: "left-[0%] top-[4%]", delay: "0s", dur: "7.2s", key: "spyx" },
  { id: "QQQx", t: "QQQx", cls: "right-[0%] top-[8%]", delay: "0.8s", dur: "6.4s", key: "qqqx" },
  { id: "GLDx", t: "GLDx", cls: "right-[0%] top-[50%]", delay: "1.4s", dur: "8.1s", key: "gldx" },
  { id: "SPHA", t: "$SPHA", cls: "left-[0%] top-[52%]", delay: "0.45s", dur: "6.8s", key: "spha" },
  { id: "SOL", t: "SOL", cls: "left-[30%] bottom-[1%]", delay: "1.1s", dur: "7.6s", key: "sol" },
];

function fmt(n?: number) {
  if (!(typeof n === "number" && n > 0)) return "";
  if (n >= 1000) return n.toFixed(0);
  if (n >= 10) return n.toFixed(2);
  return n.toFixed(3);
}

export function OrbitTickers() {
  const { data } = useMarket(15_000);
  const px: Record<string, number | undefined> = {
    sol: Number(data?.solUsd) || undefined,
    spyx: Number(data?.spyxUsd) || undefined,
    qqqx: Number(data?.qqqxUsd) || undefined,
    gldx: Number(data?.gldxUsd) || undefined,
  };
  return (
    <div className="pointer-events-none absolute inset-0 z-10 overflow-visible" aria-hidden>
      {MARKS.map((m) => (
        <span
          key={m.id}
          className={`hover-mark absolute whitespace-nowrap rounded-full border border-violet/30 bg-void/70 px-2 py-0.5 font-mono text-[10px] tracking-[0.12em] text-ghost/90 shadow-[0_8px_22px_rgba(153,69,255,0.14)] backdrop-blur-md sm:px-3 sm:py-1 sm:text-[11px] ${m.cls}`}
          style={{ "--hm-delay": m.delay, "--hm-dur": m.dur } as CSSProperties}
        >
          <span className="text-acid/90">{m.t}</span>
          {fmt(px[m.key]) ? <span className="ml-1.5 text-mute">{fmt(px[m.key])}</span> : null}
        </span>
      ))}
    </div>
  );
}
