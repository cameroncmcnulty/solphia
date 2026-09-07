import type { AutoSettings, PaperBook, PaperFill, PaperPosition, PairHoldings as BookHoldings } from "../types";

import { SOL_HISTORY } from "./knowledge";
import { cashOpenAuction, sessionBandMult, usEquitySession, type HistoryStudy } from "./knowledge";
import { BAND_K, bumpBand, readRatio, type BandName, type RatioRead } from "./ratio";
import {
  GAS_RESERVE_SOL,
  MIN_XSTOCK_LIQUIDITY_USD,
  SOL_MINT,
  XSTOCKS,
  type XStockId,
  type XStockSymbol,
  xstockById,
  xstockMint,
} from "./mints";
import type { PairPrices } from "./prices";
import type { RatioSample } from "./ratio";

export const PAIR_FEE_BPS = 5;
export const PAIR_SLIP_BPS = 4;
export const PAIR_MIN_CLIP_USD = 15;
export const PAIR_MAX_IMPACT = 0.004;
export const SOL_WEIGHT = 0.4;
export const X_WEIGHT = 0.2;

export type Sleeve = "SOL" | XStockSymbol | "USDC";
export type PairAction = "hold" | "skip" | "sell_sol" | "sell_xstock" | "sell_spyx" | "flatten" | "deploy" | "rebalance";

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
  reads?: Record<XStockId, RatioRead>;
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

