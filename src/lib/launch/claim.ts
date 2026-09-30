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

/** Newest launch first. Claim target is nextCreatorPayout, not list order. */
export function sortByNewest<T extends { createdAt?: number }>(rows: T[]): T[] {
  return rows.slice().sort((a, b) => (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0));
}

/** Highest unclaimed first so the Claim button and POST mint are the same pool. */
export function sortByUnclaimedDesc<T extends { creatorUnclaimedSol?: number; createdAt?: number }>(rows: T[]): T[] {
  return rows.slice().sort((a, b) => {
    const d = (Number(b.creatorUnclaimedSol) || 0) - (Number(a.creatorUnclaimedSol) || 0);
    if (d) return d;
    return (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0);
  });
}

export function claimableCreator<T extends { mint?: string; creatorUnclaimedSol?: number; createdAt?: number }>(
  rows: T[],
): T[] {
  return sortByUnclaimedDesc(uniqueByMint(rows).filter((row) => (Number(row.creatorUnclaimedSol) || 0) > CLAIM_DUST_SOL));
}

export function sumCreatorUnclaimed(rows: { mint?: string; creatorUnclaimedSol?: number }[]): number {
  return claimableCreator(rows).reduce((s, row) => s + (Number(row.creatorUnclaimedSol) || 0), 0);
}

/** Lifetime generated from chain creator fees only — never paper devRewardsSol. */
export function sumCreatorGenerated(rows: { mint?: string; creatorFeesSol?: number }[]): number {
  return uniqueByMint(rows).reduce((s, row) => s + Math.max(0, Number(row.creatorFeesSol) || 0), 0);
}

/**
 * Card UNCLAIMED is the wallet sum of unpaid pools.
 * One Phantom signature still pays one pool (packing flags malicious).
 * The UI drains every unpaid mint in sequence until the sum is 0.
 */
export function nextCreatorPayout<T extends { mint?: string; creatorUnclaimedSol?: number; id?: string }>(
  rows: T[],
): { next: T | null; nextSol: number; restCount: number; restSol: number; totalUnclaimed: number; mints: string[] } {
  const list = claimableCreator(rows);
  const next = list[0] || null;
  const nextSol = next ? Number(next.creatorUnclaimedSol) || 0 : 0;
  const rest = list.slice(1);
  const restSol = rest.reduce((s, row) => s + (Number(row.creatorUnclaimedSol) || 0), 0);
  return {
    next,
    nextSol,
    restCount: rest.length,
    restSol,
    totalUnclaimed: nextSol + restSol,
    mints: next?.mint ? [String(next.mint).trim()] : [],
  };
}

/** Button amount is this Phantom signature, not the wallet sum. Packing flags malicious. */
export function claimButtonSol(p: { nextSol: number }): number {
  return Number(p.nextSol) || 0;
}

export function claimHint(p: { nextSol: number; restCount: number; restSol: number; totalUnclaimed: number }): string {
  if (!(p.totalUnclaimed > 0) || !(p.nextSol > 0)) return "";
  const now = fmtClaimSol(p.nextSol);
  if (p.restCount > 0) {
    const n = p.restCount;
    return `This approval credits ${now} SOL in Phantom. ${fmtClaimSol(p.restSol)} SOL left on ${n} more token${n === 1 ? "" : "s"} — approve those next.`;
  }
  return `Phantom will credit ${now} SOL, minus the network fee.`;
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

/**
 * SOL Phantom credits on the wallet, matching Blowfish "Solana +X" (fee listed separately).
 * post - pre is net of the signature fee; add the fee back to get the claim credit.
 */
export function claimSolFromBalances(preLamports: number, postLamports: number, feeLamports: number): number {
  if (!Number.isFinite(preLamports) || !Number.isFinite(postLamports)) return 0;
  const gross = postLamports - preLamports + Math.max(0, feeLamports);
  if (!Number.isFinite(gross) || gross <= 0) return 0;
  return gross / 1e9;
}
