import type { AutoSettings, PaperBook, PaperFill, PaperPosition, PairHoldings as BookHoldings } from "../types";

import { SOL_HISTORY } from "./knowledge";
import { cashOpenAuction, sessionBandMult, usEquitySession, type HistoryStudy } from "./knowledge";
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
import {
  SLEEVE_WEIGHT,
  SLEEVES,
  TRADE_PAIRS,
  involvesEquity,
  involvesSol,
  sleeveName,
  xstockIdOf,
  type Sleeve,
  type TradePair,
} from "./catalog";
import { enrichStudy, reviewTrade, sampleCount, sleeveReturn } from "./policy";

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
}): PairDecision {
  const { auto, book, prices, samples, now } = opts;
  const study = enrichStudy(opts.study, opts.samples, opts.now);
  const session = usEquitySession(now);
  const userBand = (auto.band || "normal") as BandName;
  const band = bumpBand(userBand, opts.losses || 0);
  const bandK = BAND_K[band] * sessionBandMult(session);
  const auction = cashOpenAuction(now);
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
  const clipPct = clamp(auto.clipPct ?? 0.12, 0.05, 0.35);
  const clipUsd = Math.max(PAIR_MIN_CLIP_USD, Math.min(allocated * clipPct, allocated * 0.35));
  const usdOf = (s: Sleeve) => sleeveUsd(h, s, prices);
  const solUsd = usdOf("SOL");
  const deployedRisk = SLEEVES.filter((s) => s !== "USDC").reduce((n, s) => n + usdOf(s), 0);

  if (deployedRisk < PAIR_MIN_CLIP_USD && h.usdcQty >= PAIR_MIN_CLIP_USD * 2) {
    return {
      action: "deploy",
      reason: "Splitting USDC across SOL, S&P 500, Nasdaq-100, and gold so she can trade any pair.",
      clipUsd: Math.min(h.usdcQty, allocated),
      from: "USDC",
      to: "SOL",
      z7: primary.z7,
      z24: primary.z24,
      ratio: primary.ratio,
      bandK,
      session,
      read: primary,
      reads,
      solPct: SLEEVE_WEIGHT,
    };
  }

  const missing = SLEEVES.filter((s) => {
    if (s === "USDC") return usdOf(s) < PAIR_MIN_CLIP_USD;
    if (s === "SOL") return usdOf(s) < PAIR_MIN_CLIP_USD && prices.sol.usd > 0;
    const id = xstockIdOf(s);
    if (!id) return false;
    const liq = prices.liquidities?.[id] ?? 0;
    return livePx(prices, s) > 0 && liq >= MIN_XSTOCK_LIQUIDITY_USD && usdOf(s) < PAIR_MIN_CLIP_USD;
  });
  if (missing.length && deployedRisk >= PAIR_MIN_CLIP_USD) {
    const target = missing[0];
    const fat = SLEEVES.slice()
      .filter((s) => s !== target)
      .sort((a, b) => usdOf(b) - usdOf(a))[0];
    if (target !== "USDC" && usdOf("USDC") >= PAIR_MIN_CLIP_USD) {
      return {
        action: "deploy",
        reason: `Adding ${sleeveName(target)} so she can trade that pair too.`,
        clipUsd: Math.min(h.usdcQty, clipUsd),
        from: "USDC",
        to: target,
        asset: xstockIdOf(target) || undefined,
        z7: primary.z7,
        z24: primary.z24,
        ratio: primary.ratio,
        bandK,
        session,
        read: primary,
        reads,
        solPct: target === "SOL" ? 1 : 0,
      };
    }
    if (fat && usdOf(fat) >= PAIR_MIN_CLIP_USD * 2) {
      return {
        action: actionFor(fat, target),
        reason: `Moving a slice into ${sleeveName(target)} so every pair is ready.`,
        clipUsd: Math.min(clipUsd, usdOf(fat) * 0.25),
        from: fat,
        to: target,
        asset: xstockIdOf(target) || xstockIdOf(fat) || undefined,
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

  const solExt = Math.max(SOL_HISTORY.noiseFloorPct * 0.8, (study.solAtr15mPct || SOL_HISTORY.atr15mPct) * 0.8);
  const usdExt = 0.003;

  type Cand = PairDecision & { score: number };
  const cands: Cand[] = [];
  let lastVeto = "";
  for (const pair of TRADE_PAIRS) {
    if (auction && involvesEquity(pair)) continue;
    const read = reads[pair.id];
    if (!read || read.n7 < 12) continue;
    const lastPair = h.lastClipAt?.[pair.id] || 0;
    if (cooldownMs > 0 && lastPair && now - lastPair < cooldownMs) continue;
    if (cooldownMs > 0 && book.lastTradeAt && now - book.lastTradeAt < cooldownMs) continue;
    const minExt = involvesSol(pair) ? solExt : usdExt;
    const ext7 = Math.abs(read.logR - read.mean7);
    if (ext7 < minExt) continue;
    const high = read.z7 > bandK && read.z24 > bandK * 0.45;
    const low = read.z7 < -bandK && read.z24 < -bandK * 0.45;
    if (!high && !low) continue;
    const from = high ? pair.left : pair.right;
    const to = high ? pair.right : pair.left;
    const fromUsd = usdOf(from);
    if (fromUsd < PAIR_MIN_CLIP_USD) continue;
    const verdict = reviewTrade({
      pair,
      from,
      to,
      high,
      read,
      ext7,
      session,
      study,
      equity,
      fromUsd,
      toUsd: usdOf(to),
      clipUsd: Math.min(clipUsd, fromUsd),
      impactPct: opts.impactPct || 0,
      samples,
      now,
    });
    if (!verdict.ok) {
      lastVeto = verdict.reason;
      continue;
    }
    cands.push({
      action: actionFor(from, to),
      reason: verdict.reason,
      clipUsd: Math.min(verdict.clipUsd, fromUsd),
      from,
      to,
      asset: xstockIdOf(from) || xstockIdOf(to) || undefined,
      pairId: pair.id,
      z7: read.z7,
      z24: read.z24,
      ratio: read.ratio,
      bandK,
      session,
      read,
      reads,
      score: verdict.score,
    });
  }

  for (const pair of TRADE_PAIRS) {
    if (auction && involvesEquity(pair)) continue;
    const read = reads[pair.id];
    if (!read) continue;
    const lastPair = h.lastClipAt?.[pair.id] || 0;
    if (cooldownMs > 0 && lastPair && now - lastPair < cooldownMs) continue;
    if (cooldownMs > 0 && book.lastTradeAt && now - book.lastTradeAt < cooldownMs) continue;
    const n15 = sampleCount(samples, now, 20 * 60 * 1000);
    const left15 = sleeveReturn(samples, pair.left, now, 20 * 60 * 1000);
    const right15 = sleeveReturn(samples, pair.right, now, 20 * 60 * 1000);
    const left1h = sleeveReturn(samples, pair.left, now, 60 * 60 * 1000);
    const right1h = sleeveReturn(samples, pair.right, now, 60 * 60 * 1000);
    const rel15 = left15 - right15;
    const rel1h = left1h - right1h;
    const use15 = n15 >= 6 && Math.abs(rel15) >= Math.abs(rel1h);
    const rel = use15 ? rel15 : rel1h;
    let minPulse = involvesSol(pair) ? 0.007 : 0.008;
    if (pair.id === "spyx-qqqx") minPulse = 0.012;
    if (pair.id === "usdc-gldx") minPulse = 0.009;
    if (Math.abs(rel) < minPulse) continue;
    const high = rel > 0;
    const from = high ? pair.left : pair.right;
    const to = high ? pair.right : pair.left;
    const fromUsd = usdOf(from);
    if (fromUsd < PAIR_MIN_CLIP_USD) continue;
    const verdict = reviewTrade({
      pair,
      from,
      to,
      high,
      read,
      ext7: Math.abs(rel),
      session,
      study,
      equity,
      fromUsd,
      toUsd: usdOf(to),
      clipUsd: Math.min(clipUsd, fromUsd),
      impactPct: opts.impactPct || 0,
      samples,
      now,
      mode: "pulse",
      rel1h: rel,
    });
    if (!verdict.ok) {
      lastVeto = verdict.reason;
      continue;
    }
    cands.push({
      action: actionFor(from, to),
      reason: verdict.reason,
      clipUsd: Math.min(verdict.clipUsd, fromUsd),
      from,
      to,
      asset: xstockIdOf(from) || xstockIdOf(to) || undefined,
      pairId: pair.id,
      z7: read.z7,
      z24: read.z24,
      ratio: read.ratio,
      bandK,
      session,
      read,
      reads,
      score: verdict.score,
    });
  }
  cands.sort((a, b) => b.score - a.score);
  if (cands[0]) {
    const { score: _s, ...best } = cands[0];
    return best;
  }

  const tp = auto.takeProfitPct || 0.12;
  const up = start > 0 ? (equity - start) / start : 0;
  const cooling = cooldownMs > 0 && book.lastTradeAt && now - book.lastTradeAt < cooldownMs;
  if (!cooling && up >= tp && deployedRisk > PAIR_MIN_CLIP_USD * 2) {
    const ranked = SLEEVES.slice().sort((a, b) => usdOf(b) / Math.max(1, equity) - usdOf(a) / Math.max(1, equity));
    const fat = ranked[0];
    const thin = ranked[ranked.length - 1];
    const fatW = equity > 0 ? usdOf(fat) / equity : 0;
    if (fat !== thin && fatW - SLEEVE_WEIGHT > 0.08 && usdOf(fat) >= PAIR_MIN_CLIP_USD) {
      return {
        action: "rebalance",
        reason: `Up ${(up * 100).toFixed(1)}% in USDC. Trimming back toward an even mix.`,
        clipUsd: Math.min(clipUsd, usdOf(fat)),
        from: fat,
        to: thin,
        asset: xstockIdOf(thin) || xstockIdOf(fat) || undefined,
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

  if (cooldownMs > 0 && book.lastTradeAt && now - book.lastTradeAt < cooldownMs) {
    const left = Math.ceil((cooldownMs - (now - book.lastTradeAt)) / 60000);
    return empty("hold", `Waiting ${left}m before the next trade.`);
  }

  const zParts = TRADE_PAIRS.filter((p) => (reads[p.id]?.n7 || 0) >= 12)
    .sort((a, b) => Math.abs(reads[b.id].z7) - Math.abs(reads[a.id].z7))
    .slice(0, 3)
    .map((p) => `${p.left}/${p.right} ${reads[p.id].z7.toFixed(1)}`);
  if (!zParts.length) return empty("skip", "Need a bit more price history before she sizes a trade.");
  if (lastVeto) return empty("hold", lastVeto);
  return empty("hold", `Nothing cleared risk. Sitting. ${zParts.join(" · ")}`);
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
