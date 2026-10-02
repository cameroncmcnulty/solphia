import { splitFee, type FeeSplit } from "../launch/curve";
import type { LaunchBook } from "../launch/engine";

export type IncomeKind = "swap" | "pin" | "boost" | "seat";

/** Boosts and pins: 50% owner / 50% treasury of the full payment. */
export function evenShare(sol: number): FeeSplit {
  const fee = Math.max(0, Number(sol) || 0);
  const owner = fee / 2;
  return { dev: 0, owner, treasury: fee - owner, referral: 0 };
}

export function creditProtocol(
  book: LaunchBook,
  opts: { ownerSol: number; treasurySol: number; kind?: IncomeKind; grossSol?: number },
) {
  const owner = Math.max(0, Number(opts.ownerSol) || 0);
  const treasury = Math.max(0, Number(opts.treasurySol) || 0);
  const gross = Math.max(0, Number(opts.grossSol) || owner + treasury);
  book.ownerEarningsSol = (book.ownerEarningsSol || 0) + owner;
  book.treasuryFeesSol = (book.treasuryFeesSol || 0) + treasury;
  if (opts.kind === "pin") book.pinFeesSol = (book.pinFeesSol || 0) + gross;
  else if (opts.kind === "boost") book.boostFeesSol = (book.boostFeesSol || 0) + gross;
  else if (opts.kind === "seat") book.seatFeesSol = (book.seatFeesSol || 0) + gross;
  else if (opts.kind === "swap") book.swapFeesSol = (book.swapFeesSol || 0) + gross;
}

/** Pins / boosts land 100% in treasury; owner 50% sits unclaimed until Phantom claim. */
export function creditEvenIncome(book: LaunchBook, sol: number, kind: "pin" | "boost") {
  const s = evenShare(sol);
  creditProtocol(book, { ownerSol: s.owner, treasurySol: s.treasury, kind, grossSol: sol });
}

/**
 * Partner (protocol) DBC claim lands in treasury. Half is the owner's 25% of the 1% fee
 * and sits unclaimed until the owner claim button.
 */
export function creditPartnerClaim(book: LaunchBook, claimSol: number) {
  const s = evenShare(claimSol);
  creditProtocol(book, { ownerSol: s.owner, treasurySol: s.treasury, kind: "swap", grossSol: claimSol });
}

/** Jupiter / open-market 1% has no Solphia creator: 25% owner (12.5% if referred) / rest protocol. */
export function creditSwapHold(book: LaunchBook, feeSol: number, referred: boolean) {
  const s = splitFee(Math.max(0, feeSol), referred);
  creditProtocol(book, {
    ownerSol: s.owner,
    treasurySol: s.treasury + s.dev,
    kind: "swap",
    grossSol: feeSol,
  });
}

export function creditSeatHold(book: LaunchBook, sol: number, referred: boolean) {
  const s = splitFee(Math.max(0, sol), referred);
  creditProtocol(book, {
    ownerSol: s.owner,
    treasurySol: s.treasury + s.dev,
    kind: "seat",
    grossSol: sol,
  });
}
