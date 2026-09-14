"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { EquityCurve } from "./EquityCurve";

type LiveBook = {
  on?: boolean;
  equityUsd?: number;
  pnlPct?: number;
  trades?: number;
  leverage?: number;
  lastAction?: string;
};

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
  bestDayUsd?: number;
  avgDayUsd?: number;
  daysGe2?: number;
  curve?: { t: number; equity: number }[];
  note?: string;
  leverage?: 1 | 2 | 3;
  liquidations?: number;
};

function money(n: number) {
  const sign = n < 0 ? "−" : "";
  return `${sign}$${Math.abs(n).toFixed(0)}`;
}

function when(ms?: number) {
  if (!ms) return "";
  return new Date(ms).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function BacktestBrochure() {
  const [reports, setReports] = useState<Partial<Record<1 | 2 | 3, PublicBt>>>({});
  const [lev, setLev] = useState<1 | 2 | 3>(1);
  const [live, setLive] = useState<LiveBook | null>(null);

  useEffect(() => {
    let stop = false;
    fetch("/api/backtest", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        if (stop) return;
        const pack = j?.reports as Partial<Record<1 | 2 | 3, PublicBt>> | undefined;
        const next: Partial<Record<1 | 2 | 3, PublicBt>> = {};
        if (pack?.[1]?.ready) next[1] = pack[1];
        if (pack?.[2]?.ready) next[2] = pack[2];
        if (pack?.[3]?.ready) next[3] = pack[3];
        if (next[1] || next[2] || next[3]) {
          setReports(next);
          if (!next[1] && next[2]) setLev(2);
          else if (!next[1] && !next[2] && next[3]) setLev(3);
          return;
        }
        if (j?.live?.on) setLive(j.live);
        if (j?.ready && j?.curve) setReports({ 1: j, 2: j, 3: j });
      })
      .catch(() => {
        if (!stop) setReports({});
      });
    return () => {
      stop = true;
    };
  }, []);

  const data = reports[lev] || null;
  const ready = Boolean(data?.ready && data.curve?.length);
  const up = (data?.pnlPct || 0) >= 0;
  const pct = ready ? `${up ? "+" : ""}${((data?.pnlPct || 0) * 100).toFixed(1)}%` : "…";

  return (
    <section id="backtest" className="px-4 py-10 md:px-12 md:py-16">
      <div className="panel overflow-hidden rounded-[2rem] p-5 sm:p-8 md:p-12">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="font-mono text-[11px] tracking-[0.28em] text-acid">
              {live?.on ? `LIVE WALLET · SOL ${live.leverage || 1}× · ${live.trades || 0} CLIPS` : "ENGINE BACKTEST · FEES IN · $1,000 START"}
            </p>
            <h2 className="mt-2 max-w-2xl font-display text-3xl leading-tight text-ghost sm:text-5xl md:text-6xl">
              The curve is the point.
            </h2>
            <p className="mt-3 max-w-xl text-sm text-mute sm:text-lg">
              How she would have marked SOL, S&P 500, Nasdaq, and gold. Past days are not a promise.
            </p>
          </div>
          <div className="text-left lg:text-right">
            <div className="mb-3 flex flex-wrap gap-2 lg:justify-end">
              {([1, 2, 3] as const).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setLev(n)}
                  className={`rounded-full px-3 py-1 font-mono text-[11px] ${lev === n ? "btn-on" : "btn-ghost"}`}
                >
                  {n === 1 ? "Spot 1×" : `SOL ${n}×`}
                </button>
              ))}
            </div>
            <div className={`font-display text-5xl sm:text-7xl ${ready ? (up ? "text-acid" : "text-blood") : "text-mute"}`}>
              {pct}
            </div>
            <div className="mt-1 font-mono text-xs text-mute">
              {ready
                ? `${money(data?.startingUsd || 1000)} → ${money(data?.endingUsd || 0)} USDC · ${when(data?.from)}–${when(data?.to)}`
                : "Loading the last engine replay…"}
            </div>
          </div>
        </div>

        <div className="mt-8 min-h-[160px] sm:min-h-[200px]">
          {ready && data?.curve ? (
            <EquityCurve curve={data.curve} up={up} />
          ) : (
            <div className="flex h-40 items-center justify-center rounded-2xl bg-void/50 font-mono text-[11px] text-mute sm:h-48">
              Loading the last engine replay…
            </div>
          )}
        </div>

        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat k="Clips" v={ready ? String(data?.trades || 0) : "—"} sub={data?.horizon || "15m marks"} />
          <Stat k="Win rate" v={ready ? `${Math.round((data?.winRate || 0) * 100)}%` : "—"} sub="closed to USDC" />
          <Stat k="Max DD" v={ready ? `−${((data?.maxDdPct || 0) * 100).toFixed(1)}%` : "—"} sub="from peak" />
          <Stat
            k={lev > 1 ? "Liquidations" : "Best day"}
            v={
              lev > 1
                ? ready
                  ? String(data?.liquidations || 0)
                  : "—"
                : ready
                  ? `+$${Math.abs(data?.bestDayUsd || 0).toFixed(0)}`
                  : "—"
            }
            sub={
              lev > 1
                ? "SOL-PERP stopped out"
                : ready
                  ? `${data?.daysGe2 || 0} days ≥ $2`
                  : "on a $1,000 book"
            }
          />
        </div>

        <p className="mt-6 max-w-3xl text-xs leading-relaxed text-mute sm:text-sm">
          {data?.note ||
            "Same rules she trades with now. A $2–3 day showed up on this replay — it is not a guarantee she prints that every session. Fees are already in the line."}
        </p>

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
            Go live · from 0.1 SOL
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
