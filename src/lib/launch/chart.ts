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

/** Five real window prints. No sine fill — that made every bubble look identical. */
export function syntheticSpark(coin: {
  priceSol?: number;
  marketCapUsd?: number;
  change5m?: number;
  change1h?: number;
  change6h?: number;
  change24h?: number;
  createdAt?: number;
}): Spark[] {
  const last = coin.priceSol || 1;
  const now = Date.now();
  const ch = (v?: number) => (Number.isFinite(v) ? v || 0 : 0);
  const px = (chg: number) => Math.max(1e-12, last / Math.max(0.08, 1 + chg));
  const pts = [
    { t: now - 24 * 3600_000, p: px(ch(coin.change24h)) },
    { t: now - 6 * 3600_000, p: px(ch(coin.change6h) || ch(coin.change24h) * 0.4) },
    { t: now - 3600_000, p: px(ch(coin.change1h) || ch(coin.change24h) * 0.1) },
    { t: now - 5 * 60_000, p: px(ch(coin.change5m) || ch(coin.change1h) * 0.15) },
    { t: now, p: last },
  ];
  return pts.map((row, i) => {
    const prev = i ? pts[i - 1].p : row.p;
    return { t: row.t, o: prev, h: Math.max(prev, row.p), l: Math.min(prev, row.p), c: row.p };
  });
}

function catmull(p0: number, p1: number, p2: number, p3: number, t: number) {
  return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t);
}

/** Smooth Dexscreener-style spark from each coin's own 24h/6h/1h/5m prints. */
export function smoothSpark(coin: Parameters<typeof syntheticSpark>[0]): Spark[] {
  const keys = syntheticSpark(coin);
  if (keys.length < 2) return keys;
  const n = 32;
  const out: Spark[] = [];
  for (let i = 0; i < n; i++) {
    const u = i / (n - 1);
    const x = u * (keys.length - 1);
    const j = Math.min(keys.length - 2, Math.floor(x));
    const t = x - j;
    const p0 = keys[Math.max(0, j - 1)].c;
    const p1 = keys[j].c;
    const p2 = keys[j + 1].c;
    const p3 = keys[Math.min(keys.length - 1, j + 2)].c;
    const c = Math.max(1e-12, catmull(p0, p1, p2, p3, t));
    const prev = out[out.length - 1]?.c || c;
    const tm = keys[0].t + u * (keys[keys.length - 1].t - keys[0].t);
    out.push({ t: tm, o: prev, h: Math.max(prev, c), l: Math.min(prev, c), c });
  }
  return out;
}

export function fmtAxisPx(n: number): string {
  if (!(n > 0)) return "0";
  if (n >= 1000) return n.toFixed(0);
  if (n >= 1) return n.toFixed(n >= 100 ? 2 : 4);
  if (n >= 0.01) return n.toFixed(4);
  if (n >= 0.0001) return n.toFixed(6);
  return n.toPrecision(3);
}

export function scaleSpark(rows: Spark[], k: number): Spark[] {
  if (!(k > 0) || k === 1) return rows;
  return rows.map((c) => ({ t: c.t, o: c.o * k, h: c.h * k, l: c.l * k, c: c.c * k }));
}

/** Even price ticks in the same linear space as the candle Y map. */
export function axisTicks(min: number, max: number, n = 4): number[] {
  if (n < 2) return [max];
  const span = max - min || Math.abs(max) * 0.04 || 1;
  const hi = max;
  return Array.from({ length: n }, (_, i) => hi - (span * i) / (n - 1));
}

export function bucketCandles(rows: Spark[], max: number): Spark[] {
  if (rows.length <= max) return rows;
  const size = Math.ceil(rows.length / max);
  const out: Spark[] = [];
  for (let i = 0; i < rows.length; i += size) {
    const sl = rows.slice(i, i + size);
    const first = sl[0];
    const last = sl[sl.length - 1];
    out.push({
      t: first.t,
      o: first.o,
      h: Math.max(...sl.map((x) => x.h)),
      l: Math.min(...sl.map((x) => x.l)),
      c: last.c,
    });
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
    `https://api.geckoterminal.com/api/v2/networks/solana/pools/${encodeURIComponent(pool)}/ohlcv/${spec.path}?aggregate=${spec.aggregate}&limit=${limit}&currency=usd`,
    5000,
  );
  return fromGecko(r.data?.data?.attributes?.ohlcv_list);
}

export type ChartPack = { candles: Spark[]; unit: "sol" | "usd" };

const packCache = new Map<string, { at: number; pack: ChartPack }>();

async function fetchTokenChartUncached(opts: {
  mint?: string;
  pair?: string;
  venue?: string;
  tf?: ChartTf;
}): Promise<ChartPack> {
  const tf = opts.tf || "15m";
  const pumpTf = tf === "5m" ? 5 : tf === "15m" ? 15 : tf === "1h" ? 60 : 240;
  const venue = (opts.venue || "").toLowerCase();
  const tryPump = async () => {
    if (!opts.mint) return [] as Spark[];
    return fetchPumpCandles(opts.mint, pumpTf === 240 ? 60 : pumpTf, tf === "6h" ? 72 : 80);
  };
  const tryGecko = async () => {
    if (!opts.pair) return [] as Spark[];
    return fetchGeckoCandles(opts.pair, tf, tf === "6h" ? 60 : 80);
  };

  if (opts.pair) {
    const gecko = await tryGecko();
    if (gecko.length >= 4) return { candles: gecko, unit: "usd" };
  }
  if (opts.mint && (venue === "pumpfun" || venue === "pumpswap" || !opts.pair)) {
    const pump = await tryPump();
    if (pump.length >= 4) return { candles: pump, unit: "sol" };
  }
  return { candles: [], unit: "sol" };
}

export async function fetchTokenChart(opts: {
  mint?: string;
  pair?: string;
  venue?: string;
  tf?: ChartTf;
}): Promise<ChartPack> {
  const key = `${opts.mint || ""}|${opts.pair || ""}|${opts.venue || ""}|${opts.tf || "15m"}`;
  const hit = packCache.get(key);
  if (hit && Date.now() - hit.at < 30_000) return hit.pack;
  const pack = await fetchTokenChartUncached(opts);
  if (pack.candles.length >= 4) packCache.set(key, { at: Date.now(), pack });
  return pack;
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
      coin.spark = live.candles.length >= 4 ? live.candles.slice(-36) : syntheticSpark(coin);
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
