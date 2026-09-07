import type { AutoSettings, PaperBook, TraderAccount } from "./types";
import { PAPER_STARTING_USD } from "./config";
import { clampLev, SPOT_LEVERAGE, type Lev } from "./leverage";

/** Locked knobs. The hub does not expose these — mean-revert, normal band, 2m cooldown. */
export const DEFAULT_AUTO: AutoSettings = {
  armed: true,
  mode: "paper",
  allocationPct: 0.88,
  style: "scalp",
  band: "normal",
  clipPct: 0.12,
  cooldownMin: 2,
  stopPct: 0.08,
  takeProfitPct: 0.012,
  targetSolPct: 0.2,
  slippageBps: 50,
  maxImpactPct: 0.004,
  leverage: SPOT_LEVERAGE,
};

/** Production settings: user may only flip paper/live. Everything else is the better default. */
export function lockedAuto(partial?: Partial<AutoSettings>): AutoSettings {
  return {
    ...DEFAULT_AUTO,
    mode: partial?.mode === "live" ? "live" : "paper",
    armed: partial?.armed !== false,
    armedAt: partial?.armedAt,
    tradingPubkey: partial?.tradingPubkey,
    leverage: clampLev(partial?.leverage) as Lev,
  };
}

export function emptyBook(startingUsd = PAPER_STARTING_USD): PaperBook {
  const now = Date.now();
  return {
    startingUsd,
    startedAt: now,
    cashUsd: startingUsd,
    equityUsd: startingUsd,
    realizedPnlUsd: 0,
    feesPaidUsd: 0,
    slippagePaidUsd: 0,
    winCount: 0,
    lossCount: 0,
    positions: [],
    fills: [],
    curve: [{ t: now, equity: startingUsd }],
    skipped: 0,
    killed: false,
    pair: { solQty: 0, spyxQty: 0, qqqxQty: 0, gldxQty: 0, usdcQty: startingUsd },
    tape: [],
  };
}

export function emptyTrader(owner: string): TraderAccount {
  return {
    owner,
    depositedSol: 0,
    auto: lockedAuto({ armed: true, armedAt: Date.now() }),
    book: emptyBook(),
    updatedAt: Date.now(),
  };
}

/** Size a personal book to deposited SOL, or the demo $1,000 if they have not funded yet. */
export function bankrollUsd(depositedSol: number, solUsd: number): number {
  if (depositedSol > 0.001 && solUsd > 0) return Math.round(depositedSol * solUsd * 100) / 100;
  return PAPER_STARTING_USD;
}

export function maybeResizeBook(book: PaperBook, targetUsd: number): PaperBook {
  if (book.fills.length > 0 || book.positions.length > 0) return book;
  if ((book.tape || []).length > 0) return book;
  if (book.pairLearn && Object.keys(book.pairLearn).length) return book;
  if (book.startedAt && Date.now() - book.startedAt > 60_000) return book;
  const h = book.pair;
  if (h && ((h.solQty || 0) > 0 || (h.spyxQty || 0) > 0 || (h.qqqxQty || 0) > 0 || (h.gldxQty || 0) > 0)) return book;
  if (Math.abs(book.startingUsd - targetUsd) < 1) return book;
  return emptyBook(targetUsd);
}
