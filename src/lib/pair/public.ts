import type { PaperBook } from "../types";
import type { HistoryStudy } from "./knowledge";
import type { PairDecision } from "./engine";
import { pairOf, qtyOf } from "./engine";
import type { PairPrices } from "./prices";
import { XSTOCKS, type XStockId, xstockMint } from "./mints";

export type AssetPublic = {
  id: XStockId;
  symbol: string;
  name: string;
  mint: string;
  usd: number;
  qty: number;
  z7: number;
  liquidityUsd: number;
};

export type PairDeskPublic = {
  solUsd: number;
  spyxUsd: number;
  qqqxUsd: number;
  gldxUsd: number;
  spyxMint: string;
  qqqxMint: string;
  gldxMint: string;
  ratio: number;
  logRatio: number;
  mean7: number;
  z24: number;
  z7: number;
  bandK: number;
  signal: PairDecision["action"];
  reason: string;
  session: PairDecision["session"];
  skipped: number;
  lastAction?: string;
  lastSkipReason?: string;
  liquidityUsd: number;
  stale: boolean;
  oracle: { sol: string; spyx: string; qqqx: string; gldx: string; ageMs: number };
  knowledge: HistoryStudy;
  leverage: 1;
  solQty: number;
  spyxQty: number;
  qqqxQty: number;
  gldxQty: number;
  usdcQty: number;
  assets: AssetPublic[];
};

export function publicPair(
  book: PaperBook,
  prices: PairPrices,
  decision: PairDecision,
  study: HistoryStudy,
): PairDeskPublic {
  const h = pairOf(book);
  const assets: AssetPublic[] = XSTOCKS.map((x) => ({
    id: x.id,
    symbol: x.symbol,
    name: x.name,
    mint: xstockMint(x.id),
    usd: prices[x.id]?.usd || 0,
    qty: qtyOf(h, x.id),
    z7: decision.reads?.[x.id]?.z7 ?? (x.id === decision.read.asset ? decision.z7 : 0),
    liquidityUsd: prices.liquidities?.[x.id] || 0,
  }));
  return {
    solUsd: prices.sol.usd,
    spyxUsd: prices.spyx.usd,
    qqqxUsd: prices.qqqx.usd,
    gldxUsd: prices.gldx.usd,
    spyxMint: xstockMint("spyx"),
    qqqxMint: xstockMint("qqqx"),
    gldxMint: xstockMint("gldx"),
    ratio: decision.ratio,
    logRatio: decision.read.logR,
    mean7: decision.read.mean7,
    z24: decision.read.z24,
    z7: decision.z7,
    bandK: decision.bandK,
    signal: decision.action,
    reason: decision.reason,
    session: decision.session,
    skipped: book.skipped || 0,
    lastAction: book.lastAction,
    lastSkipReason: book.lastSkipReason,
    liquidityUsd: prices.liquidityUsd,
    stale: prices.stale,
    oracle: {
      sol: prices.sol.source,
      spyx: prices.spyx.source,
      qqqx: prices.qqqx.source,
      gldx: prices.gldx.source,
      ageMs: prices.ageMs,
    },
    knowledge: study,
    leverage: 1,
    solQty: h.solQty,
    spyxQty: h.spyxQty,
    qqqxQty: h.qqqxQty || 0,
    gldxQty: h.gldxQty || 0,
    usdcQty: h.usdcQty,
    assets,
  };
}
