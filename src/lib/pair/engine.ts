import type { AutoSettings, PaperBook, PaperFill, PaperPosition } from "../types";

import { SOL_HISTORY } from "./knowledge";
import { cashOpenAuction, sessionBandMult, usEquitySession, type HistoryStudy } from "./knowledge";
import { BAND_K, bumpBand, readRatio, type BandName, type RatioRead, type RatioSample } from "./ratio";
import { GAS_RESERVE_SOL, MIN_SPYX_LIQUIDITY_USD, SOL_MINT, spyxMint } from "./mints";
import type { PairPrices } from "./prices";

export const PAIR_FEE_BPS = 5;
export const PAIR_SLIP_BPS = 4;
export const PAIR_MIN_CLIP_USD = 15;
export const PAIR_MAX_IMPACT = 0.004;

export type PairAction = "hold" | "skip" | "sell_sol" | "sell_spyx" | "flatten" | "deploy" | "rebalance";

export type PairDecision = {
  action: PairAction;
  reason: string;
  clipUsd: number;
  from: "SOL" | "SPYx" | "USDC" | "both" | "none";
  to: "SOL" | "SPYx" | "USDC" | "none";
  z7: number;
  z24: number;
  ratio: number;
  bandK: number;
  session: ReturnType<typeof usEquitySession>;
  read: RatioRead;
  solPct?: number;
};

export type PairHoldings = {
  solQty: number;
  spyxQty: number;
  usdcQty: number;
  solCostUsd?: number;
  spyxCostUsd?: number;
};

export function pairOf(book: PaperBook): PairHoldings {
  const p = book.pair;
  if (p) {
    return {
      solQty: p.solQty || 0,
      spyxQty: p.spyxQty || 0,
      usdcQty: p.usdcQty ?? book.cashUsd,
      solCostUsd: p.solCostUsd || 0,
      spyxCostUsd: p.spyxCostUsd || 0,
    };
  }
  return { solQty: 0, spyxQty: 0, usdcQty: book.cashUsd, solCostUsd: 0, spyxCostUsd: 0 };
}

export function markPair(book: PaperBook, prices: PairPrices): PaperBook {
  const h = pairOf(book);
  const solUsd = prices.sol.usd;
  const spyxUsd = prices.spyx.usd;
  const equity = h.usdcQty + h.solQty * solUsd + h.spyxQty * spyxUsd;
  book.pair = h;
  book.cashUsd = Math.round(h.usdcQty * 100) / 100;
  book.equityUsd = Math.round(equity * 100) / 100;
  const positions: PaperPosition[] = [];
  if (h.solQty > 1e-9) {
    const size = h.solQty * solUsd;
    const cost = h.solCostUsd || size;
    positions.push(sleeve("SOL", SOL_MINT, h.solQty, solUsd, size, cost));
  }
  if (h.spyxQty > 1e-9) {
    const size = h.spyxQty * spyxUsd;
    const cost = h.spyxCostUsd || size;
    positions.push(sleeve("SPYx", spyxMint(), h.spyxQty, spyxUsd, size, cost));
  }
  book.positions = positions;
  return book;
}

