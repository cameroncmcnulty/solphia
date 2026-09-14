/** $SPHA launch tokenomics. bps are out of 10_000 (100%). */

export const SPHA_SUPPLY = 100_000_000;
export const SPHA_DECIMALS = 9;
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
    note: "Team allocation. Lands in the dev holdings wallet at launch.",
  },
  {
    id: "foundation",
    label: "Solphia Foundation",
    pct: "9.7%",
    bps: 970,
    note: "Community, ecosystem, airdrops, and rewards. Lands in the airdrop wallet.",
  },
  {
    id: "treasury",
    label: "Treasury",
    pct: "4.6%",
    bps: 460,
    note: "Strategic partnerships, growth, and marketing.",
  },
  {
    id: "lp",
    label: "Community market",
    pct: "77.1%",
    bps: 7710,
    note: "Tradeable float. Lands in the community-market wallet so the public can buy and sell through Solphia’s 1% router.",
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

/** Foundation slice pays the airdrop wallet when set, else the foundation wallet. */
export function sphaAllocations(dest: SphaDestinations, supply = SPHA_SUPPLY): SphaAllocation[] {
  const walletOf: Record<SphaSliceId, string> = {
    owner: dest.owner,
    foundation: dest.airdrop || dest.foundation,
    treasury: dest.treasury,
    lp: dest.lp,
  };
  return SPHA_SLICES.map((s) => ({
    ...s,
    tokens: sphaTokensFor(s.bps, supply),
    wallet: walletOf[s.id],
  }));
}

export function sphaMissingDest(dest: Partial<SphaDestinations>): SphaSliceId[] {
  const foundationPay = dest.airdrop || dest.foundation;
  const need: Record<SphaSliceId, string | undefined> = {
    owner: dest.owner,
    foundation: foundationPay,
    treasury: dest.treasury,
    lp: dest.lp,
  };
  return (Object.keys(need) as SphaSliceId[]).filter((k) => !need[k]);
}
