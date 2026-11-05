import { SPHA_DECIMALS, SPHA_SUPPLY, sphaCurveTokens } from "./omics";
import { solphiaTokenDesk, type TokenStat } from "./solphia";

export type SphaLiveStats = {
  priceUsd: number;
  mcapUsd: number;
  liqUsd: number;
  curveSol: number;
  supply: number;
  circulating: number;
  burned: number;
};

function dash(n: number | null | undefined, fmt?: (n: number) => string) {
  if (n == null || !Number.isFinite(n) || n < 0) return "—";
  return fmt ? fmt(n) : String(n);
}

function usd(n: number) {
  if (!(n > 0)) return "—";
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  if (n >= 1) return `$${n.toFixed(2)}`;
  if (n >= 0.01) return `$${n.toFixed(4)}`;
  return `$${n.toFixed(6)}`;
}

function tok(n: number) {
  if (!(n > 0)) return "0";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString("en-US");
}

export function sphaDeskStats(mint?: string | null, live?: SphaLiveStats | null) {
  const base = solphiaTokenDesk(mint);
  if (!base.mint || !live) return base;
  const burned = live.burned || 0;
  const supply = live.supply || SPHA_SUPPLY;
  const circ = live.circulating > 0 ? live.circulating : Math.max(0, supply - burned);
  const stats: TokenStat[] = [
    { k: "Price", v: usd(live.priceUsd), hint: "USD" },
    { k: "Market cap", v: usd(live.mcapUsd), hint: "USD" },
    { k: "Liquidity", v: live.liqUsd > 0 ? usd(live.liqUsd) : dash(live.curveSol, (n) => `${n.toFixed(3)} SOL`), hint: live.liqUsd > 0 ? "USD" : "curve" },
    { k: "Vol 24h", v: "—", hint: "USD" },
    { k: "Holders", v: "—" },
    { k: "Total supply", v: tok(supply) },
    { k: "Circulating", v: tok(circ) },
    { k: "Burned", v: tok(burned), hint: "tokens" },
    { k: "% burned", v: supply > 0 && burned > 0 ? `${((burned / supply) * 100).toFixed(2)}%` : "0%" },
    { k: "Public market", v: "Bonding curve" },
    { k: "Mint", v: "Revoked" },
    { k: "Freeze", v: "Revoked" },
  ];
  const extra: TokenStat[] = [
    { k: "Top 10", v: "—" },
    { k: "Age", v: "Live" },
    { k: "Decimals", v: String(SPHA_DECIMALS) },
    { k: "Tax", v: "1%" },
  ];
  return { ...base, stats, extra, caReady: true };
}

export async function loadSphaLiveStats(mint: string): Promise<SphaLiveStats | null> {
  const ca = (mint || "").trim();
  if (!ca) return null;
  try {
    const [{ dbcPoolQuoteSol, quoteDbcTrade }, { solPriceUsd }] = await Promise.all([
      import("../launch/dbc"),
      import("../feeds"),
    ]);
    const [curveSol, quote, solUsd] = await Promise.all([
      dbcPoolQuoteSol(ca),
      quoteDbcTrade({ mint: ca, side: "buy", sol: 0.05 }).catch(() => ({ ok: false as const })),
      solPriceUsd().catch(() => 0),
    ]);
    const tokensOut = quote && "ok" in quote && quote.ok ? Number(quote.tokensOut) || 0 : 0;
    const priceSol = tokensOut > 0 ? 0.05 / tokensOut : 0;
    const priceUsd = priceSol > 0 && solUsd > 0 ? priceSol * solUsd : 0;
    const supply = SPHA_SUPPLY;
    const mcapUsd = priceUsd > 0 ? priceUsd * supply : 0;
    const liqUsd = curveSol > 0 && solUsd > 0 ? curveSol * solUsd : 0;
    return {
      priceUsd,
      mcapUsd,
      liqUsd,
      curveSol: Number(curveSol) || 0,
      supply,
      circulating: supply,
      burned: 0,
    };
  } catch {
    return {
      priceUsd: 0,
      mcapUsd: 0,
      liqUsd: 0,
      curveSol: 0,
      supply: SPHA_SUPPLY,
      circulating: sphaCurveTokens() + (SPHA_SUPPLY - sphaCurveTokens()),
      burned: 0,
    };
  }
}
