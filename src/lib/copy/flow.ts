import type { TokenSnapshot } from "../types";
import { getJson, getText, num } from "../feeds/http";
import { blankSnapshot, dexToVenue } from "../feeds/normalize";
import { copiedRoster } from "./desk";

const MINT_RE = /\/token\/([1-9A-HJ-NP-Za-km-z]{32,44})/g;
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

let cache: { at: number; tokens: TokenSnapshot[] } | null = null;

function pairToToken(pair: DexPair, copiedBy: string[]): TokenSnapshot | null {
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
    priceChange5m: num(pair.priceChange?.m5),
    priceChange1h: num(pair.priceChange?.h1),
    priceChange6h: num(pair.priceChange?.h6),
    priceChange24h: num(pair.priceChange?.h24),
    bondingProgress: pair.dexId === "pumpfun" ? 0.45 : 1,
    graduated: pair.dexId !== "pumpfun",
    mintAuthorityRevoked: pair.dexId !== "pumpfun" ? true : undefined,
    freezeAuthorityRevoked: pair.dexId !== "pumpfun" ? true : undefined,
    smartMoneyInflow: true,
    copiedBy,
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
  if (cache && Date.now() - cache.at < 8 * 60 * 1000) return cache.tokens;
  const wallets = copiedRoster();
  const byMint = new Map<string, string[]>();
  await Promise.all(
    wallets.map(async (w) => {
      const page = await getText(`https://kolexplorer.com/kol/${w.slug}`, 7000);
      if (!page.ok || !page.data) return;
      const found: string[] = [];
      for (const m of page.data.matchAll(MINT_RE)) {
        const mint = m[1];
        if (mint === WSOL || found.includes(mint)) continue;
        found.push(mint);
      }
      const pick = [...found.slice(0, 5), ...found.slice(-8)];
      for (const mint of new Set(pick)) {
        const list = byMint.get(mint) || [];
        list.push(w.handle);
        byMint.set(mint, list);
      }
    }),
  );
  const mints = [...byMint.keys()].slice(0, 36);
  const pairs = await dexTokens(mints);
  const tokens: TokenSnapshot[] = [];
  for (const [mint, pair] of pairs) {
    const t = pairToToken(pair, byMint.get(mint) || []);
    if (t) tokens.push(t);
  }
  cache = { at: Date.now(), tokens };
  return tokens;
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
      }),
    );
  }
  return out;
}
