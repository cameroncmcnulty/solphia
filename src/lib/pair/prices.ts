import { getJson, num } from "../feeds/http";
import {
  PYTH_SOL_USD,
  PYTH_SPYX_USD,
  MIN_XSTOCK_LIQUIDITY_USD,
  XSTOCKS,
  type XStockId,
  xstockMint,
} from "./mints";

const STALE_MS = 90_000;

export type OraclePrint = {
  usd: number;
  source: string;
  at: number;
  confPct?: number;
};

export type PairPrices = {
  sol: OraclePrint;
  spyx: OraclePrint;
  qqqx: OraclePrint;
  gldx: OraclePrint;
  liquidityUsd: number;
  liquidities: Record<XStockId, number>;
  stale: boolean;
  ageMs: number;
  reason?: string;
};

export function assetPrint(prices: PairPrices, id: XStockId): OraclePrint {
  return prices[id];
}

function pythHeaders(): Record<string, string> {
  const key = process.env.PYTH_API_KEY || "";
  const h: Record<string, string> = { accept: "application/json" };
  if (key) h.authorization = `Bearer ${key}`;
  return h;
}

async function pythUsd(feedId: string): Promise<OraclePrint | null> {
  if (!feedId) return null;
  const id = feedId.startsWith("0x") ? feedId : `0x${feedId}`;
  const urls = [
    `https://hermes.pyth.network/v2/updates/price/latest?ids[]=${id}&parsed=true`,
    `https://hermes.pyth.network/api/latest_price_feeds?ids[]=${id}`,
  ];
  for (const url of urls) {
    try {
      const res = await fetch(url, { headers: pythHeaders(), cache: "no-store" });
      if (!res.ok) continue;
      const j = (await res.json()) as any;
      const parsed = j.parsed?.[0] || j[0];
      const p = parsed?.price || parsed?.ema_price;
      if (!p) continue;
      const expo = Number(p.expo);
      const price = Number(p.price) * 10 ** expo;
      const conf = Number(p.conf || 0) * 10 ** expo;
      const at = (Number(p.publish_time) || 0) * 1000;
      if (!(price > 0)) continue;
      return { usd: price, source: "pyth", at: at || Date.now(), confPct: price ? conf / price : undefined };
    } catch {
      // next
    }
  }
  return null;
}

async function binanceSol(): Promise<OraclePrint | null> {
  for (const url of [
    "https://data-api.binance.vision/api/v3/ticker/price?symbol=SOLUSDT",
    "https://api.binance.com/api/v3/ticker/price?symbol=SOLUSDT",
  ]) {
    const r = await getJson<{ price?: string }>(url, 6000);
    const p = num(r.data?.price);
    if (r.ok && p > 0) return { usd: p, source: "binance", at: Date.now() };
  }
  return null;
}

type DexPair = {
  chainId?: string;
  baseToken?: { address?: string };
  quoteToken?: { address?: string; symbol?: string };
  priceUsd?: string;
  liquidity?: { usd?: number };
};

async function dexToken(mint: string): Promise<{ print: OraclePrint; liquidityUsd: number } | null> {
  const r = await getJson<{ pairs?: DexPair[] }>(`https://api.dexscreener.com/latest/dex/tokens/${mint}`, 8000);
  if (!r.ok || !r.data?.pairs) return null;
  const pairs = r.data.pairs.filter((p) => p.chainId === "solana" && p.baseToken?.address === mint);
  let liq = 0;
  let best: { usd: number; liq: number } | null = null;
  for (const p of pairs) {
    const usd = num(p.priceUsd);
    const l = num(p.liquidity?.usd);
    const quote = p.quoteToken?.symbol || "";
    if (quote === "USDC" || quote === "SOL" || quote === "USDT") liq += l;
    if (usd > 0 && (!best || l > best.liq)) best = { usd, liq: l };
  }
  if (!best) return null;
  return { print: { usd: best.usd, source: "dexscreener", at: Date.now() }, liquidityUsd: liq };
}

const NONE: OraclePrint = { usd: 0, source: "none", at: 0 };

export async function loadPairPrices(): Promise<PairPrices> {
  const [pythSol, pythSpyx, binance, ...dexes] = await Promise.all([
    pythUsd(PYTH_SOL_USD),
    PYTH_SPYX_USD ? pythUsd(PYTH_SPYX_USD) : Promise.resolve(null),
    binanceSol(),
    ...XSTOCKS.map((x) => dexToken(xstockMint(x.id))),
  ]);
  const sol = pythSol || binance;
  const spyx = pythSpyx || dexes[0]?.print;
  const qqqx = dexes[1]?.print;
  const gldx = dexes[2]?.print;
  const liquidities: Record<XStockId, number> = {
    spyx: dexes[0]?.liquidityUsd || 0,
    qqqx: dexes[1]?.liquidityUsd || 0,
    gldx: dexes[2]?.liquidityUsd || 0,
  };
  const liquidityUsd = liquidities.spyx;
  const liveAssets = [spyx, qqqx, gldx].filter((p) => p && p.usd > 0).length;
  if (!sol || liveAssets === 0) {
    return {
      sol: sol || NONE,
      spyx: spyx || NONE,
      qqqx: qqqx || NONE,
      gldx: gldx || NONE,
      liquidityUsd,
      liquidities,
      stale: true,
      ageMs: STALE_MS + 1,
      reason: "Price feed missing SOL or every market.",
    };
  }
  const now = Date.now();
  const ages = [sol.at, spyx?.at, qqqx?.at, gldx?.at].filter((t): t is number => Boolean(t && t > 0));
  const ageMs = ages.length ? now - Math.min(...ages.map((t) => t || now)) : STALE_MS + 1;
  const solStale = now - sol.at > STALE_MS || sol.usd <= 0;
  const anyLive = [spyx, qqqx, gldx].some((p) => p && p.usd > 0 && now - p.at <= STALE_MS);
  const stale = solStale || !anyLive;
  const thin = XSTOCKS.every((x) => liquidities[x.id] < MIN_XSTOCK_LIQUIDITY_USD);
  return {
    sol,
    spyx: spyx || NONE,
    qqqx: qqqx || NONE,
    gldx: gldx || NONE,
    liquidityUsd,
    liquidities,
    stale,
    ageMs,
    reason: stale ? "Prices are stale. Sitting." : thin ? "Markets too thin to trade." : undefined,
  };
}

export { STALE_MS };
