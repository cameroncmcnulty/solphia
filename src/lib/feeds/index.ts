import type { CreatorStat, FeedHealth, TokenSnapshot } from "../types";
import { getJson, num, str } from "./http";
import { blankSnapshot, dexToVenue, mergeSnapshots } from "./normalize";

interface PumpCoin {
  mint: string;
  name: string;
  symbol: string;
  image_uri?: string;
  creator?: string;
  created_timestamp?: number;
  complete?: boolean;
  usd_market_cap?: number;
  market_cap_usd?: number;
  market_cap?: number;
  real_sol_reserves?: number;
  virtual_sol_reserves?: number;
  nsfw?: boolean;
  is_banned?: boolean;
  is_currently_live?: boolean;
  reply_count?: number;
  verified?: boolean;
  twitter?: string;
  telegram?: string;
  website?: string;
  raydium_pool?: string;
  pool_address?: string;
  ath_market_cap?: number;
  description?: string;
}

interface DexPair {
  chainId: string;
  dexId: string;
  pairAddress: string;
  url?: string;
  baseToken?: { address: string; name: string; symbol: string };
  quoteToken?: { address: string; symbol: string };
  priceUsd?: string;
  fdv?: number;
  marketCap?: number;
  liquidity?: { usd?: number };
  volume?: { m5?: number; h1?: number; h6?: number; h24?: number };
  txns?: {
    m5?: { buys?: number; sells?: number };
    h1?: { buys?: number; sells?: number };
  };
  priceChange?: { m5?: number; h1?: number; h6?: number; h24?: number };
  pairCreatedAt?: number;
  info?: { imageUrl?: string; websites?: { url: string }[]; socials?: { type: string; url: string }[] };
}

interface GeckoPool {
  id: string;
  attributes: Record<string, unknown>;
  relationships?: {
    dex?: { data?: { id?: string } };
    base_token?: { data?: { id?: string } };
  };
}

interface LaunchRow {
  mint: string;
  poolId?: string;
  creator?: string;
  createAt?: number;
  name: string;
  symbol: string;
  description?: string;
  twitter?: string;
  imgUrl?: string;
  marketCap?: number;
  volumeU?: number;
  finishingRate?: number;
  platformInfo?: { name?: string };
}

const PUMP_GRADUATE_SOL_LAMPORTS = 85 * 1e9;

function pumpProgress(coin: PumpCoin): number {
  if (coin.complete) return 1;
  const real = num(coin.real_sol_reserves);
  if (real > 0) return Math.min(0.99, real / PUMP_GRADUATE_SOL_LAMPORTS);
  return 0;
}

function fromPump(coin: PumpCoin): TokenSnapshot {
  const mcap = num(coin.usd_market_cap) || num(coin.market_cap_usd);
  const graduated = Boolean(coin.complete);
  return blankSnapshot({
    mint: coin.mint,
    name: coin.name || coin.symbol,
    symbol: coin.symbol || "???",
    image: coin.image_uri,
    venue: graduated ? "pumpswap" : "pumpfun",
    pairAddress: coin.pool_address || coin.raydium_pool || undefined,
    creator: coin.creator,
    createdAt: num(coin.created_timestamp, Date.now()),
    marketCapUsd: mcap,
    liquidityUsd: graduated ? Math.max(mcap * 0.08, 0) : Math.max(mcap * 0.12, 0),
    bondingProgress: pumpProgress(coin),
    graduated,
    nsfw: Boolean(coin.nsfw),
    banned: Boolean(coin.is_banned),
    livestream: Boolean(coin.is_currently_live),
    replyCount: num(coin.reply_count),
    verified: Boolean(coin.verified),
    socials: {
      twitter: coin.twitter || undefined,
      telegram: coin.telegram || undefined,
      website: coin.website || undefined,
    },
    mintAuthorityRevoked: graduated ? true : undefined,
    freezeAuthorityRevoked: graduated ? true : undefined,
    athMarketCapUsd: num(coin.ath_market_cap) ? num(coin.ath_market_cap) * 100 : undefined,
  });
}