function sleeve(symbol: string, mint: string, qty: number, mark: number, sizeUsd: number, costUsd: number): PaperPosition {
  const entry = qty > 0 ? costUsd / qty : mark;
  return {
    id: `sleeve_${symbol}`,
    mint,
    symbol,
    name: symbol === "SOL" ? "Solana" : "SP500 xStock",
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
  const pct = clamp(auto.allocationPct ?? 0.5, 0.2, 0.8);
  return Math.max(0, wallet * pct - GAS_RESERVE_SOL * solUsd);
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
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
}): PairDecision {
  const { auto, book, prices, samples, study, now } = opts;
  const session = usEquitySession(now);
  const userBand = (auto.band || "normal") as BandName;
  const band = bumpBand(userBand, opts.losses || 0);
  const bandK = BAND_K[band] * sessionBandMult(session);
  const read = readRatio(samples, prices.sol.usd, prices.spyx.usd, now);
  const empty = (action: PairAction, reason: string): PairDecision => ({
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
  });

  if (book.killed) return empty("skip", "Kill switch is on. Flattened. Sitting.");
  if ((book.haltedUntil || 0) > now) return empty("skip", book.haltReason || "Halted.");
  if (!auto.armed) return empty("hold", "Bot is idle. Launch her to paper-trade the ratio.");
  if (prices.stale || prices.sol.usd <= 0 || prices.spyx.usd <= 0) {
    return empty("skip", prices.reason || "Stale oracle. Skip.");
  }
  if (prices.liquidityUsd < MIN_SPYX_LIQUIDITY_USD) {
    return empty("skip", `SPYx liquidity $${Math.round(prices.liquidityUsd)} under $${MIN_SPYX_LIQUIDITY_USD}. Skip.`);
  }
  if (cashOpenAuction(now)) return empty("skip", "US cash open auction. Sit 15 minutes.");
  if (opts.quoteOk === false) return empty("skip", "Jupiter quote failed. Skip.");
  if ((opts.impactPct || 0) > (auto.maxImpactPct || PAIR_MAX_IMPACT)) {
    return empty("skip", `Price impact ${((opts.impactPct || 0) * 100).toFixed(2)}% over cap. Skip.`);
  }
  if (read.n7 < 12) return empty("skip", "Need more SOL/SPY history before she sizes a clip.");

  const h = pairOf(book);
  const equity = h.usdcQty + h.solQty * prices.sol.usd + h.spyxQty * prices.spyx.usd;
  const start = book.startingUsd || equity;
  const dd = start > 0 ? (start - equity) / start : 0;
  const stop = auto.stopPct || 0.08;
  if (dd >= stop && (h.solQty > 0 || h.spyxQty > 0)) {
    return {
      action: "flatten",
      reason: `Stop −${(dd * 100).toFixed(1)}% on allocated stack. Flatten to USDC.`,
      clipUsd: equity,
      from: "both",
      to: "USDC",
      z7: read.z7,
      z24: read.z24,
      ratio: read.ratio,
      bandK,
      session,
      read,
    };
  }

  if (auto.cooldownMin && book.lastTradeAt && now - book.lastTradeAt < auto.cooldownMin * 60_000) {
    const left = Math.ceil((auto.cooldownMin * 60_000 - (now - book.lastTradeAt)) / 60000);
    return empty("hold", `Cooldown ${left}m. Sitting.`);
  }

  const allocated = allocatedUsd(book, auto, prices.sol.usd, opts.depositedSol || 0);
  const clipPct = clamp(auto.clipPct ?? 0.15, 0.05, 0.35);
  const clipUsd = Math.max(PAIR_MIN_CLIP_USD, Math.min(allocated * clipPct, allocated * 0.35));

  const solUsd = h.solQty * prices.sol.usd;
  const spyxUsd = h.spyxQty * prices.spyx.usd;
  const deployed = solUsd + spyxUsd;

  if (deployed < PAIR_MIN_CLIP_USD && h.usdcQty >= PAIR_MIN_CLIP_USD * 2) {
    const solPct = auto.style === "hold_mix" ? clamp(auto.targetSolPct ?? 0.5, 0.2, 0.8) : 0.5;
    return {
      action: "deploy",
      reason:
        auto.style === "hold_mix"
          ? `Deploy working capital toward ${Math.round(solPct * 100)}% SOL / ${Math.round((1 - solPct) * 100)}% SPYx.`
          : "Deploy USDC into SOL and SPYx sleeves, then wait for the ratio to stretch.",
      clipUsd: Math.min(h.usdcQty, allocated),
      from: "USDC",
      to: "SOL",
      z7: read.z7,
      z24: read.z24,
      ratio: read.ratio,
      bandK,
      session,
      read,
      solPct,
    };
  }

  const minExt = Math.max(SOL_HISTORY.noiseFloorPct * 0.8, (study.solAtr15mPct || SOL_HISTORY.atr15mPct) * 0.8);
  const ext7 = Math.abs(read.logR - read.mean7);

  if (auto.style === "hold_mix") {
    const targetSol = auto.targetSolPct ?? 0.5;
    const mix = deployed > 0 ? solUsd / deployed : targetSol;
    const drift = Math.abs(mix - targetSol);
    const trigger = band === "tight" ? 0.03 : band === "wide" ? 0.1 : 0.06;
    if (drift < trigger) return empty("hold", `Mix ${(mix * 100).toFixed(0)}/${((1 - mix) * 100).toFixed(0)} inside band.`);
    const sellSol = mix > targetSol;
    return {
      action: sellSol ? "sell_sol" : "sell_spyx",
      reason: `Hold-mix drift ${(drift * 100).toFixed(1)}%. Clip back toward ${Math.round(targetSol * 100)}% SOL.`,
      clipUsd: Math.min(clipUsd, sellSol ? solUsd : spyxUsd),
      from: sellSol ? "SOL" : "SPYx",
      to: sellSol ? "SPYx" : "SOL",
      z7: read.z7,
      z24: read.z24,
      ratio: read.ratio,
      bandK,
      session,
      read,
    };
  }

  // Take-profit / rebalance: if both sleeves exist and equity is up, clip the winner back toward 50/50.
  const tp = auto.takeProfitPct || 0.12;
  const up = start > 0 ? (equity - start) / start : 0;
  if (up >= tp && deployed > PAIR_MIN_CLIP_USD * 2) {
    const target = 0.5;
    const mix = solUsd / deployed;
    if (Math.abs(mix - target) > 0.08) {
      const sellSol = mix > target;
      return {
        action: "rebalance",
        reason: `Lock +${(up * 100).toFixed(1)}% back toward 50/50.`,
        clipUsd: Math.min(clipUsd, sellSol ? solUsd : spyxUsd),
        from: sellSol ? "SOL" : "SPYx",
        to: sellSol ? "SPYx" : "SOL",
        z7: read.z7,
        z24: read.z24,
        ratio: read.ratio,
        bandK,
        session,
        read,
      };
    }
  }

  if (ext7 < minExt) {
    return empty("hold", `Ratio inside SOL 15m noise (${(ext7 * 100).toFixed(2)}% vs ${(minExt * 100).toFixed(2)}%). Sit.`);
  }

  const high = read.z7 > bandK && read.z24 > bandK * 0.45;
  const low = read.z7 < -bandK && read.z24 < -bandK * 0.45;
  if (high) {
    if (solUsd < PAIR_MIN_CLIP_USD) return empty("skip", "SOL sleeve empty. Cannot sell SOL for SPYx.");
    return {
      action: "sell_sol",
      reason: `R extended high (z7 ${read.z7.toFixed(2)} > ${bandK.toFixed(2)} ${band}${session !== "cash" ? `, ${session}` : ""}). Sell SOL clip for SPYx.`,
      clipUsd: Math.min(clipUsd, solUsd),
      from: "SOL",
      to: "SPYx",
      z7: read.z7,
      z24: read.z24,
      ratio: read.ratio,
      bandK,
      session,
      read,
    };
  }
  if (low) {
    if (spyxUsd < PAIR_MIN_CLIP_USD) return empty("skip", "SPYx sleeve empty. Cannot sell SPYx for SOL.");
    return {
      action: "sell_spyx",
      reason: `R extended low (z7 ${read.z7.toFixed(2)} < −${bandK.toFixed(2)} ${band}${session !== "cash" ? `, ${session}` : ""}). Sell SPYx clip for SOL.`,
      clipUsd: Math.min(clipUsd, spyxUsd),
      from: "SPYx",
      to: "SOL",
      z7: read.z7,
      z24: read.z24,
      ratio: read.ratio,
      bandK,
      session,
      read,
    };
  }
  return empty("hold", `Ratio inside ${band} band (z7 ${read.z7.toFixed(2)}, need ±${bandK.toFixed(2)}). Sit.`);
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
  return {
    id: id("fill"),
    mint,
    symbol,
    name: symbol === "SOL" ? "Solana" : symbol === "SPYx" ? "SP500 xStock" : "USD Coin",
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