function emptyRead(asset: XStockId = "spyx"): RatioRead {
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
  };
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
  const { auto, book, prices, samples, study, now } = opts;
  const session = usEquitySession(now);
  const userBand = (auto.band || "normal") as BandName;
  const band = bumpBand(userBand, opts.losses || 0);
  const bandK = BAND_K[band] * sessionBandMult(session);
  const reads = {} as Record<XStockId, RatioRead>;
  for (const x of XSTOCKS) {
    const px = pxOf(prices, x.id);
    reads[x.id] = px > 0 ? readRatio(samples, prices.sol.usd, px, now, x.id) : emptyRead(x.id);
  }
  const primary = reads.spyx.n7 >= reads.qqqx.n7 && reads.spyx.n7 >= reads.gldx.n7 ? reads.spyx : reads.qqqx.n7 >= reads.gldx.n7 ? reads.qqqx : reads.gldx;

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
  if (cashOpenAuction(now)) return empty("skip", "US market just opened. Sitting 15 minutes.");
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
      reason: `Down ${(dd * 100).toFixed(1)}%. Selling everything back to cash and pausing.`,
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

  const cooldownMs = (auto.cooldownMin ?? 5) * 60_000;
  const allocated = allocatedUsd(book, auto, prices.sol.usd, opts.depositedSol || 0);
  const clipPct = clamp(auto.clipPct ?? 0.12, 0.05, 0.35);
  const clipUsd = Math.max(PAIR_MIN_CLIP_USD, Math.min(allocated * clipPct, allocated * 0.35));

  const solUsd = h.solQty * prices.sol.usd;
  const xUsd = (id: XStockId) => qtyOf(h, id) * pxOf(prices, id);
  const deployedX = XSTOCKS.reduce((s, x) => s + xUsd(x.id), 0);
  const deployed = solUsd + deployedX;

  if (deployed < PAIR_MIN_CLIP_USD && h.usdcQty >= PAIR_MIN_CLIP_USD * 2) {
    return {
      action: "deploy",
      reason: "Putting cash into SOL, S&P 500, Nasdaq-100, and gold — then waiting for a move.",
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
      solPct: SOL_WEIGHT,
    };
  }

  const missing = XSTOCKS.filter((x) => {
    const px = pxOf(prices, x.id);
    const liq = prices.liquidities?.[x.id] ?? 0;
    return px > 0 && liq >= MIN_XSTOCK_LIQUIDITY_USD && xUsd(x.id) < PAIR_MIN_CLIP_USD;
  });
  if (missing.length && deployed >= PAIR_MIN_CLIP_USD) {
    const target = missing[0];
    if (h.usdcQty >= PAIR_MIN_CLIP_USD) {
      return {
        action: "deploy",
        reason: `Adding ${target.name} so she can trade more than one market.`,
        clipUsd: Math.min(h.usdcQty, clipUsd),
        from: "USDC",
        to: target.symbol,
        asset: target.id,
        z7: reads[target.id].z7,
        z24: reads[target.id].z24,
        ratio: reads[target.id].ratio,
        bandK,
        session,
        read: reads[target.id],
        reads,
        solPct: 0,
      };
    }
    if (solUsd >= PAIR_MIN_CLIP_USD * 2) {
      return {
        action: "sell_sol",
        reason: `Buying a slice of ${target.name} so she can trade that market too.`,
        clipUsd: Math.min(clipUsd, solUsd * 0.25),
        from: "SOL",
        to: target.symbol,
        asset: target.id,
        z7: reads[target.id].z7,
        z24: reads[target.id].z24,
        ratio: reads[target.id].ratio,
        bandK,
        session,
        read: reads[target.id],
        reads,
      };
    }
  }

  const minExt = Math.max(SOL_HISTORY.noiseFloorPct * 0.8, (study.solAtr15mPct || SOL_HISTORY.atr15mPct) * 0.8);
  const tp = auto.takeProfitPct || 0.12;
  const up = start > 0 ? (equity - start) / start : 0;
  if (up >= tp && deployed > PAIR_MIN_CLIP_USD * 2) {
    const mix = deployed > 0 ? solUsd / deployed : SOL_WEIGHT;
    if (Math.abs(mix - SOL_WEIGHT) > 0.08) {
      const sellSol = mix > SOL_WEIGHT;
      const target = sellSol
        ? XSTOCKS.slice().sort((a, b) => xUsd(a.id) - xUsd(b.id))[0]
        : XSTOCKS.slice().sort((a, b) => xUsd(b.id) - xUsd(a.id))[0];
      return {
        action: "rebalance",
        reason: `Up ${(up * 100).toFixed(1)}%. Trimming back toward a balanced mix.`,
        clipUsd: Math.min(clipUsd, sellSol ? solUsd : xUsd(target.id)),
        from: sellSol ? "SOL" : target.symbol,
        to: sellSol ? target.symbol : "SOL",
        asset: target.id,
        z7: reads[target.id].z7,
        z24: reads[target.id].z24,
        ratio: reads[target.id].ratio,
        bandK,
        session,
        read: reads[target.id],
        reads,
      };
    }
  }

  type Cand = PairDecision & { score: number };
  const cands: Cand[] = [];
  for (const x of XSTOCKS) {
    const px = pxOf(prices, x.id);
    const liq = prices.liquidities?.[x.id] ?? prices.liquidityUsd;
    const read = reads[x.id];
    if (!(px > 0)) continue;
    if (liq < MIN_XSTOCK_LIQUIDITY_USD) continue;
    if (read.n7 < 12) continue;
    const lastPair = h.lastClipAt?.[x.id] || 0;
    if (cooldownMs > 0 && lastPair && now - lastPair < cooldownMs) continue;
    if (cooldownMs > 0 && book.lastTradeAt && now - book.lastTradeAt < Math.min(90_000, cooldownMs)) continue;
    const ext7 = Math.abs(read.logR - read.mean7);
    if (ext7 < minExt) continue;
    const high = read.z7 > bandK && read.z24 > bandK * 0.45;
    const low = read.z7 < -bandK && read.z24 < -bandK * 0.45;
    if (high) {
      if (solUsd < PAIR_MIN_CLIP_USD) continue;
      cands.push({
        action: "sell_sol",
        reason: `SOL looks expensive versus ${x.name}. Selling a slice of SOL for ${x.symbol}.`,
        clipUsd: Math.min(clipUsd, solUsd),
        from: "SOL",
        to: x.symbol,
        asset: x.id,
        z7: read.z7,
        z24: read.z24,
        ratio: read.ratio,
        bandK,
        session,
        read,
        reads,
        score: Math.abs(read.z7),
      });
    } else if (low) {
      if (xUsd(x.id) < PAIR_MIN_CLIP_USD) continue;
      cands.push({
        action: "sell_xstock",
        reason: `SOL looks cheap versus ${x.name}. Selling a slice of ${x.symbol} for SOL.`,
        clipUsd: Math.min(clipUsd, xUsd(x.id)),
        from: x.symbol,
        to: "SOL",
        asset: x.id,
        z7: read.z7,
        z24: read.z24,
        ratio: read.ratio,
        bandK,
        session,
        read,
        reads,
        score: Math.abs(read.z7),
      });
    }
  }
  cands.sort((a, b) => b.score - a.score);
  if (cands[0]) {
    const { score: _s, ...best } = cands[0];
    return best;
  }

  if (cooldownMs > 0 && book.lastTradeAt && now - book.lastTradeAt < cooldownMs) {
    const left = Math.ceil((cooldownMs - (now - book.lastTradeAt)) / 60000);
    return empty("hold", `Waiting ${left}m before the next trade.`);
  }

  const zParts = XSTOCKS.filter((x) => reads[x.id].n7 >= 12).map((x) => `${x.symbol} ${reads[x.id].z7.toFixed(1)}`);
  if (!zParts.length) return empty("skip", "Need a bit more price history before she sizes a trade.");
  return empty("hold", `Nothing stretched enough yet. Sitting. ${zParts.join(" · ")}`);
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
