import { getJson } from "../feeds/http";
import { pack4h, type Candle } from "../sol/indicators";
import type { Sleeve } from "./catalog";

export type SleeveFrames = {
  m5: Candle[];
  m15: Candle[];
  h4: Candle[];
  d1: Candle[];
};

export type ScalpFrames = Record<Exclude<Sleeve, "USDC">, SleeveFrames>;

const EMPTY: SleeveFrames = { m5: [], m15: [], h4: [], d1: [] };

let cache: { at: number; frames: ScalpFrames } | null = null;
const TTL = 40_000;

function parseBinance(raw: unknown): Candle[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((row) => {
      if (!Array.isArray(row) || row.length < 6) return null;
      return {
        t: Number(row[0]),
        o: Number(row[1]),
        h: Number(row[2]),
        l: Number(row[3]),
        c: Number(row[4]),
        v: Number(row[5]),
      };
    })
    .filter((c): c is Candle => Boolean(c && c.c > 0 && c.h >= c.l));
}

function parseYahoo(raw: any): Candle[] {
  const result = raw?.chart?.result?.[0];
  const ts: number[] = result?.timestamp || [];
  const q = result?.indicators?.quote?.[0] || {};
  const out: Candle[] = [];
  for (let i = 0; i < ts.length; i++) {
    const o = Number(q.open?.[i]);
    const h = Number(q.high?.[i]);
    const l = Number(q.low?.[i]);
    const c = Number(q.close?.[i]);
    const v = Number(q.volume?.[i] || 0);
    if (c > 0 && h >= l && o > 0) out.push({ t: ts[i] * 1000, o, h, l, c, v });
  }
  return out;
}

async function binance(interval: string, limit: number): Promise<Candle[]> {
  for (const base of ["https://data-api.binance.vision/api/v3/klines", "https://api.binance.com/api/v3/klines"]) {
    const r = await getJson<unknown[]>(`${base}?symbol=SOLUSDT&interval=${interval}&limit=${limit}`, 6000);
    if (r.ok && r.data) {
      const rows = parseBinance(r.data);
      if (rows.length > 20) return rows;
    }
  }
  return [];
}

async function yahoo(symbol: string, interval: string, range: string): Promise<Candle[]> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${interval}&range=${range}`;
  const r = await getJson<unknown>(url, 7000);
  if (!r.ok || !r.data) return [];
  return parseYahoo(r.data);
}

async function equity(symbol: string): Promise<SleeveFrames> {
  const [m5, m15, h1, d1] = await Promise.all([
    yahoo(symbol, "5m", "5d"),
    yahoo(symbol, "15m", "1mo"),
    yahoo(symbol, "60m", "3mo"),
    yahoo(symbol, "1d", "1y"),
  ]);
  return {
    m5,
    m15: m15.length ? m15 : m5,
    h4: pack4h(h1),
    d1,
  };
}

async function sol(): Promise<SleeveFrames> {
  const [m5, m15, h4, d1] = await Promise.all([
    binance("5m", 200),
    binance("15m", 200),
    binance("4h", 120),
    binance("1d", 200),
  ]);
  return { m5, m15, h4, d1 };
}

export function emptyFrames(): ScalpFrames {
  return { SOL: { ...EMPTY }, SPYx: { ...EMPTY }, QQQx: { ...EMPTY }, GLDx: { ...EMPTY } };
}

export async function loadScalpFrames(): Promise<ScalpFrames> {
  if (cache && Date.now() - cache.at < TTL) return cache.frames;
  const [s, spy, qqq, gld] = await Promise.all([sol(), equity("SPY"), equity("QQQ"), equity("GLD")]);
  const frames: ScalpFrames = { SOL: s, SPYx: spy, QQQx: qqq, GLDx: gld };
  if (s.m15.length > 20 || spy.m15.length > 20) cache = { at: Date.now(), frames };
  return frames;
}

export function hasTape(f: SleeveFrames | undefined): boolean {
  return Boolean(f && f.m15.length >= 20 && (f.d1.length >= 5 || f.h4.length >= 16));
}
