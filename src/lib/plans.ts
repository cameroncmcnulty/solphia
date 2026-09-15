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
    points: ["Everything in Live", "SOL 2× or 3×", "Equities stay spot", "Keys never with us"],
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
  { label: "Keys with us", values: ["Never", "Never"] },
  { label: "30 days", values: ["0.1 SOL", "0.15 SOL"] },
  { label: "Auto-renew", values: ["Until you unsubscribe", "Until you unsubscribe"] },
];

export const FAQS: { q: string; a: string }[] = [
  {
    q: "Does she spend my SOL?",
    a: "Connect once and add SOL to the trading wallet on this device. After that she signs from that wallet. Keys never leave the device. Backtests are free until you go live.",
  },
  {
    q: "Where does the SOL I add sit?",
    a: "Your wallet is login. Added SOL goes to a trading wallet on this device. It stays there until you hit KILL and withdraw. We never hold that key. Back it up.",
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
    a: "No. Connect and add SOL once. The trading wallet on this device signs after that. You sign again when you withdraw.",
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
];
