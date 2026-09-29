/** Dust below this is not shown or claimed. 1e-6 SOL = 1000 lamports. */
export const CLAIM_DUST_SOL = 1e-6;

export type ClaimFeeSplit = {
  creatorFeesSol: number;
  creatorUnclaimedSol: number;
  partnerFeesSol: number;
  partnerUnclaimedSol: number;
};

function lamportsToSol(v: { toString(): string } | number | null | undefined): number {
  const n = Number(v?.toString?.() || v || 0);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return n / 1e9;
}

/** Unclaimed is pool.creatorQuoteFee (what claim pays). Never use total trading volume as withdrawable. */
export function feesFromPoolAccount(inner: {
  creatorQuoteFee?: { toString(): string } | number;
  partnerQuoteFee?: { toString(): string } | number;
  metrics?: { totalTradingQuoteFee?: { toString(): string } | number };
}): ClaimFeeSplit {
  const totalQuote = lamportsToSol(inner.metrics?.totalTradingQuoteFee);
  const creatorUnclaimed = lamportsToSol(inner.creatorQuoteFee);
  const partnerUnclaimed = lamportsToSol(inner.partnerQuoteFee);
  return {
    creatorFeesSol: Math.max(creatorUnclaimed, totalQuote * 0.5),
    creatorUnclaimedSol: creatorUnclaimed,
    partnerFeesSol: Math.max(partnerUnclaimed, totalQuote * 0.5),
    partnerUnclaimedSol: partnerUnclaimed,
  };
}

export function uniqueByMint<T extends { mint?: string }>(rows: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const row of rows) {
    const mint = (row.mint || "").trim();
    if (!mint || seen.has(mint)) continue;
    seen.add(mint);
    out.push(row);
  }
  return out;
}

export function claimableCreator<T extends { mint?: string; creatorUnclaimedSol?: number }>(rows: T[]): T[] {
  return uniqueByMint(rows).filter((row) => (Number(row.creatorUnclaimedSol) || 0) > CLAIM_DUST_SOL);
}

export function sumCreatorUnclaimed(rows: { mint?: string; creatorUnclaimedSol?: number }[]): number {
  return claimableCreator(rows).reduce((s, row) => s + (Number(row.creatorUnclaimedSol) || 0), 0);
}

export function claimablePartner<T extends { mint?: string; partnerUnclaimedSol?: number }>(rows: T[]): T[] {
  return uniqueByMint(rows).filter((row) => (Number(row.partnerUnclaimedSol) || 0) > CLAIM_DUST_SOL);
}

export function sumPartnerUnclaimed(rows: { mint?: string; partnerUnclaimedSol?: number }[]): number {
  return claimablePartner(rows).reduce((s, row) => s + (Number(row.partnerUnclaimedSol) || 0), 0);
}

/** Trim SOL for money UI so 0.003982 does not round to 0.004. */
export function fmtClaimSol(n: number): string {
  if (!(n > 0)) return "0";
  return n.toFixed(6).replace(/0+$/, "").replace(/\.$/, "");
}
