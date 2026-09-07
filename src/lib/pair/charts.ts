import { getJson } from "../feeds/http";
import type { Candle } from "../sol/indicators";

export type PublicCandle = { t: number; o: number; h: number; l: number; c: number };

export type TickerChart = {
  id: string;
  symbol: string;
  name: string;
  mint?: string;
  candles: PublicCandle[];
  last: number;
  changePct: number;
};

const BINANCE = [
  "https://data-api.binance.vision/api/v3/klines",
  "https://api.binance.com/api/v3/klines",
];

let cache: { at: number; tickers: TickerChart[] } | null = null;
const TTL = 25_000;

function trim(c: Candle): PublicCandle {
  return { t: c.t, o: c.o, h: c.h, l: c.l, c: c.c };
}

function changePct(candles: PublicCandle[]): number {
  if (candles.length < 2) return 0;
  const a = candles[0].c;
  const b = candles[candles.length - 1].c;
  return a > 0 ? (b - a) / a : 0;
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

async function binanceSol(): Promise<Candle[]> {
  for (const base of BINANCE) {
    const r = await getJson<unknown[]>(`${base}?symbol=SOLUSDT&interval=15m&limit=72`, 7000);
    if (r.ok && r.data) {
      const rows = parseBinance(r.data);
      if (rows.length > 12) return rows;
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
    const v = Number(q.volume?.[i] || 0);
    if (c > 0 && h >= l && o > 0) out.push({ t: ts[i] * 1000, o, h, l, c, v });
  }
  return out;
}

async function yahoo(symbol: string): Promise<Candle[]> {
  const encoded = encodeURIComponent(symbol);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encoded}?interval=15m&range=5d`;
  const r = await getJson<unknown>(url, 8000);
  if (!r.ok || !r.data) return [];
  return parseYahoo(r.data);
}

/** Keep the latest continuous session so overnight gaps don't look like two charts. */
function latestSession(rows: Candle[], maxGapMs: number): Candle[] {
  if (rows.length < 2) return rows;
  const sorted = [...rows].sort((a, b) => a.t - b.t);
  let end = sorted.length - 1;
  let start = end;
  while (start > 0 && sorted[start].t - sorted[start - 1].t <= maxGapMs) start -= 1;
  const session = sorted.slice(start, end + 1);
  return session.length >= 8 ? session : sorted.slice(-48);
}

function pack(id: string, symbol: string, name: string, rows: Candle[], sessionOnly: boolean): TickerChart {
  const src = sessionOnly ? latestSession(rows, 45 * 60 * 1000) : rows.slice(-64);
  const candles = src.slice(-64).map(trim);
  const last = candles.length ? candles[candles.length - 1].c : 0;
  return { id, symbol, name, candles, last, changePct: changePct(candles) };
}

export async function loadTickerCharts(): Promise<TickerChart[]> {
  if (cache && Date.now() - cache.at < TTL) return cache.tickers;
  const [sol, spy, qqq, gld] = await Promise.all([binanceSol(), yahoo("SPY"), yahoo("QQQ"), yahoo("GLD")]);
  const tickers = [
    pack("sol", "SOL", "Solana", sol, false),
    pack("spyx", "SPYx", "S&P 500", spy, true),
    pack("qqqx", "QQQx", "Nasdaq-100", qqq, true),
    pack("gldx", "GLDx", "Gold", gld, true),
  ];
  if (tickers.some((t) => t.candles.length > 8)) cache = { at: Date.now(), tickers };
  return tickers;
}
