"use client";

import type { CSSProperties } from "react";

const MARKS: { t: string; cls: string; delay: string; dur: string }[] = [
  { t: "SPYx", cls: "left-[0%] top-[8%]", delay: "0s", dur: "5.2s" },
  { t: "QQQx", cls: "right-[-2%] top-[4%] hidden sm:block", delay: "0.65s", dur: "4.5s" },
  { t: "GLDx", cls: "right-[-6%] top-[54%]", delay: "1.15s", dur: "5.7s" },
  { t: "$SPHA", cls: "left-[-8%] top-[56%] hidden sm:block", delay: "0.35s", dur: "4.8s" },
  { t: "SOL", cls: "left-[16%] bottom-[0%] hidden md:block", delay: "0.9s", dur: "6.1s" },
];

/** Pinata-style hovering chips around the hero. */
export function HoverMarks() {
  return (
    <div className="pointer-events-none absolute inset-0 z-10 overflow-visible" aria-hidden>
      {MARKS.map((m) => (
        <span
          key={m.t}
          className={`hover-mark absolute rounded-full border border-violet/35 bg-void/75 px-3 py-1 font-mono text-[11px] tracking-[0.14em] text-ghost shadow-[0_10px_28px_rgba(153,69,255,0.2)] backdrop-blur-md ${m.cls}`}
          style={{ "--hm-delay": m.delay, "--hm-dur": m.dur } as CSSProperties}
        >
          {m.t}
        </span>
      ))}
    </div>
  );
}
