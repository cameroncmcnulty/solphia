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
  window?: "1m" | "3m" | "6m";
  ranAt?: number;
};

type WindowKey = "1m" | "3m" | "6m";
type Lev = 1 | 2 | 3;
type LevPack = Partial<Record<Lev, PublicBt>>;

function money(n: number) {
  const sign = n < 0 ? "−" : "";
  return `${sign}$${Math.abs(n).toFixed(0)}`;
}

function when(ms?: number) {
  if (!ms) return "";
  return new Date(ms).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function asLevPack(raw: unknown): LevPack | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, PublicBt>;
  if (o[1]?.ready || o[2]?.ready || o[3]?.ready) {
    return { 1: o[1], 2: o[2], 3: o[3] };
  }
  if ((raw as PublicBt).ready && (raw as PublicBt).curve) {
    return { 1: raw as PublicBt };
  }
  return null;
}

export function BacktestBrochure() {
  const [windows, setWindows] = useState<Partial<Record<WindowKey, LevPack>>>({});
  const win: WindowKey = "1m";
  const [lev, setLev] = useState<Lev>(1);
  const [err, setErr] = useState("");
  const [live, setLive] = useState<LiveBook | null>(null);

  useEffect(() => {
    let stop = false;
    fetch("/api/backtest", { cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw new Error(`backtest ${r.status}`);
        return r.json();
      })
      .then((j) => {
        if (stop) return;
        const pack = j?.windows as Record<string, unknown> | undefined;
        const next: Partial<Record<WindowKey, LevPack>> = {};
        for (const k of ["1m", "3m", "6m"] as const) {
          const row = asLevPack(pack?.[k]);
          if (row) next[k] = row;
        }
        if (next["1m"] || next["3m"] || next["6m"]) setWindows(next);
        else if (j?.ready && j?.curve) setWindows({ "1m": { 1: j }, "3m": { 1: j }, "6m": { 1: j } });
        else setErr("No replay in this deploy.");
        if (j?.live?.on) setLive(j.live);
      })
      .catch(() => {
        if (!stop) setErr("Could not load the replay.");
      });
    return () => {
      stop = true;
    };
  }, []);

  const pack = windows[win] || windows["1m"] || {};
  const data = pack[lev] || pack[1] || null;
  const ready = Boolean(data?.ready && data.curve?.length);
  const up = (data?.pnlPct || 0) >= 0;
  const pct = ready ? `${up ? "+" : ""}${((data?.pnlPct || 0) * 100).toFixed(1)}%` : err ? "—" : "…";

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
              How she marked tokenized S&P 500, Nasdaq, and gold from USDC. Past days are not a promise.
            </p>
          </div>
          <div className="text-left lg:text-right">
            <div className="mb-2 font-mono text-[11px] tracking-[0.18em] text-mute lg:text-right">LAST 30 DAYS</div>
            <div className="mb-2 flex flex-wrap gap-2 lg:justify-end">
              {([1, 2, 3] as const).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setLev(n)}
                  disabled={!pack[n]?.ready}
                  className={`rounded-full px-3 py-1 font-mono text-[11px] ${lev === n ? "btn-on" : "btn-ghost"} disabled:opacity-40`}
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
                : err || "Loading the last engine replay…"}
            </div>
          </div>
        </div>

        <div className="mt-8 min-h-[160px] sm:min-h-[200px]">
          {ready && data?.curve ? (
            <EquityCurve curve={data.curve} up={up} />
          ) : (
            <div className="flex h-40 items-center justify-center rounded-2xl bg-void/50 font-mono text-[11px] text-mute sm:h-48">
              {err || "Loading the last engine replay…"}
            </div>
          )}
        </div>

        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat k="Clips" v={ready ? String(data?.trades || 0) : "—"} sub={data?.horizon || "engine marks"} />
          <Stat k="Win rate" v={ready ? `${Math.round((data?.winRate || 0) * 100)}%` : "—"} sub="closed to USDC" />
          <Stat k="Max DD" v={ready ? `−${((data?.maxDdPct || 0) * 100).toFixed(1)}%` : "—"} sub="from peak" />
          <Stat
            k="Best day"
            v={ready ? `+$${Math.abs(data?.bestDayUsd || 0).toFixed(0)}` : "—"}
            sub={ready ? `${data?.daysGe2 || 0} days ≥ $2` : "on a $1,000 book"}
          />
        </div>

        <p className="mt-6 max-w-3xl text-xs leading-relaxed text-mute sm:text-sm">
          {data?.note || "Same rules she trades with now. Fees are already in the line. Past days are not a promise."}
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/trading"
            className="btn-acid inline-flex min-h-[48px] items-center justify-center rounded-full px-8 py-3 text-base sm:min-h-[56px] sm:text-lg"
          >
            Go live
          </Link>
          <Link
            href="/pricing"
            className="btn-ghost inline-flex min-h-[48px] items-center justify-center rounded-full px-8 py-3 text-base sm:min-h-[56px] sm:text-lg"
          >
            Seat from 0.1 SOL
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
