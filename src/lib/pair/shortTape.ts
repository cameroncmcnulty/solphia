import { getJson } from "../feeds/http";
import type { Candle } from "../sol/indicators";
import type { Sleeve } from "./catalog";

export type Horizon = "m1" | "m5" | "m15" | "h1";

export type SleeveRets = {
  m1: number;
  m5: number;
  m15: number;
  h1: number;
  n: number;
};

export type ShortTape = Record<Sleeve, SleeveRets>;

const EMPTY: SleeveRets = { m1: 0, m5: 0, m15: 0, h1: 0, n: 0 };

let cache: { at: number; tape: ShortTape } | null = null;
const TTL = 12_000;

function barRet(rows: Candle[], bars: number): number {
  if (rows.length <= bars) return 0;
  const a = rows[rows.length - 1 - bars].c;
  const b = rows[rows.length - 1].c;
  return a > 0 ? b / a - 1 : 0;
}

function fromBars(rows: Candle[]): SleeveRets {
  if (rows.length < 2) return { ...EMPTY };
  return {
    m1: barRet(rows, 1),
    m5: barRet(rows, Math.min(5, rows.length - 1)),
    m15: barRet(rows, Math.min(15, rows.length - 1)),
    h1: barRet(rows, Math.min(60, rows.length - 1)),
    n: rows.length,
  };
}

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

async function binance1m(): Promise<Candle[]> {
  for (const base of ["https://data-api.binance.vision/api/v3/klines", "https://api.binance.com/api/v3/klines"]) {
    const r = await getJson<unknown[]>(`${base}?symbol=SOLUSDT&interval=1m&limit=60`, 5000);
    if (r.ok && r.data) {
      const rows = parseBinance(r.data);
      if (rows.length > 10) return rows;
    }
  }
  return [];
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
    if (c > 0 && h >= l && o > 0) out.push({ t: ts[i] * 1000, o, h, l, c, v: 0 });
  }
  return out;
}

async function yahoo1m(symbol: string): Promise<Candle[]> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1m&range=1d`;
  const r = await getJson<unknown>(url, 6000);
  if (!r.ok || !r.data) return [];
  return parseYahoo(r.data);
}

export async function loadShortTape(): Promise<ShortTape> {
  if (cache && Date.now() - cache.at < TTL) return cache.tape;
  const [sol, spy, qqq, gld] = await Promise.all([binance1m(), yahoo1m("SPY"), yahoo1m("QQQ"), yahoo1m("GLD")]);
  const tape: ShortTape = {
    USDC: { ...EMPTY },
    SOL: fromBars(sol),
    SPYx: fromBars(spy),
    QQQx: fromBars(qqq),
    GLDx: fromBars(gld),
  };
  if (tape.SOL.n > 5) cache = { at: Date.now(), tape };
  return tape;
}

export function relAt(tape: ShortTape | undefined, left: Sleeve, right: Sleeve, h: Horizon): number {
  if (!tape) return 0;
  return (tape[left]?.[h] || 0) - (tape[right]?.[h] || 0);
}
