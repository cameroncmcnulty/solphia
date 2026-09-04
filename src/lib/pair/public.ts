import type { PaperBook } from "../types";
import type { HistoryStudy } from "./knowledge";
import type { PairDecision } from "./engine";
import { pairOf } from "./engine";
import type { PairPrices } from "./prices";
import { spyxMint } from "./mints";

export type PairDeskPublic = {
  solUsd: number;
  spyxUsd: number;
  spyxMint: string;
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
  oracle: { sol: string; spyx: string; ageMs: number };
  knowledge: HistoryStudy;
  leverage: 1;
  solQty: number;
  spyxQty: number;
  usdcQty: number;
};

export function publicPair(
  book: PaperBook,
  prices: PairPrices,
  decision: PairDecision,
  study: HistoryStudy,
): PairDeskPublic {
  const h = pairOf(book);
  return {
    solUsd: prices.sol.usd,
    spyxUsd: prices.spyx.usd,
    spyxMint: spyxMint(),
    ratio: decision.ratio,
    logRatio: decision.read.logR,
    mean7: decision.read.mean7,
    z24: decision.read.z24,
    z7: decision.read.z7,
    bandK: decision.bandK,
    signal: decision.action,
    reason: decision.reason,
    session: decision.session,
    skipped: book.skipped || 0,
    lastAction: book.lastAction,
    lastSkipReason: book.lastSkipReason,
    liquidityUsd: prices.liquidityUsd,
    stale: prices.stale,
    oracle: { sol: prices.sol.source, spyx: prices.spyx.source, ageMs: prices.ageMs },
    knowledge: study,
    leverage: 1,
    solQty: h.solQty,
    spyxQty: h.spyxQty,
    usdcQty: h.usdcQty,
  };
}