function fromDex(pair: DexPair): TokenSnapshot | null {
  if (pair.chainId !== "solana") return null;
  const base = pair.baseToken;
  if (!base?.address) return null;
  if (base.address === "So11111111111111111111111111111111111111112") return null;
  const buys = num(pair.txns?.h1?.buys);
  const sells = num(pair.txns?.h1?.sells);
  const socials: TokenSnapshot["socials"] = {};
  for (const s of pair.info?.socials || []) {
    if (s.type === "twitter") socials.twitter = s.url;
    if (s.type === "telegram") socials.telegram = s.url;
  }
  const site = pair.info?.websites?.[0]?.url;
  if (site) socials.website = site;
  const uniqueProxy = Math.round((buys + sells) * 0.62);
  return blankSnapshot({
    mint: base.address,
    name: base.name || base.symbol,
    symbol: base.symbol,
    image: pair.info?.imageUrl,
    venue: dexToVenue(pair.dexId),
    pairAddress: pair.pairAddress,
    createdAt: num(pair.pairCreatedAt, Date.now()),
    priceUsd: num(pair.priceUsd),
    marketCapUsd: num(pair.marketCap) || num(pair.fdv),
    liquidityUsd: num(pair.liquidity?.usd),
    volume5m: num(pair.volume?.m5),
    volume1h: num(pair.volume?.h1),
    volume24h: num(pair.volume?.h24),
    txns5m: num(pair.txns?.m5?.buys) + num(pair.txns?.m5?.sells),
    txns1h: buys + sells,
    buys1h: buys,
    sells1h: sells,
    uniqueTraders1h: uniqueProxy,
    priceChange5m: num(pair.priceChange?.m5),
    priceChange1h: num(pair.priceChange?.h1),
    priceChange6h: num(pair.priceChange?.h6),
    priceChange24h: num(pair.priceChange?.h24),
    bondingProgress: pair.dexId === "pumpfun" ? 0.4 : 1,
    graduated: pair.dexId !== "pumpfun",
    socials,
  });
}

function fromGecko(pool: GeckoPool): TokenSnapshot | null {
  const attrs = pool.attributes || {};
  const name = str(attrs.name);
  const baseId = str(pool.relationships?.base_token?.data?.id).replace(/^solana_/, "");
  if (!baseId || baseId.includes("so11111111111111111111111111111111111111112")) return null;
  const dex = str(pool.relationships?.dex?.data?.id);
  const created = Date.parse(str(attrs.pool_created_at)) || Date.now();
  const txnsH1 = (attrs.transactions as { h1?: { buys?: number; sells?: number; buyers?: number } } | undefined)?.h1;
  const vol = attrs.volume_usd as { h1?: string; h24?: string; m5?: string } | undefined;
  return blankSnapshot({
    mint: baseId,
    name: name.split(" / ")[0] || "unknown",
    symbol: name.split(" / ")[0] || "???",
    venue: dexToVenue(dex),
    pairAddress: str(attrs.address) || undefined,
    createdAt: created,
    priceUsd: num(attrs.base_token_price_usd),
    marketCapUsd: num(attrs.fdv_usd) || num(attrs.market_cap_usd),
    liquidityUsd: num(attrs.reserve_in_usd),
    volume5m: num(vol?.m5),
    volume1h: num(vol?.h1),
    volume24h: num(vol?.h24),
    buys1h: num(txnsH1?.buys),
    sells1h: num(txnsH1?.sells),
    txns1h: num(txnsH1?.buys) + num(txnsH1?.sells),
    uniqueTraders1h: num(txnsH1?.buyers) || Math.round((num(txnsH1?.buys) + num(txnsH1?.sells)) * 0.6),
    priceChange1h: num(attrs.price_change_percentage && (attrs.price_change_percentage as { h1?: string }).h1),
    priceChange24h: num(attrs.price_change_percentage && (attrs.price_change_percentage as { h24?: string }).h24),
    graduated: !dex.includes("pump"),
    bondingProgress: dex.includes("pump") ? 0.5 : 1,
  });
}

function fromLaunch(row: LaunchRow): TokenSnapshot {
  const finishing = num(row.finishingRate);
  const progress = finishing > 1 ? finishing / 100 : finishing;
  return blankSnapshot({
    mint: row.mint,
    name: row.name,
    symbol: row.symbol,
    image: row.imgUrl,
    venue: "launchlab",
    pairAddress: row.poolId,
    creator: row.creator,
    createdAt: num(row.createAt, Date.now()),
    marketCapUsd: num(row.marketCap),
    volume1h: num(row.volumeU),
    bondingProgress: Math.min(1, progress),
    graduated: progress >= 1,
    socials: { twitter: row.twitter || undefined },
    mintAuthorityRevoked: progress >= 1 ? true : undefined,
    freezeAuthorityRevoked: true,
  });
}

function applyCreators(tokens: TokenSnapshot[], creators: Record<string, CreatorStat>): TokenSnapshot[] {
  return tokens.map((t) => {
    if (!t.creator) return t;
    const stat = creators[t.creator];
    if (!stat) return t;
    return {
      ...t,
      deployerTokenCount: stat.tokens,
      deployerDeathRate: stat.tokens ? stat.dead / stat.tokens : 0,
    };
  });
}

