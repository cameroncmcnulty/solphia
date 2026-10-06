/** $SPHA launch tokenomics. bps are out of 10_000 (100%). DBC pad uses 6 decimals. */

export const SPHA_SUPPLY = 200_000_000;
export const SPHA_DECIMALS = 6;
export const SPHA_NAME = "Solphia";
export const SPHA_SYMBOL = "SPHA";

export type SphaSliceId = "owner" | "foundation" | "treasury" | "lp";
export type SphaNetwork = "devnet" | "mainnet-beta";

export type SphaSlice = {
  id: SphaSliceId;
  label: string;
  pct: string;
  bps: number;
  note: string;
};

export const SPHA_SLICES: SphaSlice[] = [
  {
    id: "owner",
    label: "Dev team",
    pct: "8.6%",
    bps: 860,
    note: "Team allocation. Lands in the owner project wallet at leftover / split.",
  },
  {
    id: "foundation",
    label: "Solphia Foundation",
    pct: "9.7%",
    bps: 970,
    note: "Community, ecosystem, airdrops, and rewards. Lands in the foundation project wallet.",
  },
  {
    id: "treasury",
    label: "Treasury",
    pct: "4.6%",
    bps: 460,
    note: "Strategic partnerships, growth, and marketing. Lands in the treasury project wallet.",
  },
  {
    id: "lp",
    label: "Bonding curve",
    pct: "77.1%",
    bps: 7710,
    note: "Tradeable float on the Solphia pad from block one. Same curve, swap, and graduate path as every other launch.",
  },
];

export function sphaTokensFor(bps: number, supply = SPHA_SUPPLY): number {
  return Math.floor((supply * bps) / 10_000);
}

export function sphaRawAmount(tokens: number, decimals = SPHA_DECIMALS): bigint {
  let raw = 1n;
  for (let i = 0; i < decimals; i++) raw *= 10n;
  return BigInt(tokens) * raw;
}

export function sphaBpsTotal(): number {
  return SPHA_SLICES.reduce((s, x) => s + x.bps, 0);
}

export type SphaDestinations = {
  owner: string;
  foundation: string;
  airdrop: string;
  treasury: string;
  lp: string;
};

export type SphaAllocation = {
  id: SphaSliceId;
  label: string;
  pct: string;
  bps: number;
  tokens: number;
  wallet: string;
  note: string;
};

export function sphaReservedBps(): number {
  return SPHA_SLICES.filter((s) => s.id !== "lp").reduce((n, s) => n + s.bps, 0);
}

export function sphaReservedTokens(supply = SPHA_SUPPLY): number {
  return sphaTokensFor(sphaReservedBps(), supply);
}

export function sphaCurveTokens(supply = SPHA_SUPPLY): number {
  return supply - sphaReservedTokens(supply);
}

/** Foundation slice pays the airdrop wallet when set, else the foundation wallet. Curve slice has no wallet. */
export function sphaAllocations(dest: SphaDestinations, supply = SPHA_SUPPLY): SphaAllocation[] {
  const walletOf: Record<SphaSliceId, string> = {
    owner: dest.owner,
    foundation: dest.airdrop || dest.foundation,
    treasury: dest.treasury,
    lp: dest.lp || "curve",
  };
  return SPHA_SLICES.map((s) => ({
    ...s,
    tokens: sphaTokensFor(s.bps, supply),
    wallet: walletOf[s.id],
  }));
}

export function sphaMissingDest(dest: Partial<SphaDestinations>): SphaSliceId[] {
  const foundationPay = dest.airdrop || dest.foundation;
  const need: Partial<Record<SphaSliceId, string | undefined>> = {
    owner: dest.owner,
    foundation: foundationPay,
    treasury: dest.treasury,
  };
  return (Object.keys(need) as SphaSliceId[]).filter((k) => !need[k]);
}
