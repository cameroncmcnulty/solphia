import { getJson } from "../feeds/http";
import type { TapeCoin } from "./tape";

export type Spark = { t: number; o: number; h: number; l: number; c: number };

export type ChartTf = "5m" | "15m" | "1h" | "6h";

type PumpStick = {
  timestamp?: number;
  time?: number;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  volume?: number;
};

function num(v: unknown, d = 0): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : d;
}

export function normalizeCandles(raw: Spark[]): Spark[] {
  const rows = raw
    .map((c) => ({
      t: num(c.t),
      o: num(c.o),
      h: num(c.h),
      l: num(c.l),
      c: num(c.c),
    }))
    .filter((c) => c.t > 0 && c.c > 0 && c.h > 0);
  rows.sort((a, b) => a.t - b.t);
  return rows.map((c) => ({
    ...c,
    h: Math.max(c.h, c.o, c.c),
    l: Math.min(c.l || c.c, c.o, c.c),
  }));
}

/** Build a 24-point path from the windowed % prints so every row has a spark. */
export function syntheticSpark(coin: {
  priceSol?: number;
  marketCapUsd?: number;
  change5m?: number;
  change1h?: number;
  change6h?: number;
  change24h?: number;
  createdAt?: number;
}): Spark[] {
  const last = coin.priceSol || (coin.marketCapUsd ? coin.marketCapUsd / 1e9 : 0) || 1;
  const now = Date.now();
  const ch = (v?: number) => (Number.isFinite(v) ? v || 0 : 0);
  const px = (chg: number) => last / Math.max(0.05, 1 + chg);
  const p24 = px(ch(coin.change24h));
  const p6 = px(ch(coin.change6h) || ch(coin.change24h) * 0.45);
  const p1 = px(ch(coin.change1h) || ch(coin.change24h) * 0.12);
  const p5 = px(ch(coin.change5m) || ch(coin.change1h) * 0.2);
  const anchors: { t: number; p: number }[] = [
    { t: now - 24 * 3600_000, p: p24 },
    { t: now - 6 * 3600_000, p: p6 },
    { t: now - 3600_000, p: p1 },
    { t: now - 5 * 60_000, p: p5 },
    { t: now, p: last },
  ];
  const out: Spark[] = [];
  const n = 24;
  for (let i = 0; i < n; i++) {
    const t = anchors[0].t + ((anchors[anchors.length - 1].t - anchors[0].t) * i) / (n - 1);
    let p = last;
    for (let k = 1; k < anchors.length; k++) {
      if (t <= anchors[k].t) {
        const a = anchors[k - 1];
        const b = anchors[k];
        const u = (t - a.t) / Math.max(1, b.t - a.t);
        p = a.p + (b.p - a.p) * u;
        break;
      }
    }
    const jitter = 1 + Math.sin(i * 1.7) * 0.004;
    const c = Math.max(1e-12, p * jitter);
    const prev = out[out.length - 1]?.c || c;
    out.push({ t, o: prev, h: Math.max(prev, c), l: Math.min(prev, c), c });
  }
  return out;
}

function fromPump(rows: PumpStick[]): Spark[] {
  return normalizeCandles(
    (rows || []).map((r) => {
      const t = num(r.timestamp) || num(r.time);
      return {
        t: t < 1e12 ? t * 1000 : t,
        o: num(r.open),
        h: num(r.high),
        l: num(r.low),
        c: num(r.close),
      };
    }),
  );
}

function fromGecko(list: unknown): Spark[] {
  if (!Array.isArray(list)) return [];
  return normalizeCandles(
    list.map((row) => {
      const a = Array.isArray(row) ? row : [];
      const t = num(a[0]);
      return {
        t: t < 1e12 ? t * 1000 : t,
        o: num(a[1]),
        h: num(a[2]),
        l: num(a[3]),
        c: num(a[4]),
      };
    }),
  );
}

export async function fetchPumpCandles(mint: string, timeframe = 5, limit = 48): Promise<Spark[]> {
  const r = await getJson<PumpStick[] | { data?: PumpStick[] }>(
    `https://frontend-api-v3.pump.fun/candlesticks/${encodeURIComponent(mint)}?offset=0&limit=${limit}&timeframe=${timeframe}`,
    5000,
  );
  const rows = Array.isArray(r.data) ? r.data : Array.isArray(r.data?.data) ? r.data.data : [];
  return fromPump(rows);
}

export async function fetchGeckoCandles(pool: string, tf: ChartTf, limit = 48): Promise<Spark[]> {
  const spec =
    tf === "5m"
      ? { path: "minute", aggregate: 5 }
      : tf === "15m"
        ? { path: "minute", aggregate: 15 }
        : tf === "1h"
          ? { path: "hour", aggregate: 1 }
          : { path: "hour", aggregate: 6 };
  const r = await getJson<{ data?: { attributes?: { ohlcv_list?: unknown } } }>(
    `https://api.geckoterminal.com/api/v2/networks/solana/pools/${encodeURIComponent(pool)}/ohlcv/${spec.path}?aggregate=${spec.aggregate}&limit=${limit}`,
    5000,
  );
  return fromGecko(r.data?.data?.attributes?.ohlcv_list);
}

export async function fetchTokenChart(opts: {
  mint?: string;
  pair?: string;
  venue?: string;
  tf?: ChartTf;
}): Promise<Spark[]> {
  const tf = opts.tf || "15m";
  const pumpTf = tf === "5m" ? 5 : tf === "15m" ? 15 : tf === "1h" ? 60 : 240;
  const venue = (opts.venue || "").toLowerCase();
  if (opts.mint && (venue === "pumpfun" || venue === "pumpswap" || !opts.pair)) {
    const pump = await fetchPumpCandles(opts.mint, pumpTf === 240 ? 60 : pumpTf, tf === "6h" ? 72 : 60);
    if (pump.length >= 4) return pump;
  }
  if (opts.pair) {
    const gecko = await fetchGeckoCandles(opts.pair, tf, tf === "6h" ? 48 : 60);
    if (gecko.length >= 4) return gecko;
  }
  if (opts.mint && venue !== "pumpfun" && venue !== "pumpswap") {
    const pump = await fetchPumpCandles(opts.mint, pumpTf === 240 ? 60 : pumpTf, 48);
    if (pump.length >= 4) return pump;
  }
  return [];
}

async function poolMap<T>(items: T[], n: number, fn: (item: T) => Promise<void>) {
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      await fn(items[idx]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, () => worker()));
}

export async function attachTapeSparks<T extends TapeCoin>(coins: T[]): Promise<T[]> {
  await poolMap(coins, 8, async (coin) => {
    if ((coin.spark || []).length >= 8) return;
    try {
      const live = await fetchTokenChart({
        mint: coin.mint,
        pair: coin.pairAddress,
        venue: coin.venue,
        tf: "15m",
      });
      coin.spark = live.length >= 4 ? live.slice(-36) : syntheticSpark(coin);
    } catch {
      coin.spark = syntheticSpark(coin);
    }
  });
  for (const coin of coins) {
    if (!(coin.spark || []).length) coin.spark = syntheticSpark(coin);
  }
  return coins;
}

export function sparkUp(spark: Spark[], fallbackChange = 0): boolean {
  if (spark.length >= 2) return (spark[spark.length - 1]?.c || 0) >= (spark[0]?.c || 0);
  return fallbackChange >= 0;
}
