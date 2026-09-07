"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { EquityCurve } from "./EquityCurve";

type PublicBt = {
  ready: boolean;
  from?: number;
  to?: number;
  horizon?: string;
  startingUsd?: number;
  endingUsd?: number;
  pnlUsd?: number;
  pnlPct?: number;
  maxDdPct?: number;
  trades?: number;
  winRate?: number;
  feesUsd?: number;
  curve?: { t: number; equity: number }[];
  note?: string;
};

function money(n: number) {
  const sign = n < 0 ? "−" : "";
  return `${sign}$${Math.abs(n).toFixed(0)}`;
}

function when(ms?: number) {
  if (!ms) return "";
  return new Date(ms).toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

export function BacktestBrochure() {
  const [data, setData] = useState<PublicBt | null>(null);

  useEffect(() => {
    fetch("/api/backtest", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => setData(j))
      .catch(() => setData({ ready: false }));
  }, []);

  if (!data?.ready || !data.curve?.length) return null;

  const up = (data.pnlPct || 0) >= 0;
  const pct = `${up ? "+" : ""}${((data.pnlPct || 0) * 100).toFixed(1)}%`;

  return (
    <section className="px-4 py-10 md:px-12 md:py-16">
      <div className="panel overflow-hidden rounded-[2rem] p-5 sm:p-8 md:p-12">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="font-mono text-[11px] tracking-[0.28em] text-acid">PAPER BACKTEST · FEES IN</p>
            <h2 className="mt-2 max-w-2xl font-display text-3xl leading-tight text-ghost sm:text-5xl md:text-6xl">
              The curve is the point.
            </h2>
            <p className="mt-3 max-w-xl text-sm text-mute sm:text-lg">
              Same engine. Official SOL, S&P 500, Nasdaq-100, and gold. She sits in USDC, scalps the sleeve with a
              5m/15m setup that agrees with Daily/4H, and trails the stop up.
            </p>
          </div>
          <div className="text-left lg:text-right">
            <div className={`font-display text-5xl sm:text-7xl ${up ? "text-acid" : "text-blood"}`}>{pct}</div>
            <div className="mt-1 font-mono text-xs text-mute">
              {money(data.startingUsd || 1000)} → {money(data.endingUsd || 0)} USDC · {when(data.from)}–{when(data.to)}
            </div>
          </div>
        </div>

        <div className="mt-8">
          <EquityCurve curve={data.curve} up={up} />
        </div>

        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat k="Clips" v={String(data.trades || 0)} sub={data.horizon || "1h marks"} />
          <Stat k="Win rate" v={`${Math.round((data.winRate || 0) * 100)}%`} sub="closed to USDC" />
          <Stat k="Max DD" v={`−${((data.maxDdPct || 0) * 100).toFixed(1)}%`} sub="from peak" />
          <Stat k="Fees" v={money(data.feesUsd || 0)} sub="pair + 0.1% clip" />
        </div>

        <p className="mt-6 max-w-3xl text-xs leading-relaxed text-mute sm:text-sm">{data.note}</p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/trading"
            className="btn-acid inline-flex min-h-[48px] items-center justify-center rounded-full px-8 py-3 text-base sm:min-h-[56px] sm:text-lg"
          >
            Watch her paper
          </Link>
          <Link
            href="/pricing"
            className="btn-ghost inline-flex min-h-[48px] items-center justify-center rounded-full px-8 py-3 text-base sm:min-h-[56px] sm:text-lg"
          >
            Go live · 0.2 SOL
          </Link>
        </div>
      </div>
    </section>
  );
}

function Stat({ k, v, sub }: { k: string; v: string; sub: string }) {
  return (
    <div className="rounded-2xl border border-line/80 bg-void/50 p-4">
      <div className="font-mono text-[10px] tracking-[0.2em] text-mute">{k}</div>
      <div className="mt-1 font-display text-2xl text-ghost sm:text-3xl">{v}</div>
      <div className="font-mono text-[11px] text-mute">{sub}</div>
    </div>
  );
}