export async function solPriceUsd(): Promise<number> {
  const cg = await getJson<{ solana?: { usd?: number } }>(
    "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd",
  );
  if (cg.ok && cg.data?.solana?.usd) return cg.data.solana.usd;
  const ds = await getJson<{ pairs?: DexPair[] }>(
    "https://api.dexscreener.com/latest/dex/tokens/So11111111111111111111111111111111111111112",
  );
  const p = ds.data?.pairs?.find((x) => x.quoteToken?.symbol === "USDC" || x.quoteToken?.symbol === "USDT");
  return p ? num(p.priceUsd, 100) : 100;
}

export async function ingestMarket(creators: Record<string, CreatorStat> = {}): Promise<{
  tokens: TokenSnapshot[];
  health: FeedHealth[];
  solUsd: number;
}> {
  const health: FeedHealth[] = [];
  const map = new Map<string, TokenSnapshot>();

  const put = (t: TokenSnapshot | null) => {
    if (!t?.mint) return;
    const prev = map.get(t.mint);
    map.set(t.mint, prev ? mergeSnapshots(prev, t) : t);
  };

  const jobs = [
    (async () => {
      const r = await getJson<PumpCoin[]>(
        "https://frontend-api-v3.pump.fun/coins?offset=0&limit=40&sort=created_timestamp&order=desc&includeNsfw=false",
      );
      health.push({ source: "pumpfun-new", ok: r.ok, ms: r.ms, count: r.data?.length || 0, error: r.error, at: Date.now() });
      (r.data || []).forEach((c) => put(fromPump(c)));
    })(),
    (async () => {
      const r = await getJson<PumpCoin[]>(
        "https://frontend-api-v3.pump.fun/coins?offset=0&limit=30&sort=last_trade_timestamp&order=desc&includeNsfw=false",
      );
      health.push({ source: "pumpfun-hot", ok: r.ok, ms: r.ms, count: r.data?.length || 0, error: r.error, at: Date.now() });
      (r.data || []).forEach((c) => put(fromPump(c)));
    })(),
    (async () => {
      const r = await getJson<{ data?: { rows?: LaunchRow[] } }>(
        "https://launch-mint-v1.raydium.io/get/list?sort=new&size=30&mintType=default",
      );
      const rows = r.data?.data?.rows || [];
      health.push({ source: "launchlab-new", ok: r.ok, ms: r.ms, count: rows.length, error: r.error, at: Date.now() });
      rows.forEach((row) => put(fromLaunch(row)));
    })(),
    (async () => {
      const r = await getJson<{ data?: { rows?: LaunchRow[] } }>(
        "https://launch-mint-v1.raydium.io/get/list?sort=lastTrade&size=20",
      );
      const rows = r.data?.data?.rows || [];
      health.push({ source: "launchlab-hot", ok: r.ok, ms: r.ms, count: rows.length, error: r.error, at: Date.now() });
      rows.forEach((row) => put(fromLaunch(row)));
    })(),
    (async () => {
      const r = await getJson<{ pairs?: DexPair[] }>("https://api.dexscreener.com/latest/dex/search?q=SOL");
      const pairs = (r.data?.pairs || []).filter((p) => p.chainId === "solana");
      health.push({ source: "dexscreener", ok: r.ok, ms: r.ms, count: pairs.length, error: r.error, at: Date.now() });
      pairs.slice(0, 40).forEach((p) => put(fromDex(p)));
    })(),
    (async () => {
      const r = await getJson<{ data?: GeckoPool[] }>("https://api.geckoterminal.com/api/v2/networks/solana/new_pools?page=1");
      const rows = r.data?.data || [];
      health.push({ source: "gecko-new", ok: r.ok, ms: r.ms, count: rows.length, error: r.error, at: Date.now() });
      rows.forEach((p) => put(fromGecko(p)));
    })(),
    (async () => {
      const r = await getJson<{ data?: GeckoPool[] }>(
        "https://api.geckoterminal.com/api/v2/networks/solana/trending_pools?page=1",
      );
      const rows = r.data?.data || [];
      health.push({ source: "gecko-trend", ok: r.ok, ms: r.ms, count: rows.length, error: r.error, at: Date.now() });
      rows.forEach((p) => put(fromGecko(p)));
    })(),
  ];

  const [solUsd] = await Promise.all([solPriceUsd(), Promise.allSettled(jobs)]);
  const tokens = applyCreators([...map.values()], creators)
    .filter((t) => t.mint.length >= 32)
    .sort((a, b) => (b.volume1h || b.marketCapUsd) - (a.volume1h || a.marketCapUsd));

  return { tokens, health, solUsd };
}
