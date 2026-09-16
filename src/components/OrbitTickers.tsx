"use client";

import { useEffect, useRef, useState } from "react";
import { useMarket } from "@/lib/hooks";

type Chip = {
  id: string;
  label: string;
  px?: number;
  mint?: string;
  r: number;
  a0: number;
  dur: number;
};

function fmt(n?: number) {
  if (!(typeof n === "number" && n > 0)) return "";
  if (n >= 1000) return n.toFixed(0);
  if (n >= 10) return n.toFixed(2);
  if (n >= 1) return n.toFixed(3);
  return n.toFixed(4);
}

function shortSym(raw: string) {
  const s = raw.replace(/^\$+/, "").trim().toUpperCase();
  return s.slice(0, 8);
}

export function OrbitTickers() {
  const { data } = useMarket(10_000);
  const [tape, setTape] = useState<{ symbol: string; mint?: string }[]>([]);
  const [copied, setCopied] = useState<string | null>(null);
  const [hot, setHot] = useState<string | null>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const btns = useRef<Map<string, HTMLButtonElement>>(new Map());
  const lines = useRef<Map<string, SVGLineElement>>(new Map());
  const chipsRef = useRef<Chip[]>([]);

  useEffect(() => {
    fetch("/api/launch/tape", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        const coins = Array.isArray(j?.coins) ? j.coins : [];
        setTape(
          coins.slice(0, 5).map((c: { symbol?: string; mint?: string }) => ({
            symbol: String(c.symbol || ""),
            mint: c.mint,
          })),
        );
      })
      .catch(() => undefined);
  }, []);

  const sol = Number(data?.solUsd) || 0;
  const spyx = Number(data?.spyxUsd) || 0;
  const qqqx = Number(data?.qqqxUsd) || 0;
  const gldx = Number(data?.gldxUsd) || 0;
  const spyMint = typeof data?.spyxMint === "string" ? data.spyxMint : "";
  const qqqMint = typeof data?.qqqxMint === "string" ? data.qqqxMint : "";
  const gldxMint = typeof data?.gldxMint === "string" ? data.gldxMint : "";

  const chips: Chip[] = [
    { id: "SOL", label: "SOL", px: sol || undefined, r: 48, a0: -90, dur: 22 },
    { id: "SPYx", label: "SPYx", px: spyx || undefined, mint: spyMint, r: 52, a0: -18, dur: 26 },
    { id: "QQQx", label: "QQQx", px: qqqx || undefined, mint: qqqMint, r: 46, a0: 54, dur: 19 },
    { id: "GLDx", label: "GLDx", px: gldx || undefined, mint: gldxMint, r: 54, a0: 126, dur: 28 },
    { id: "SPHA", label: "$SPHA", r: 44, a0: 198, dur: 24 },
  ];
  tape.forEach((c, i) => {
    const label = shortSym(c.symbol);
    if (!label || chips.some((x) => x.label.replace(/^\$/, "") === label)) return;
    if (chips.length >= 8) return;
    chips.push({
      id: c.mint || label + i,
      label,
      mint: c.mint,
      r: 42 + (i % 3) * 6,
      a0: 230 + i * 28,
      dur: 18 + i * 2,
    });
  });
  chipsRef.current = chips;

  useEffect(() => {
    const reduce =
      typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    const tick = (now: number) => {
      const host = wrap.current;
      if (!host) {
        raf = requestAnimationFrame(tick);
        return;
      }
      const w = host.clientWidth;
      const h = host.clientHeight;
      const cx = w * 0.5;
      const cy = h * 0.34;
      for (const c of chipsRef.current) {
        const a = ((c.a0 * Math.PI) / 180) + (reduce ? 0 : (now / 1000) * ((Math.PI * 2) / c.dur));
        const x = 50 + Math.cos(a) * c.r;
        const y = 34 + Math.sin(a) * (c.r * 0.72);
        const btn = btns.current.get(c.id);
        if (btn) {
          btn.style.left = `${x}%`;
          btn.style.top = `${y}%`;
        }
        const line = lines.current.get(c.id);
        if (line) {
          line.setAttribute("x1", String(cx));
          line.setAttribute("y1", String(cy));
          line.setAttribute("x2", String((x / 100) * w));
          line.setAttribute("y2", String((y / 100) * h));
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  async function onChip(c: Chip) {
    window.dispatchEvent(new CustomEvent("solphia-pulse", { detail: { id: c.id, mint: c.mint } }));
    if (!c.mint) return;
    try {
      await navigator.clipboard.writeText(c.mint);
      setCopied(c.id);
      window.setTimeout(() => setCopied((cur) => (cur === c.id ? null : cur)), 1400);
    } catch {
      /* ignore */
    }
  }

  return (
    <div ref={wrap} className="pointer-events-none absolute inset-[-12%] z-10 overflow-visible sm:inset-[-8%]">
      <svg ref={svg} className="pointer-events-none absolute inset-0 h-full w-full overflow-visible" aria-hidden>
        {chips.map((c) => (
          <line
            key={c.id}
            ref={(el) => {
              if (el) lines.current.set(c.id, el);
              else lines.current.delete(c.id);
            }}
            x1="50%"
            y1="34%"
            x2="50%"
            y2="34%"
            stroke={hot === c.id ? "rgba(20,241,149,0.55)" : "rgba(20,241,149,0.18)"}
            strokeWidth={hot === c.id ? 1.4 : 0.8}
            strokeDasharray="3 7"
          />
        ))}
      </svg>
      {chips.map((c) => {
        const rad = (c.a0 * Math.PI) / 180;
        const x = 50 + Math.cos(rad) * c.r;
        const y = 34 + Math.sin(rad) * (c.r * 0.72);
        return (
          <button
            key={c.id}
            type="button"
            ref={(el) => {
              if (el) btns.current.set(c.id, el);
              else btns.current.delete(c.id);
            }}
            onClick={() => onChip(c)}
            onPointerEnter={() => setHot(c.id)}
            onPointerLeave={() => setHot((cur) => (cur === c.id ? null : cur))}
            title={c.mint ? "Pulse mesh · copy mint" : "Pulse mesh"}
            className="orbit-chip pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full border border-acid/45 bg-void/85 px-2 py-0.5 font-mono text-[10px] tracking-[0.12em] text-ghost shadow-[0_0_18px_rgba(20,241,149,0.28)] backdrop-blur-md sm:px-3 sm:py-1 sm:text-[11px]"
            style={{ left: `${x}%`, top: `${y}%` }}
          >
            <span className="text-acid">{c.label}</span>
            {fmt(c.px) ? <span className="ml-1.5 text-mute">{fmt(c.px)}</span> : null}
            {copied === c.id ? <span className="ml-1.5 text-acid">copied</span> : null}
          </button>
        );
      })}
    </div>
  );
}
