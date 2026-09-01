import type { TokenSnapshot } from "../types";
import { getJson, num } from "../feeds/http";
import { blankSnapshot, dexToVenue } from "../feeds/normalize";
import { gradeDesk } from "./desk";

const WSOL = "So11111111111111111111111111111111111111112";
const MAX_COPY_MCAP = 8_000_000;
const MIN_COPY_MCAP = 6_000;

type DexPair = {
  chainId: string;
  dexId: string;
  pairAddress?: string;
  baseToken?: { address: string; name: string; symbol: string };
  priceUsd?: string;
  fdv?: number;
  marketCap?: number;
  liquidity?: { usd?: number };
  volume?: { m5?: number; h1?: number; h24?: number };
  txns?: { h1?: { buys?: number; sells?: number }; m5?: { buys?: number; sells?: number } };
  priceChange?: { m5?: number; h1?: number; h6?: number; h24?: number };
  pairCreatedAt?: number;
  info?: { imageUrl?: string };
};

export type LeaderBook = {
  held: Map<string, { handles: string[]; maxHoldPct: number }>;
  dumped: Map<string, string[]>;
};

let cache: { at: number; tokens: TokenSnapshot[]; book: LeaderBook } | null = null;

function pairToToken(pair: DexPair, copiedBy: string[], holding: boolean, holdPct: number): TokenSnapshot | null {
  const base = pair.baseToken;
  if (!base?.address || base.address === WSOL) return null;
  const buys = num(pair.txns?.h1?.buys);
  const sells = num(pair.txns?.h1?.sells);
  const mcap = num(pair.marketCap) || num(pair.fdv);
  const liq = num(pair.liquidity?.usd);
  if (mcap > MAX_COPY_MCAP) return null;
  if (mcap > 0 && mcap < MIN_COPY_MCAP) return null;
  if (liq > 0 && liq < 2_500) return null;
  return blankSnapshot({
    mint: base.address,
    name: base.name || base.symbol,
    symbol: base.symbol,
    image: pair.info?.imageUrl,
    venue: dexToVenue(pair.dexId),
    pairAddress: pair.pairAddress,
    createdAt: num(pair.pairCreatedAt, Date.now()),
    priceUsd: num(pair.priceUsd),
    marketCapUsd: mcap,
    liquidityUsd: liq,
    volume5m: num(pair.volume?.m5),
    volume1h: num(pair.volume?.h1),
    volume24h: num(pair.volume?.h24),
    txns5m: num(pair.txns?.m5?.buys) + num(pair.txns?.m5?.sells),
    txns1h: buys + sells,
    buys1h: buys,
    sells1h: sells,
    uniqueTraders1h: Math.round((buys + sells) * 0.62),
    uniqueEstimated: true,
    priceChange5m: num(pair.priceChange?.m5),
    priceChange1h: num(pair.priceChange?.h1),
    priceChange6h: num(pair.priceChange?.h6),
    priceChange24h: num(pair.priceChange?.h24),
    bondingProgress: pair.dexId === "pumpfun" ? 0.45 : 1,
    graduated: pair.dexId !== "pumpfun",
    smartMoneyInflow: true,
    copiedBy,
    copiedHolding: holding,
    leaderHoldPct: holdPct || undefined,
    farmCluster: copiedBy.length >= 4,
  });
}

async function dexTokens(mints: string[]): Promise<Map<string, DexPair>> {
  const best = new Map<string, DexPair>();
  for (let i = 0; i < mints.length; i += 8) {
    const batch = mints.slice(i, i + 8);
    const r = await getJson<{ pairs?: DexPair[] }>(
      `https://api.dexscreener.com/latest/dex/tokens/${batch.join(",")}`,
    );
    for (const p of r.data?.pairs || []) {
      if (p.chainId !== "solana") continue;
      const mint = p.baseToken?.address;
      if (!mint || mint === WSOL) continue;
      const prev = best.get(mint);
      if (!prev || num(p.liquidity?.usd) > num(prev.liquidity?.usd)) best.set(mint, p);
    }
  }
  return best;
}

