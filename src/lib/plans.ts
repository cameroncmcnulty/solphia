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
    tagline: "Backtests are free. Live is 0.1 SOL / 30 days.",
    story: "Connect, agree, pay 0.1 SOL. Spot SOL, S&P, Nasdaq, gold.",
    points: ["Backtests included", "KILL always on", "Spot only", "Cancel anytime"],
    includes: ["live"],
    icon: "/icons/plan-paper.jpg",
  },
  {
    id: "lev",
    name: "SOL 2× / 3×",
    sol: 0.15,
    tagline: "Optional 2× or 3× on SOL. 0.15 SOL / 30 days.",
    story: "Everything in Live, plus SOL leverage.",
    points: ["Everything in Live", "SOL 2× or 3×", "Equities stay spot", "Phrase stays on this device"],
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

export const COMPARE_ROWS: { label: string; hint?: string; values: [string, string] }[] = [
  { label: "Backtests", values: ["Yes", "Yes"] },
  { label: "Kill switch", values: ["Yes", "Yes"] },
  { label: "SOL vs S&P, Nasdaq, gold", values: ["Live", "Live"] },
  { label: "SOL leverage", values: ["Spot 1×", "Optional 2× / 3×"] },
  { label: "Recovery phrase", values: ["On this device", "On this device"] },
  { label: "30 days", values: ["0.1 SOL", "0.15 SOL"] },
  { label: "Auto-renew", values: ["Until you unsubscribe", "Until you unsubscribe"] },
];

export const FAQS: { q: string; a: string }[] = [
  {
    q: "Does she spend my SOL?",
    a: "Create or import a Solphia wallet and add SOL to the trading wallet. Paper stays on this device. When you press Start on Live, this site stores an encrypted copy of the trading key so she can sign while you are away. Revoke it anytime. Backtests are free until you go live.",
  },
  {
    q: "Where does the SOL I add sit?",
    a: "Login is your Solphia wallet on this device. Added SOL sits in a trading wallet derived here until you hit KILL and withdraw. Write down the 12-word phrase. We never see the phrase or PIN. If you start Live, we hold an encrypted copy of the trading key until you revoke it.",
  },
  {
    q: "What does she trade?",
    a: "Tokenized S&P 500, Nasdaq, gold, and SOL. Spot is 1×. The 0.15 SOL seat unlocks optional 2× or 3× on SOL only.",
  },
  {
    q: "How does she decide?",
    a: "She waits for a setup, takes the clip, and trails the stop.",
  },
  {
    q: "Are these the same as the New York market?",
    a: "No. They are tokens with extra risk. They can move after hours and on weekends. You can lose SOL.",
  },
  {
    q: "Do I sign every trade?",
    a: "No. After you fund the trading wallet, Live signs with that key. When Live is on, the server signs with the encrypted copy you delegated. You sign again to withdraw, to pay the first seat in Phantom, or for pad and swap rails that still go through this wallet or Phantom.",
  },
  {
    q: "Where is leverage?",
    a: "Optional 2× or 3× on SOL only, on the 0.15 SOL seat. Equities and gold stay spot. Leverage can liquidate.",
  },
  {
    q: "What happens when I hit KILL?",
    a: "She flattens and pauses. Then you can withdraw.",
  },
  {
    q: "How do I pay?",
    a: "Live is 0.1 SOL / 30 days. SOL 2×/3× is 0.15 SOL / 30 days. First pay from your wallet. Later months renew from the trading wallet while this site is open.",
  },
  {
    q: "How is the launch pad cheaper than Pump.fun?",
    a: "Solphia’s curve charges 1.00% on buys and sells. Pump.fun charges 1.25%. Creators here take 0.50% of volume (half of our 1%). Pump.fun creators take 0.30%. The program is on Solana mainnet; supply sits on the curve, not in the launcher wallet.",
  },
];
