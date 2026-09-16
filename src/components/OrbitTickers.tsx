"use client";

import { useEffect, useState } from "react";
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
  const { data } = useMarket(12_000);
  const [tape, setTape] = useState<{ symbol: string; mint?: string }[]>([]);
  const [copied, setCopied] = useState<string | null>(null);

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
    { id: "SOL", label: "SOL", px: sol || undefined, r: 46, a0: -90, dur: 52 },
    { id: "SPYx", label: "SPYx", px: spyx || undefined, mint: spyMint, r: 48, a0: -18, dur: 58 },
    { id: "QQQx", label: "QQQx", px: qqqx || undefined, mint: qqqMint, r: 44, a0: 54, dur: 46 },
    { id: "GLDx", label: "GLDx", px: gldx || undefined, mint: gldxMint, r: 50, a0: 126, dur: 62 },
    { id: "SPHA", label: "$SPHA", r: 42, a0: 198, dur: 50 },
  ];

  tape.forEach((c, i) => {
    const label = shortSym(c.symbol);
    if (!label || chips.some((x) => x.label.replace(/^\$/, "") === label)) return;
    if (chips.length >= 8) return;
    chips.push({
      id: c.mint || label + i,
      label,
      mint: c.mint,
      r: 40 + (i % 3) * 5,
      a0: 230 + i * 28,
      dur: 44 + i * 3,
    });
  });

  async function onChip(c: Chip) {
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
    <div className="pointer-events-none absolute inset-0 z-10 overflow-visible" aria-hidden>
      {chips.map((c) => {
        const rad = (c.a0 * Math.PI) / 180;
        const x = 50 + Math.cos(rad) * c.r;
        const y = 34 + Math.sin(rad) * (c.r * 0.78);
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onChip(c)}
            title={c.mint ? "Copy mint" : c.label}
            className="orbit-chip pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full border border-acid/35 bg-void/80 px-2 py-0.5 font-mono text-[10px] tracking-[0.12em] text-ghost shadow-[0_8px_22px_rgba(20,241,149,0.18)] backdrop-blur-md sm:px-3 sm:py-1 sm:text-[11px]"
            style={{
              left: `${x}%`,
              top: `${y}%`,
              animationDuration: `${c.dur}s`,
              animationDelay: `${c.a0 / 90}s`,
            }}
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
