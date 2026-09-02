import type { AutoSettings, PaperBook, TraderAccount } from "./types";
import { PAPER_STARTING_USD } from "./config";

export const DEFAULT_AUTO: AutoSettings = {
  armed: false,
  mode: "paper",
  copy: true,
  launch: false,
  migrate: true,
  scalp: false,
  picks: false,
  solUsd: false,
  maxSolPerTrade: 0.25,
  minScore: 70,
  takeProfitPct: 0.32,
  stopLossPct: 0.16,
  maxDevHoldPct: 15,
  autoSell: true,
};

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
  };
}

export function emptyTrader(owner: string): TraderAccount {
  return {
    owner,
    depositedSol: 0,
    auto: { ...DEFAULT_AUTO },
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
  if (Math.abs(book.startingUsd - targetUsd) < 1) return book;
  return emptyBook(targetUsd);
}
