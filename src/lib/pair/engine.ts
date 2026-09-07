import type { AutoSettings, PaperBook, PaperFill, PaperPosition, PairHoldings as BookHoldings } from "../types";

import { sessionBandMult, usEquitySession, type HistoryStudy } from "./knowledge";
import { BAND_K, bumpBand, livePx, readPair, type BandName, type RatioRead } from "./ratio";
import {
  GAS_RESERVE_SOL,
  MIN_XSTOCK_LIQUIDITY_USD,
  SOL_MINT,
  XSTOCKS,
  type XStockId,
  xstockById,
  xstockMint,
} from "./mints";
import type { PairPrices } from "./prices";
import type { RatioSample } from "./ratio";
import { SLEEVE_WEIGHT, TRADE_PAIRS, xstockIdOf, type Sleeve, type TradePair } from "./catalog";
import { enrichStudy } from "./policy";
import type { ShortTape } from "./shortTape";
import type { ScalpFrames } from "./frames";
import { DEFAULT_LEARN, RISK_SLEEVES, needOf, nextTrail, readAsset } from "./signals";

export type { Sleeve, TradePair } from "./catalog";
export { SLEEVE_WEIGHT, TRADE_PAIRS };

export { PAIR_FEE_BPS, PAIR_SLIP_BPS, PROTOCOL_FEE_BPS } from "../config";
export const PAIR_MIN_CLIP_USD = 15;
export const PAIR_MAX_IMPACT = 0.004;
export const SOL_WEIGHT = SLEEVE_WEIGHT;
export const X_WEIGHT = SLEEVE_WEIGHT;

export type PairAction =
  | "hold"
  | "skip"
  | "sell_sol"
  | "sell_xstock"
  | "sell_spyx"
  | "swap"
  | "flatten"
  | "deploy"
  | "rebalance";

export type PairDecision = {
  action: PairAction;
  reason: string;
  clipUsd: number;
  from: Sleeve | "both" | "none";
  to: Sleeve | "none";
  asset?: XStockId;
  z7: number;
  z24: number;
  ratio: number;
  bandK: number;
  session: ReturnType<typeof usEquitySession>;
  read: RatioRead;
  solPct?: number;
  reads?: Record<string, RatioRead>;
  pairId?: string;
};

export type PairHoldings = BookHoldings;

export function pairOf(book: PaperBook): PairHoldings {
  const p = book.pair;
  if (p) {
    return {
      solQty: p.solQty || 0,
      spyxQty: p.spyxQty || 0,
      qqqxQty: p.qqqxQty || 0,
      gldxQty: p.gldxQty || 0,
      usdcQty: p.usdcQty ?? book.cashUsd,
      solCostUsd: p.solCostUsd || 0,
      spyxCostUsd: p.spyxCostUsd || 0,
      qqqxCostUsd: p.qqqxCostUsd || 0,
      gldxCostUsd: p.gldxCostUsd || 0,
      lastClipAt: p.lastClipAt || {},
      stops: p.stops || {},
    };
  }
  return {
    solQty: 0,
    spyxQty: 0,
    qqqxQty: 0,
    gldxQty: 0,
    usdcQty: book.cashUsd,
    solCostUsd: 0,
    spyxCostUsd: 0,
    qqqxCostUsd: 0,
    gldxCostUsd: 0,
    lastClipAt: {},
    stops: {},
  };
}

export function qtyOf(h: PairHoldings, id: XStockId): number {
  if (id === "spyx") return h.spyxQty || 0;
  if (id === "qqqx") return h.qqqxQty || 0;
  return h.gldxQty || 0;
}

export function costOf(h: PairHoldings, id: XStockId): number {
  if (id === "spyx") return h.spyxCostUsd || 0;
  if (id === "qqqx") return h.qqqxCostUsd || 0;
  return h.gldxCostUsd || 0;
}

export function setSleeve(h: PairHoldings, id: XStockId, qty: number, costUsd: number) {
  if (id === "spyx") {
    h.spyxQty = qty;
    h.spyxCostUsd = costUsd;
  } else if (id === "qqqx") {
    h.qqqxQty = qty;
    h.qqqxCostUsd = costUsd;
  } else {
    h.gldxQty = qty;
    h.gldxCostUsd = costUsd;
  }
}

function pxOf(prices: PairPrices, id: XStockId): number {
  return prices[id]?.usd || 0;
}

