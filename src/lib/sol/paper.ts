import type { Mind, PaperBook, PaperFill, PaperPosition } from "../types";
import { applyFee } from "../risk/engine";
import { pushBounded } from "../store";
import { learnFromFill, noteOpen } from "../mind/engine";
import {
  SOL_CASH_CAP,
  SOL_DAILY_GOAL,
  SOL_FEE_BPS,
  SOL_MINT,
  SOL_PARTIAL,
  SOL_RISK_PCT,
  SOL_SLIP_BPS,
  SOL_TIME_MS,
  decideSol,
  publicSol,
  solDayPnl,
  type SolDeskPublic,
  type SolSignal,
} from "./engine";
import { loadSolCandles } from "./candles";
import type { Candle } from "./indicators";

function id(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function markSol(pos: PaperPosition, price: number): PaperPosition {
  const short = pos.dir === "short";
  const u = short ? (pos.entryUsd - price) * pos.qty : (price - pos.entryUsd) * pos.qty;
  const peak = short
    ? pos.trailPeakUsd > 0
      ? Math.min(pos.trailPeakUsd, price)
      : price
    : Math.max(pos.trailPeakUsd, price);
  return { ...pos, markUsd: price, unrealizedUsd: u, trailPeakUsd: peak };
}

function solFeatures(signal: SolSignal): number[] {
  return [
    (signal.rsi15 || 50) / 100,
    Math.min(1, (signal.atrPct || 0) * 20),
    signal.dir === "long" ? 1 : 0,
    Math.min(1, (signal.rrAfterCost || 0) / 3),
    Math.min(1, (signal.stopPct || 0) * 40),
  ];
}

function openSol(book: PaperBook, signal: SolSignal, now: number, mind?: Mind): PaperFill | null {
  if (!signal.ok || !signal.dir) return null;
  const price = signal.price;
  const stopDist = Math.abs(price - signal.stop);
  if (stopDist <= 0) return null;
  const riskUsd = Math.min(book.equityUsd, book.cashUsd) * SOL_RISK_PCT;
  let qty = riskUsd / stopDist;
  let sizeUsd = qty * price;
  const cap = book.cashUsd * SOL_CASH_CAP;
  if (sizeUsd > cap) {
    sizeUsd = cap;
    qty = sizeUsd / price;
  }
  if (sizeUsd < 25 || qty <= 0) return null;
  const fee = applyFee(sizeUsd, SOL_FEE_BPS);
  const slip = applyFee(sizeUsd, SOL_SLIP_BPS);
  if (sizeUsd + fee + slip > book.cashUsd) return null;

  const fill: PaperFill = {
    id: id("fill"),
    mint: SOL_MINT,
    symbol: "SOL",
    name: "Solana",
    strategy: "sol_usd",
    side: signal.dir === "long" ? "buy" : "sell",
    at: now,
    priceUsd: price,
    qty,
    sizeUsd,
    feeUsd: fee,
    slippageUsd: slip,
    reason: `enter-sol ${signal.dir} · ${signal.reason}`,
    riskScore: 80,
    venue: "stable",
  };
  const pos: PaperPosition = {
    id: id("pos"),
    mint: SOL_MINT,
    symbol: "SOL",
    name: "Solana",
    strategy: "sol_usd",
    openedAt: now,
    entryUsd: price,
    qty,
    originalQty: qty,
    sizeUsd,
    originalSizeUsd: sizeUsd,
    feeUsd: fee,
    slippageUsd: slip,
    tpUsd: signal.tp1,
    slUsd: signal.stop,
    trailArmed: false,
    trailPeakUsd: price,
    markUsd: price,
    unrealizedUsd: 0,
    riskScore: 80,
    venue: "stable",
    scaledOut: 0,
    dir: signal.dir,
    features: solFeatures(signal),
  };
  book.cashUsd -= sizeUsd + fee + slip;
  book.feesPaidUsd += fee;
  book.slippagePaidUsd += slip;
  book.positions.push(pos);
  pushBounded(book.fills, fill, 400);
  if (mind) noteOpen(mind, SOL_MINT, pos.features || [], "sol_usd");
  return fill;
}

function closeSol(
  book: PaperBook,
  pos: PaperPosition,
  price: number,
  reason: string,
  now: number,
  fraction = 1,
  mind?: Mind,
): PaperFill {
  const frac = Math.min(1, Math.max(0, fraction));
  const qty = pos.qty * frac;
  const cost = pos.sizeUsd * frac;
  const notional = price * qty;
  const fee = applyFee(notional, SOL_FEE_BPS);
  const slip = applyFee(notional, SOL_SLIP_BPS);
  const short = pos.dir === "short";
  const gross = short ? (pos.entryUsd - price) * qty : (price - pos.entryUsd) * qty;
  const pnl = gross - fee - slip;
  const fill: PaperFill = {
    id: id("fill"),
    mint: SOL_MINT,
    symbol: "SOL",
    name: "Solana",
    strategy: "sol_usd",
    side: short ? "buy" : "sell",
    at: now,
    priceUsd: price,
    qty,
    sizeUsd: notional,
    feeUsd: fee,
    slippageUsd: slip,
    pnlUsd: pnl,
    pnlPct: cost ? pnl / cost : 0,
    reason,
    riskScore: pos.riskScore,
    venue: "stable",
  };
  book.cashUsd += cost + pnl;
  book.feesPaidUsd += fee;
  book.slippagePaidUsd += slip;
  book.realizedPnlUsd += pnl;
  if (pnl >= 0) book.winCount += 1;
  else book.lossCount += 1;
  if (frac >= 0.99) {
    book.positions = book.positions.filter((p) => p.id !== pos.id);
  } else {
    const live = book.positions.find((p) => p.id === pos.id);
    if (live) {
      live.qty = pos.qty - qty;
      live.sizeUsd = pos.sizeUsd - cost;
      live.scaledOut = (pos.scaledOut || 0) + frac;
      live.trailArmed = true;
      live.slUsd = pos.entryUsd; // breakeven after partial
    }
  }
  pushBounded(book.fills, fill, 400);
  if (mind) learnFromFill(mind, pos.mint, fill.pnlPct || 0, pos.strategy, pos.features, frac >= 0.99);
  return fill;
}

function exitSol(pos: PaperPosition, price: number, now: number): { reason: string; fraction: number } | null {
  const short = pos.dir === "short";
  if (short) {
    if (price >= pos.slUsd) return { reason: "stop-loss", fraction: 1 };
    if ((pos.scaledOut || 0) < SOL_PARTIAL - 0.01 && price <= pos.tpUsd) {
      return { reason: "take-profit-1", fraction: SOL_PARTIAL };
    }
  } else {
    if (price <= pos.slUsd) return { reason: "stop-loss", fraction: 1 };
    if ((pos.scaledOut || 0) < SOL_PARTIAL - 0.01 && price >= pos.tpUsd) {
      return { reason: "take-profit-1", fraction: SOL_PARTIAL };
    }
  }
  const stopDist = Math.abs(pos.entryUsd - pos.slUsd) || pos.entryUsd * 0.005;
  const trailGive = stopDist * 0.45;
  if (pos.trailArmed || (pos.scaledOut || 0) >= SOL_PARTIAL - 0.01) {
    if (short && price >= pos.trailPeakUsd + trailGive) return { reason: "trailing-stop", fraction: 1 };
    if (!short && price <= pos.trailPeakUsd - trailGive) return { reason: "trailing-stop", fraction: 1 };
  }
  if (now - pos.openedAt >= SOL_TIME_MS) return { reason: "time-stop", fraction: 1 };
  return null;
}

function revalue(book: PaperBook) {
  const value = book.positions.reduce((s, p) => {
    if (p.strategy === "sol_usd") return s + p.sizeUsd + p.unrealizedUsd;
    return s + p.markUsd * p.qty;
  }, 0);
  book.equityUsd = Math.round((book.cashUsd + value) * 100) / 100;
}

export async function tickSolBook(book: PaperBook, now = Date.now(), mind?: Mind): Promise<SolDeskPublic> {
  const { m15, h1 } = await loadSolCandles();
  return applySolTick(book, m15, h1, now, mind);
}

export function applySolTick(book: PaperBook, m15: Candle[], h1: Candle[], now = Date.now(), mind?: Mind): SolDeskPublic {
  const price = m15.length ? m15[m15.length - 1].c : 0;
  book.positions = book.positions.map((p) => (p.strategy === "sol_usd" && price > 0 ? markSol(p, price) : p));

  for (const pos of [...book.positions]) {
    if (pos.strategy !== "sol_usd") continue;
    const plan = exitSol(pos, pos.markUsd, now);
    if (plan) closeSol(book, pos, pos.markUsd, plan.reason, now, plan.fraction, mind);
  }

  const signal = decideSol(m15, h1, book, now);
  const { pnl } = solDayPnl(book, now);
  const equity = book.equityUsd || book.startingUsd || 1;
  if (signal.ok && pnl / equity < SOL_DAILY_GOAL) openSol(book, signal, now, mind);

  book.positions = book.positions.map((p) => (p.strategy === "sol_usd" && price > 0 ? markSol(p, price) : p));
  revalue(book);
  return publicSol(signal, book, now);
}

export async function readSolDesk(book: PaperBook, now = Date.now()): Promise<SolDeskPublic> {
  const { m15, h1 } = await loadSolCandles();
  const signal = decideSol(m15, h1, book, now);
  return publicSol(signal, book, now);
}
