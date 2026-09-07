import { getJson } from "../feeds/http";
import type { Candle } from "../sol/indicators";
import type { BacktestTape } from "./backtest";

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

async function binance1h(days = 120): Promise<Candle[]> {
  const end = Date.now();
  const start = end - days * 86_400_000;
  const out: Candle[] = [];
  let t = start;
  for (let n = 0; n < 6 && t < end; n++) {
    const url = `https://data-api.binance.vision/api/v3/klines?symbol=SOLUSDT&interval=1h&startTime=${t}&limit=1000`;
    const r = await getJson<unknown[]>(url, 8000);
    const rows = r.ok && r.data ? parseBinance(r.data) : [];
    if (!rows.length) {
      const r2 = await getJson<unknown[]>(
        `https://api.binance.com/api/v3/klines?symbol=SOLUSDT&interval=1h&startTime=${t}&limit=1000`,
        8000,
      );
      const rows2 = r2.ok && r2.data ? parseBinance(r2.data) : [];
      if (!rows2.length) break;
      out.push(...rows2);
      t = rows2[rows2.length - 1].t + 3_600_000;
      if (rows2.length < 1000) break;
      continue;
    }
    out.push(...rows);
    t = rows[rows.length - 1].t + 3_600_000;
    if (rows.length < 1000) break;
  }
  return out.sort((a, b) => a.t - b.t);
}

async function yahoo1h(symbol: string): Promise<Candle[]> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=60m&range=6mo`;
  const r = await getJson<unknown>(url, 8000);
  if (!r.ok || !r.data) return [];
  return parseYahoo(r.data);
}

export async function loadBacktestTape(): Promise<BacktestTape> {
  const [sol, spy, qqq, gld] = await Promise.all([binance1h(120), yahoo1h("SPY"), yahoo1h("QQQ"), yahoo1h("GLD")]);
  return { sol, spy, qqq, gld };
}