export function sleeveUsd(h: PairHoldings, sleeve: Sleeve, prices: PairPrices): number {
  if (sleeve === "USDC") return h.usdcQty || 0;
  if (sleeve === "SOL") return (h.solQty || 0) * (prices.sol.usd || 0);
  return qtyOf(h, xstockIdOf(sleeve) || "spyx") * livePx(prices, sleeve);
}

export function equityOf(h: PairHoldings, prices: PairPrices): number {
  return (
    h.usdcQty +
    h.solQty * prices.sol.usd +
    h.spyxQty * (prices.spyx.usd || 0) +
    (h.qqqxQty || 0) * (prices.qqqx.usd || 0) +
    (h.gldxQty || 0) * (prices.gldx.usd || 0)
  );
}

export function markPair(book: PaperBook, prices: PairPrices): PaperBook {
  const h = pairOf(book);
  const equity = equityOf(h, prices);
  book.pair = h;
  book.cashUsd = Math.round(h.usdcQty * 100) / 100;
  book.equityUsd = Math.round(equity * 100) / 100;
  const positions: PaperPosition[] = [];
  if (h.solQty > 1e-9) {
    const size = h.solQty * prices.sol.usd;
    const cost = h.solCostUsd || size;
    positions.push(sleeve("SOL", SOL_MINT, h.solQty, prices.sol.usd, size, cost, "Solana"));
  }
  for (const x of XSTOCKS) {
    const qty = qtyOf(h, x.id);
    const px = pxOf(prices, x.id);
    if (qty > 1e-9 && px > 0) {
      const size = qty * px;
      const cost = costOf(h, x.id) || size;
      positions.push(sleeve(x.symbol, xstockMint(x.id), qty, px, size, cost, x.shortName));
    }
  }
  book.positions = positions;
  return book;
}

function sleeve(
  symbol: string,
  mint: string,
  qty: number,
  mark: number,
  sizeUsd: number,
  costUsd: number,
  name: string,
): PaperPosition {
  const entry = qty > 0 ? costUsd / qty : mark;
  return {
    id: `sleeve_${symbol}`,
    mint,
    symbol,
    name,
    strategy: "sol_spyx",
    openedAt: 0,
    entryUsd: entry,
    qty,
    originalQty: qty,
    sizeUsd,
    originalSizeUsd: costUsd,
    feeUsd: 0,
    slippageUsd: 0,
    tpUsd: mark,
    slUsd: mark,
    trailArmed: false,
    trailPeakUsd: mark,
    markUsd: mark,
    unrealizedUsd: sizeUsd - costUsd,
    riskScore: 90,
    venue: "stable",
    scaledOut: 0,
  };
}

