"use client";

import type { CSSProperties } from "react";

const MARKS: { t: string; cls: string; delay: string; dur: string }[] = [
  { t: "SPYx", cls: "left-[0%] top-[4%]", delay: "0s", dur: "5.2s" },
  { t: "QQQx", cls: "right-[0%] top-[8%]", delay: "0.65s", dur: "4.5s" },
  { t: "GLDx", cls: "right-[0%] top-[50%]", delay: "1.15s", dur: "5.7s" },
  { t: "$SPHA", cls: "left-[0%] top-[52%]", delay: "0.35s", dur: "4.8s" },
  { t: "SOL", cls: "left-[30%] bottom-[1%]", delay: "0.9s", dur: "6.1s" },
];

/** Pinata-style hovering chips around the hero. Same five on phone and desktop. */
export function HoverMarks() {
  return (
    <div className="pointer-events-none absolute inset-0 z-10 overflow-visible" aria-hidden>
      {MARKS.map((m) => (
        <span
          key={m.t}
          className={`hover-mark absolute whitespace-nowrap rounded-full border border-violet/40 bg-void/80 px-2 py-0.5 font-mono text-[10px] tracking-[0.12em] text-ghost shadow-[0_8px_22px_rgba(153,69,255,0.22)] backdrop-blur-md sm:px-3 sm:py-1 sm:text-[11px] sm:tracking-[0.14em] ${m.cls}`}
          style={{ "--hm-delay": m.delay, "--hm-dur": m.dur } as CSSProperties}
        >
          {m.t}
        </span>
      ))}
    </div>
  );
}
