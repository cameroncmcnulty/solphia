import { getJson } from "../feeds/http";
import { loadSolCandles } from "../sol/candles";
import { atr, type Candle } from "../sol/indicators";
import { dailyRanges, mergeStudy, type HistoryStudy } from "./knowledge";
import type { RatioSample } from "./ratio";

type Cache = { at: number; samples: RatioSample[]; study: HistoryStudy; solDaily: Candle[]; spyDaily: Candle[] };
let cache: Cache | null = null;
const TTL = 10 * 60 * 1000;

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
    if (c > 0 && h >= l) out.push({ t: ts[i] * 1000, o, h, l, c, v });
  }
  return out;
}

async function yahoo(symbol: string, interval: string, range: string): Promise<Candle[]> {
  const encoded = encodeURIComponent(symbol);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encoded}?interval=${interval}&range=${range}`;
  const r = await getJson<unknown>(url, 8000);
  if (!r.ok || !r.data) return [];
  return parseYahoo(r.data);
}

function alignSamples(solH: Candle[], spyH: Candle[]): RatioSample[] {
  if (!solH.length || !spyH.length) return [];
  const spyByHour = new Map<number, number>();
  for (const c of spyH) spyByHour.set(Math.floor(c.t / 3_600_000), c.c);
  const out: RatioSample[] = [];
  let lastSpy = spyH[0].c;
  for (const s of solH) {
    const key = Math.floor(s.t / 3_600_000);
    const spy = spyByHour.get(key);
    if (spy && spy > 0) lastSpy = spy;
    if (s.c > 0 && lastSpy > 0) out.push({ t: s.t, sol: s.c, spyx: lastSpy });
  }
  return out;
}

export async function loadPairHistory(): Promise<{ samples: RatioSample[]; study: HistoryStudy }> {
  if (cache && Date.now() - cache.at < TTL) return { samples: cache.samples, study: cache.study };
  const [sol, spyH, spyD, gspc] = await Promise.all([
    loadSolCandles().catch(() => ({ m15: [] as Candle[], h1: [] as Candle[] })),
    yahoo("SPY", "1h", "7d"),
    yahoo("SPY", "1d", "2y"),
    yahoo("^GSPC", "1d", "10y"),
  ]);
  const spyDaily = gspc.length > spyD.length ? gspc : spyD;
  let samples = alignSamples(sol.h1, spyH.length ? spyH : spyDaily);
  // If cash SPY history is blocked, SOL hourly vs a flat SPYx print is still the right model:
  // S&P barely moves vs SOL's 5–8% days.
  if (samples.length < 24 && sol.h1.length) {
    const spyx = spyDaily.length ? spyDaily[spyDaily.length - 1].c : spyH.length ? spyH[spyH.length - 1].c : 0;
    if (spyx > 0) samples = sol.h1.map((c) => ({ t: c.t, sol: c.c, spyx }));
  }
  // Pack 1h highs/lows into UTC days for a true daily range.
  const solByDay = new Map<string, { h: number; l: number; c: number }>();
  for (const c of sol.h1) {
    const k = new Date(c.t).toISOString().slice(0, 10);
    const prev = solByDay.get(k);
    if (!prev) solByDay.set(k, { h: c.h, l: c.l, c: c.c });
    else solByDay.set(k, { h: Math.max(prev.h, c.h), l: Math.min(prev.l, c.l), c: c.c });
  }
  const solDaily = [...solByDay.values()];
  const atr15 = atr(sol.m15, 14);
  const lastAtr = atr15.length ? atr15[atr15.length - 1] : 0;
  const lastClose = sol.m15.length ? sol.m15[sol.m15.length - 1].c : 0;
  const atrPct = lastClose > 0 ? lastAtr / lastClose : 0;
  const study = mergeStudy(dailyRanges(solDaily), dailyRanges(spyDaily), atrPct);
  cache = { at: Date.now(), samples, study, solDaily: sol.h1, spyDaily };
  return { samples, study };
}

export function pushLiveSample(samples: RatioSample[], sol: number, spyx: number, now: number, max = 400): RatioSample[] {
  const next = samples[samples.length - 1];
  if (next && now - next.t < 50_000) {
    next.sol = sol;
    next.spyx = spyx;
    next.t = now;
    return samples;
  }
  samples.push({ t: now, sol, spyx });
  if (samples.length > max) samples.splice(0, samples.length - max);
  return samples;
}