export function allocatedUsd(book: PaperBook, auto: AutoSettings, solUsd: number, depositedSol: number): number {
  const wallet = depositedSol > 0.001 && solUsd > 0 ? depositedSol * solUsd : book.startingUsd;
  const pct = clamp(auto.allocationPct ?? 0.6, 0.2, 0.8);
  return Math.max(0, wallet * pct - GAS_RESERVE_SOL * solUsd);
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

function emptyRead(asset = "sol-spyx"): RatioRead {
  return {
    ratio: 0,
    logR: 0,
    mean24: 0,
    mean7: 0,
    std24: 0,
    std7: 0,
    z24: 0,
    z7: 0,
    n24: 0,
    n7: 0,
    asset,
    pairId: asset,
  };
}

function actionFor(from: Sleeve, to: Sleeve): PairAction {
  const fromX = xstockIdOf(from);
  const toX = xstockIdOf(to);
  if (from === "SOL" && toX) return "sell_sol";
  if (fromX && to === "SOL") return "sell_xstock";
  return "swap";
}

export function decidePair(opts: {
  auto: AutoSettings;
  book: PaperBook;
  prices: PairPrices;
  samples: RatioSample[];
  study: HistoryStudy;
  now: number;
  losses?: number;
  depositedSol?: number;
  impactPct?: number;
  quoteOk?: boolean;
  live?: boolean;
  shortTape?: ShortTape;
  frames?: ScalpFrames;
}): PairDecision {
  const { auto, book, prices, samples, now } = opts;
  const study = enrichStudy(opts.study, opts.samples, opts.now);
  const session = usEquitySession(now);
  const userBand = (auto.band || "normal") as BandName;
  const band = bumpBand(userBand, opts.losses || 0);
  const bandK = BAND_K[band] * sessionBandMult(session);
  const reads = {} as Record<string, RatioRead>;
  for (const pair of TRADE_PAIRS) {
    const lp = livePx(prices, pair.left);
    const rp = livePx(prices, pair.right);
    reads[pair.id] = lp > 0 && rp > 0 ? readPair(samples, lp, rp, now, pair) : emptyRead(pair.id);
  }
  const primary = reads["sol-spyx"] || reads[TRADE_PAIRS[0].id] || emptyRead();

  const empty = (action: PairAction, reason: string, read: RatioRead = primary): PairDecision => ({
    action,
    reason,
    clipUsd: 0,
    from: "none",
    to: "none",
    z7: read.z7,
    z24: read.z24,
    ratio: read.ratio,
    bandK,
    session,
    read,
    reads,
    pairId: read.pairId,
  });

  if (book.killed) return empty("skip", "Stopped. Sitting.");
  if ((book.haltedUntil || 0) > now) return empty("skip", book.haltReason || "Paused.");
  if (!auto.armed && auto.mode === "live") return empty("hold", "Live is off. Paper still marks the book.");
  if (prices.stale || prices.sol.usd <= 0) {
    return empty("skip", prices.reason || "Prices are stale. Sitting.");
  }
  const anyLiquid = XSTOCKS.some(
    (x) => pxOf(prices, x.id) > 0 && (prices.liquidities?.[x.id] ?? 0) >= MIN_XSTOCK_LIQUIDITY_USD,
  );
  if (!anyLiquid) return empty("skip", "Markets too thin to trade.");
  if (opts.live && opts.quoteOk === false) return empty("skip", "Could not get a swap quote. Sitting.");
  if ((opts.impactPct || 0) > (auto.maxImpactPct || PAIR_MAX_IMPACT)) {
    return empty("skip", "This swap would move the price too much. Sitting.");
  }

  const h = pairOf(book);
  const equity = equityOf(h, prices);
  const start = book.startingUsd || equity;
  const dd = start > 0 ? (start - equity) / start : 0;
  const stop = auto.stopPct || 0.08;
  const anyX = XSTOCKS.some((x) => qtyOf(h, x.id) > 0);
  if (dd >= stop && (h.solQty > 0 || anyX)) {
    return {
      action: "flatten",
      reason: `Down ${(dd * 100).toFixed(1)}%. Selling everything back to USDC and pausing.`,
      clipUsd: equity,
      from: "both",
      to: "USDC",
      z7: primary.z7,
      z24: primary.z24,
      ratio: primary.ratio,
      bandK,
      session,
      read: primary,
      reads,
    };
  }

  const cooldownMs = (auto.cooldownMin ?? 2) * 60_000;
  const allocated = allocatedUsd(book, auto, prices.sol.usd, opts.depositedSol || 0);
  const learn = book.pairLearn || {};
  const usdOf = (s: Sleeve) => sleeveUsd(h, s, prices);
  if (!h.stops) h.stops = {};

  const sigs = RISK_SLEEVES.map((s) =>
    readAsset(s, samples, prices, study, now, opts.shortTape, learn[s] || DEFAULT_LEARN, opts.frames),
  ).filter((s): s is NonNullable<typeof s> => Boolean(s));

  for (const sig of sigs) {
    const pos = usdOf(sig.sleeve);
    if (pos < PAIR_MIN_CLIP_USD) continue;
    const qty =
      sig.sleeve === "SOL" ? h.solQty : qtyOf(h, xstockIdOf(sig.sleeve) || "spyx");
    const cost =
      sig.sleeve === "SOL" ? h.solCostUsd || 0 : costOf(h, xstockIdOf(sig.sleeve) || "spyx");
    const entryPx = h.stops?.[sig.sleeve]?.entryPx || (qty > 0 ? cost / qty : sig.px);
    const prev = h.stops?.[sig.sleeve] || { entryPx, peakPx: sig.px, stopPx: 0, armed: false };
    const trail = nextTrail({
      entryPx: prev.entryPx || entryPx,
      peakPx: prev.peakPx || sig.px,
      stopPx: prev.stopPx || 0,
      armed: prev.armed,
      px: sig.px,
      atrPct: sig.atrPct,
      trailK: (learn[sig.sleeve] || DEFAULT_LEARN).trailK,
    });
    h.stops[sig.sleeve] = { ...trail, entryPx: prev.entryPx || entryPx };
    book.pair = h;
    const basis = prev.entryPx || entryPx;
    const locked = basis > 0 ? trail.stopPx / basis - 1 : 0;
    if (trail.armed && sig.px <= trail.stopPx) {
      return {
        action: "swap",
        reason: `Trail hit on ${sig.sleeve} at ${sig.px.toFixed(2)} (stop ${trail.stopPx.toFixed(2)}, locked ${(locked * 100).toFixed(1)}%). Back to USDC.`,
        clipUsd: pos,
        from: sig.sleeve,
        to: "USDC",
        asset: xstockIdOf(sig.sleeve) || undefined,
        pairId: `usdc-${sig.sleeve.toLowerCase()}`,
        z7: primary.z7,
        z24: primary.z24,
        ratio: primary.ratio,
        bandK,
        session,
        read: primary,
        reads,
      };
    }
  }

  const openRisk = RISK_SLEEVES.filter((s) => usdOf(s) >= PAIR_MIN_CLIP_USD);
  if (openRisk.length) {
    const s = openRisk[0];
    const trail = h.stops?.[s];
    const px = livePx(prices, s);
    const pnl = trail && trail.entryPx > 0 ? ((px / trail.entryPx - 1) * 100).toFixed(1) : "0.0";
    const locked =
      trail?.armed && trail.entryPx > 0 ? ` · locked +${((trail.stopPx / trail.entryPx - 1) * 100).toFixed(1)}%` : "";
    const stop = trail?.armed ? ` · trail ${trail.stopPx.toFixed(2)}${locked}` : " · arming stop once fees are covered";
    return empty("hold", `In ${s} ${pnl}%${stop}. Riding it.`);
  }

  if (cooldownMs > 0 && book.lastTradeAt && now - book.lastTradeAt < cooldownMs) {
    const left = Math.ceil((cooldownMs - (now - book.lastTradeAt)) / 60000);
    return empty("hold", `USDC. Waiting ${left}m before the next buy.`);
  }

  const clipUsd = Math.max(PAIR_MIN_CLIP_USD, Math.min(allocated * 0.85, h.usdcQty * 0.9));
  let best = sigs[0];
  for (const s of sigs) if (!best || s.buy > best.buy) best = s;
  if (best && h.usdcQty >= PAIR_MIN_CLIP_USD * 2) {
    const need = needOf(learn[best.sleeve] || DEFAULT_LEARN);
    if (best.buy >= need && best.setup !== "none") {
      return {
        action: "swap",
        reason: best.reason,
        clipUsd: Math.min(clipUsd, h.usdcQty),
        from: "USDC",
        to: best.sleeve,
        asset: xstockIdOf(best.sleeve) || undefined,
        pairId: `usdc-${best.sleeve.toLowerCase()}`,
        z7: primary.z7,
        z24: primary.z24,
        ratio: primary.ratio,
        bandK,
        session,
        read: primary,
        reads,
      };
    }
  }

  const bits = sigs
    .sort((a, b) => b.buy - a.buy)
    .slice(0, 4)
    .map((s) => `${s.sleeve} ${(s.buy * 100).toFixed(0)}`);
  return empty(
    "hold",
    bits.length
      ? `USDC. Waiting on a 5m/15m scalp that agrees with Daily/4H. ${bits.join(" · ")}`
      : "USDC. Need 5m/15m tape before she sizes a buy.",
  );

}

export function id(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function fillOf(
  now: number,
  side: "buy" | "sell",
  symbol: string,
  mint: string,
  price: number,
  qty: number,
  sizeUsd: number,
  fee: number,
  slip: number,
  reason: string,
  pnlUsd?: number,
): PaperFill {
  const x = xstockById(symbol === "SPYx" ? "spyx" : symbol === "QQQx" ? "qqqx" : symbol === "GLDx" ? "gldx" : "spyx");
  const name = symbol === "SOL" ? "Solana" : symbol === "USDC" ? "USD Coin" : x.shortName;
  return {
    id: id("fill"),
    mint,
    symbol,
    name,
    strategy: "sol_spyx",
    side,
    at: now,
    priceUsd: price,
    qty,
    sizeUsd,
    feeUsd: fee,
    slippageUsd: slip,
    pnlUsd,
    pnlPct: pnlUsd != null && sizeUsd ? pnlUsd / sizeUsd : undefined,
    reason,
    riskScore: 90,
    venue: "stable",
  };
}
