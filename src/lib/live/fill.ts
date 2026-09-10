import type { PairDecision } from "../pair/engine";
import type { PairIntent } from "../types";

export function decisionFromIntent(intent: PairIntent, signature: string): PairDecision {
  const stub = {
    ratio: 0,
    logR: 0,
    mean24: 0,
    mean7: 0,
    std24: 0,
    std7: 0,
    z24: 0,
    z7: 0,
    n24: 0,
    n7: 0,
    asset: intent.asset || "spyx",
  };
  return {
    action: intent.action,
    reason: `${intent.reason} · ${signature.slice(0, 8)}`,
    clipUsd: intent.clipUsd,
    from: intent.from as PairDecision["from"],
    to: intent.to as PairDecision["to"],
    z7: 0,
    z24: 0,
    ratio: 0,
    bandK: 0,
    session: "cash",
    read: stub,
    solPct: intent.solPct,
    asset: intent.asset,
    pairId: intent.pairId,
  };
}