export async function copyUniverse(): Promise<TokenSnapshot[]> {
  const { tokens } = await copyTape();
  return tokens;
}

export async function copyTape(): Promise<{ tokens: TokenSnapshot[]; book: LeaderBook }> {
  if (cache && Date.now() - cache.at < 8 * 60 * 1000) return { tokens: cache.tokens, book: cache.book };
  const desk = await gradeDesk();
  const active = desk.rows.filter((w) => w.copied);
  const held = new Map<string, { handles: string[]; maxHoldPct: number }>();
  const dumped = new Map<string, string[]>();
  const buyMints = new Map<string, string[]>();

  for (const w of active) {
    const holds = (w.holdings || []).map((h) => h.mint);
    const holdPct = new Map((w.holdings || []).map((h) => [h.mint, h.holdPct || 0]));
    for (const mint of holds) {
      const row = held.get(mint) || { handles: [], maxHoldPct: 0 };
      if (!row.handles.includes(w.handle)) row.handles.push(w.handle);
      row.maxHoldPct = Math.max(row.maxHoldPct, holdPct.get(mint) || 0);
      held.set(mint, row);
      const buyers = buyMints.get(mint) || [];
      if (!buyers.includes(w.handle)) buyers.push(w.handle);
      buyMints.set(mint, buyers);
    }
    for (const mint of w.tradeMints || []) {
      const buyers = buyMints.get(mint) || [];
      if (!buyers.includes(w.handle)) buyers.push(w.handle);
      buyMints.set(mint, buyers);
      if (!holds.includes(mint)) {
        const d = dumped.get(mint) || [];
        if (!d.includes(w.handle)) d.push(w.handle);
        dumped.set(mint, d);
      }
    }
  }

  const mints = [...buyMints.keys()].slice(0, 36);
  const pairs = await dexTokens(mints);
  const tokens: TokenSnapshot[] = [];
  for (const [mint, pair] of pairs) {
    const copiedBy = buyMints.get(mint) || [];
    const bag = held.get(mint);
    const t = pairToToken(pair, copiedBy, Boolean(bag), bag?.maxHoldPct || 0);
    if (t) tokens.push(t);
  }
  const book: LeaderBook = { held, dumped };
  cache = { at: Date.now(), tokens, book };
  return { tokens, book };
}

export async function markMints(mints: string[]): Promise<TokenSnapshot[]> {
  const unique = [...new Set(mints.filter((m) => m && m !== WSOL))].slice(0, 24);
  if (!unique.length) return [];
  const pairs = await dexTokens(unique);
  const out: TokenSnapshot[] = [];
  for (const pair of pairs.values()) {
    const base = pair.baseToken;
    if (!base?.address) continue;
    out.push(
      blankSnapshot({
        mint: base.address,
        name: base.name || base.symbol,
        symbol: base.symbol,
        venue: dexToVenue(pair.dexId),
        pairAddress: pair.pairAddress,
        createdAt: num(pair.pairCreatedAt, Date.now()),
        priceUsd: num(pair.priceUsd),
        marketCapUsd: num(pair.marketCap) || num(pair.fdv),
        liquidityUsd: num(pair.liquidity?.usd),
        uniqueEstimated: true,
      }),
    );
  }
  return out;
}

export function leaderDumped(mint: string, copiedFrom: string | undefined, book: LeaderBook | undefined): boolean {
  if (!copiedFrom || !book) return false;
  const still = book.held.get(mint)?.handles.includes(copiedFrom);
  if (still) return false;
  const sold = book.dumped.get(mint)?.includes(copiedFrom);
  if (sold) return true;
  const weHaveHoldings = [...book.held.values()].some((h) => h.handles.includes(copiedFrom));
  return weHaveHoldings;
}
