import type { TokenSnapshot } from "../types";

export function toxicFlow(token: TokenSnapshot): { toxic: boolean; reason: string } {
  const unique = token.uniqueTraders1h || 0;
  const buys = token.buys1h || 0;
  const sells = token.sells1h || 0;
  const txns = token.txns1h || buys + sells;
  const txns5 = token.txns5m || 0;
  const flow = buys + sells;
  if (unique > 0 && txns / unique >= 9) {
    return { toxic: true, reason: "Flow is churn, not buyers. Stand down." };
  }
  if (flow >= 40 && unique > 0 && unique < 25 && Math.abs(buys - sells) / flow < 0.12) {
    return { toxic: true, reason: "Round-trip residue. You would be the LP." };
  }
  if (txns5 >= 80 && unique < 20) {
    return { toxic: true, reason: "Sub-second tape. Adverse selection." };
  }
  if (txns5 >= 40 && unique > 0 && unique <= 12 && flow >= 30 && Math.abs(buys - sells) / Math.max(flow, 1) < 0.18) {
    return { toxic: true, reason: "Sub-second round-trips. You would be the LP." };
  }
  if (!token.graduated && sells > buys * 1.7 && unique < 50 && flow >= 20) {
    return { toxic: true, reason: "Sellers already own the tape. Don't be the bid." };
  }
  return { toxic: false, reason: "" };
}
