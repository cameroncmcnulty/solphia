import { getJson } from "../feeds/http";
import type { Candle } from "./indicators";

const URLS = [
  "https://data-api.binance.vision/api/v3/klines",
  "https://api.binance.com/api/v3/klines",
];

type Cache = { at: number; m15: Candle[]; h1: Candle[] };
let cache: Cache | null = null;
const TTL = 45_000;

function parseKlines(raw: unknown): Candle[] {
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

async function klines(interval: string, limit: number): Promise<Candle[]> {
  for (const base of URLS) {
    const r = await getJson<unknown[]>(`${base}?symbol=SOLUSDT&interval=${interval}&limit=${limit}`, 7000);
    if (r.ok && r.data) {
      const rows = parseKlines(r.data);
      if (rows.length > 30) return rows;
    }
  }
  return [];
}

export async function loadSolCandles(): Promise<{ m15: Candle[]; h1: Candle[] }> {
  if (cache && Date.now() - cache.at < TTL) return { m15: cache.m15, h1: cache.h1 };
  const [m15, h1] = await Promise.all([klines("15m", 300), klines("1h", 200)]);
  if (m15.length && h1.length) cache = { at: Date.now(), m15, h1 };
  return { m15: cache?.m15 || m15, h1: cache?.h1 || h1 };
}

export function lastPrice(m15: Candle[]): number {
  return m15.length ? m15[m15.length - 1].c : 0;
}
