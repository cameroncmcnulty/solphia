"use client";

import { TokenArt } from "@/components/TokenArt";

function fmtMc(usd?: number, sol?: number) {
  const n = usd || 0;
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  if (n > 0) return `$${n < 10 ? n.toFixed(2) : n.toFixed(0)}`;
  if (sol && sol > 0) return `${sol >= 10 ? sol.toFixed(1) : sol.toFixed(2)} SOL`;
  return "$0";
}

function fmtPct(n?: number) {
  if (n == null || !Number.isFinite(n)) return "0.0%";
  const pct = n * 100;
  const abs = Math.abs(pct);
  const body = abs >= 10 ? abs.toFixed(1) : abs.toFixed(1);
  return `${pct >= 0 ? "↑" : "↓"} ${body}%`;
}

export function PumpCoinRow({
  name,
  symbol,
  image,
  mint,
  marketCapUsd,
  marketCapSol,
  change,
  active,
  badge,
  place,
  onOpen,
}: {
  name: string;
  symbol: string;
  image?: string;
  mint?: string;
  marketCapUsd?: number;
  marketCapSol?: number;
  change?: number;
  active?: boolean;
  badge?: string;
  place?: number;
  onOpen: () => void;
}) {
  const up = (change || 0) >= 0;
  const ticker = (symbol || "").replace(/^\$+/, "").toUpperCase();
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`flex w-full items-center gap-3 px-1 py-3 text-left transition ${active ? "opacity-100" : "active:opacity-80"}`}
    >
      <div className={place === 1 ? "rank-wrap rank-1" : place === 2 ? "rank-wrap rank-2" : place === 3 ? "rank-wrap rank-3" : ""}>
        <TokenArt src={image} mint={mint} label={ticker} className="h-14 w-14 rounded-[18px]" />
        {place ? <span className="rank-num">{place}</span> : null}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="truncate text-[17px] font-semibold tracking-tight text-white">{name || ticker}</p>
          {badge ? <span className="shrink-0 text-[15px] text-[#14f195]">{badge}</span> : null}
        </div>
        <p className="mt-0.5 truncate text-[15px] text-white/45">{ticker}</p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-[17px] font-semibold tabular-nums tracking-tight text-white">{fmtMc(marketCapUsd, marketCapSol)}</p>
        <span
          className={`mt-1 inline-flex rounded-md px-1.5 py-0.5 text-[12px] font-semibold tabular-nums ${
            up ? "bg-[#14f195]/15 text-[#14f195]" : "bg-[#ff4d6a]/15 text-[#ff4d6a]"
          }`}
        >
          {fmtPct(change)}
        </span>
      </div>
    </button>
  );
}
