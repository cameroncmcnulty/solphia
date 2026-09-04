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
    sol: 0.15,
    tagline: "Paper is free. Live later, flat SOL / 30d.",
    story: "Connect, fund, run the SOL ↔ official SPYx bot. Paid gate stays simple.",
    points: ["Paper book included", "Kill switch always on", "Official SPYx mint only", "Keys never with us"],
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
  return Math.round((p?.sol || 0.15) * 1_000_000_000);
}

export const COMPARE_ROWS: { label: string; hint?: string; values: [string, string] }[] = [
  { label: "Paper book", values: ["Yes", "Yes"] },
  { label: "Kill switch", hint: "Always on.", values: ["Yes", "Yes"] },
  { label: "SOL ↔ official SPYx", values: ["Paper", "When live is on"] },
  { label: "Leverage", values: ["None", "Spot only"] },
  { label: "Keys with us", values: ["Never", "Never"] },
  { label: "30 days", values: ["Free", "0.15 SOL"] },
];

export const FAQS: { q: string; a: string }[] = [
  {
    q: "Does she spend my SOL?",
    a: "Only if you turn her on and deposit into a trading wallet on your phone. Keys stay on the device. Solphia never holds a hot wallet. Paper is the default until live is flipped on.",
  },
  {
    q: "What does she trade?",
    a: "One pair: SOL against official tokenized S&P 500 (SPYx / xStocks) on Solana. Official mint only. No memecoins, no copy list, no launch sniper.",
  },
  {
    q: "How does the ratio bot work?",
    a: "She computes R = P_SOL / P_SPYx from Pyth (or Jupiter / DexScreener if the oracle is down). If SOL stretches rich vs SPYx she sells a SOL clip for SPYx. If it stretches cheap she sells SPYx for SOL. Inside the band she sits. Clip size, cooldown, slippage, and stop always win.",
  },
  {
    q: "Is tokenized SPY the same as the NYSE print?",
    a: "No. SPYx is an issuer product with custody risk. After 16:00 ET and on weekends the token can trade while cash SPY is closed. You can lose SOL.",
  },
  {
    q: "Where is leverage?",
    a: "Not in v1. Spot SOL ↔ SPYx only. The slider stays disabled: spot only — perps later. She will not fake leverage with recursive looping.",
  },
  {
    q: "What happens on stop or kill?",
    a: "She flattens both sleeves to USDC through Jupiter (paper: marked fills) and halts. Working capital and PnL are in USDC so a random SOL candle does not lie about the book.",
  },
  {
    q: "How do I pay?",
    a: "Paper is free. A simple 0.15 SOL / 30 days live seat comes later. No four-desk menu.",
  },
];
