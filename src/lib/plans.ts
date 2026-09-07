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
    story: "Connect Phantom, add SOL, let her trade S&P 500, Nasdaq-100, and gold. Paid gate stays simple.",
    points: ["Paper book included", "Kill switch always on", "Official SPYx, QQQx, GLDx only", "Keys never with us"],
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
  { label: "SOL vs SPYx, QQQx, GLDx", values: ["Paper", "When live is on"] },
  { label: "Leverage", values: ["None", "Spot only"] },
  { label: "Keys with us", values: ["Never", "Never"] },
  { label: "30 days", values: ["Free", "0.15 SOL"] },
];

export const FAQS: { q: string; a: string }[] = [
  {
    q: "Does she spend my SOL?",
    a: "Only after you connect Phantom and add SOL to the trading wallet on this device. Keys stay in Phantom. Practice mode is on until you flip to real trades.",
  },
  {
    q: "What does she trade?",
    a: "SOL against three official tokens on Solana: SPYx (S&P 500), QQQx (Nasdaq-100), and GLDx (gold). Nothing else. No memecoins, no copy trading, no sniping new coins.",
  },
  {
    q: "How does she decide?",
    a: "She watches whether SOL looks expensive or cheap versus each of those three markets. Expensive → she sells some SOL for that token. Cheap → she sells the token back for SOL. If nothing has moved enough, she waits. Three markets means more chances to trade in a day than S&P 500 alone.",
  },
  {
    q: "Are these the same as the New York market?",
    a: "No. They are issuer tokens with extra risk. After the US market closes and on weekends they can still move. You can lose SOL.",
  },
  {
    q: "Can I change her settings?",
    a: "No. Size, wait time, and the 8% stop are locked to the safer defaults. The only switch is practice vs real trades.",
  },
  {
    q: "Where is leverage?",
    a: "There isn’t any. Spot only. She will not borrow or loop your SOL.",
  },
  {
    q: "What happens when I hit KILL?",
    a: "She sells everything back and pauses. Then you can withdraw SOL to Phantom.",
  },
  {
    q: "How do I pay?",
    a: "Paper is free. A simple 0.15 SOL / 30 days live seat comes later.",
  },
];
