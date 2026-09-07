export type PlanId = "paper" | "live";

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
    tagline: "Paper is free. Live 0.1 SOL / 30d plus 0.1% per clip.",
    story: "Connect Phantom once, agree to the terms, pay 0.1 SOL. She bills the same each month until you unsubscribe.",
    points: ["Paper book included", "Kill switch always on", "0.1% clip fee", "Keys never with us", "Cancel anytime"],
    includes: ["live"],
    icon: "/icons/plan-paper.jpg",
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

export const COMPARE_ROWS: { label: string; hint?: string; values: [string, string] }[] = [
  { label: "Paper book", values: ["Yes", "Yes"] },
  { label: "Kill switch", hint: "Always on.", values: ["Yes", "Yes"] },
  { label: "SOL vs SPYx, QQQx, GLDx", values: ["Paper", "When live is on"] },
  { label: "Leverage", values: ["None", "Spot only"] },
  { label: "Keys with us", values: ["Never", "Never"] },
  { label: "30 days", values: ["Free", "0.1 SOL"] },
  { label: "Auto-renew", values: ["—", "Until you unsubscribe"] },
  { label: "Clip fee", hint: "0.1% (10 bps) on each live clip.", values: ["Paper mark", "0.1%"] },
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
    a: "She sits in USDC and scalps official SPYx (S&P 500), QQQx (Nasdaq-100), GLDx (gold), or SOL — whichever prints a 5m/15m setup that agrees with the Daily and 4H trend. Once fees are covered she trails the stop up and only sells when it hits. Nothing else. No memecoins, no copy trading, no sniping.",
  },
  {
    q: "How does she decide?",
    a: "Multi-timeframe scalp: Daily/4H bias, then 5m/15m EMA-VWAP reclaim or a range fade in discount, with SuperTrend and ADX as regime filters. She will not buy just because RSI looks low, and she will not prefer SOL over S&P, Nasdaq, or gold. Trail is the exit. Equities sit more on weekends. PnL stays in USDC.",
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
    q: "Can I change her settings?",
    a: "No. Size, 2-minute wait, and the 8% stop are locked. The only switch is practice vs real trades.",
  },
  {
    q: "Where is leverage?",
    a: "Not in this version. Official SPYx, QQQx, and GLDx are spot tokens — there is no issuer 2x. Real leverage would be a separate SOL perps venue (liquidation and funding), not a fake multiplier on Jupiter. That is off until it is wired for real.",
  },
  {
    q: "What happens when I hit KILL?",
    a: "She sells everything back to USDC (paper) or SOL (live) and pauses. Then you can withdraw to Phantom.",
  },
  {
    q: "How do I pay?",
    a: "Paper is free. Live is 0.1 SOL / 30 days, billed to the treasury, plus a 0.1% fee on each clip. Agree to the terms once. The first payment is from Phantom. Later months leave the trading wallet while this site is open on this device, until you unsubscribe.",
  },
];
