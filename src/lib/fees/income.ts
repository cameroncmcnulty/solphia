import { splitFee } from "../launch/curve";
import type { LaunchBook } from "../launch/engine";
import { evenShare, harvestSplit } from "./payout";
export { evenShare, harvestSplit };

export type IncomeKind = "swap" | "pin" | "boost" | "seat";

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

/** Pins / boosts already sent 50/50 live in the payer Phantom tx. This is lifetime booked. */
export function creditEvenIncome(book: LaunchBook, sol: number, kind: "pin" | "boost") {
  const s = evenShare(sol);
  creditProtocol(book, { ownerSol: s.owner, treasurySol: s.treasury, kind, grossSol: sol });
}

/**
 * Partner (protocol) DBC claim routed into vaults. Lifetime booked, not a withdraw.
 * partnerOnly: legacy 50% creator configs — this claim is the protocol half.
 */
export function creditPartnerClaim(book: LaunchBook, claimSol: number, partnerOnly = true) {
  const s = harvestSplit(claimSol, partnerOnly, true);
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
