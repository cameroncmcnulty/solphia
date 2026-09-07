export type PlanId = "paper" | "live" | "lev";

export interface Plan {
  id: PlanId;
  name: string;
  sol: number;
  tagline: string;
  story: string;
  points: string[];
  includes: PlanId[];
  icon: string;
  featured?: boolean;
}

export const PLANS: Plan[] = [
  {
    id: "live",
    name: "Live",
    sol: 0.1,
    tagline: "Paper is free. Live spot 0.1 SOL / 30d plus 0.1% per clip.",
    story: "Connect Phantom once, agree to the terms, pay 0.1 SOL. Spot SOL, S&P, Nasdaq, gold.",
    points: ["Paper book included", "Kill switch always on", "0.1% clip fee", "Spot only", "Cancel anytime"],
    includes: ["live"],
    icon: "/icons/plan-paper.jpg",
  },
  {
    id: "lev",
    name: "SOL 2× / 3×",
    sol: 0.15,
    tagline: "Optional 2x or 3x SOL-PERP. Jupiter Perps fees. 0.15 SOL / 30d.",
    story: "Same scalp. Equities and gold stay spot. SOL can run 2x or 3x with borrow, liquidation, and 6 bps in/out.",
    points: ["Everything in Live", "SOL 2× or 3×", "Own lev backtest", "Liquidation is real", "Keys never with us"],
    includes: ["live", "lev"],
    icon: "/icons/plan-full.jpg",
    featured: true,
  },
];

export function planById(id: string): Plan | undefined {
  return PLANS.find((p) => p.id === id);
}

export function lamportsForPlan(id: PlanId): number {
  const p = planById(id);
  return Math.round((p?.sol || 0.1) * 1_000_000_000);
}

export const COMPARE_ROWS: { label: string; hint?: string; values: [string, string, string] }[] = [
  { label: "Paper book", values: ["Yes", "Yes", "Yes"] },
  { label: "Kill switch", hint: "Always on.", values: ["Yes", "Yes", "Yes"] },
  { label: "SOL vs SPYx, QQQx, GLDx", values: ["Paper", "When live is on", "When live is on"] },
  { label: "SOL leverage", values: ["1× paper", "Spot 1×", "Optional 2× / 3×"] },
  { label: "Liquidation", values: ["Paper mark", "None on spot", "Yes on SOL-PERP"] },
  { label: "Keys with us", values: ["Never", "Never", "Never"] },
  { label: "30 days", values: ["Free", "0.1 SOL", "0.15 SOL"] },
  { label: "Auto-renew", values: ["—", "Until you unsubscribe", "Until you unsubscribe"] },
  { label: "Clip fee", hint: "0.1% (10 bps) on each live clip.", values: ["Paper mark", "0.1%", "0.1% + perps fees"] },
];

export const FAQS: { q: string; a: string }[] = [
  {
    q: "Does she spend my SOL?",
    a: "Connect Phantom once and add SOL to the trading wallet on this device. After that she signs swaps herself from that wallet. Keys never leave the device. Practice is on until you flip to real trades.",
  },
  {
    q: "Where does the SOL I add sit?",
    a: "Phantom is your login. The SOL you add is sent on-chain to a trading wallet that lives only on this device. It stays there until you hit KILL and withdraw back to Phantom. We never hold the key.",
  },
  {
    q: "What does she trade?",
    a: "She sits in USDC and scalps official SPYx, QQQx, GLDx, or SOL. Spot live is 1×. The 0.15 SOL seat unlocks optional 2× or 3× on SOL only, modeled on Jupiter Perps (6 bps in, 6 bps out, hourly borrow, liquidation). Equities and gold stay spot.",
  },
  {
    q: "How does she decide?",
    a: "Multi-timeframe scalp: Daily/4H bias, then 5m/15m EMA-VWAP reclaim or a range fade in discount, with SuperTrend and ADX as regime filters. Trail is the exit. PnL stays in USDC.",
  },
  {
    q: "Are these the same as the New York market?",
    a: "No. They are issuer tokens with extra risk. After the US market closes and on weekends they can still move. You can lose SOL.",
  },
  {
    q: "Do I sign every trade?",
    a: "No. Connect Phantom once and add SOL once. After that the trading wallet on this device signs for her. Phantom is not asked again until you withdraw.",
  },
  {
    q: "Where is leverage?",
    a: "Optional 2× or 3× on SOL only, on the 0.15 SOL seat. It is a Jupiter Perps-style long: notional is collateral times leverage, 6 bps to open and close, borrow while open, and a liquidation if SOL moves about 40% against you at 2× or 27% at 3×. Not a fake multiplier on spot SPYx. Jupiter’s on-chain Perps API is still WIP, so the sleeve is live-priced with those fees until that API is production-ready.",
  },
  {
    q: "What happens when I hit KILL?",
    a: "She closes the SOL-PERP if open, sells spot holdings back to USDC (paper) or SOL (live spot), and pauses. Then you can withdraw to Phantom.",
  },
  {
    q: "How do I pay?",
    a: "Paper is free. Live spot is 0.1 SOL / 30 days. SOL 2×/3× is 0.15 SOL / 30 days. Plus 0.1% on each clip. First pay from Phantom. Later months leave the trading wallet while this site is open, until you unsubscribe.",
  },
];
