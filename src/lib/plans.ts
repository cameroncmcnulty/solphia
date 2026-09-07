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
    a: "She holds SOL, USDC, and three official tokens: SPYx (S&P 500), QQQx (Nasdaq-100), and GLDx (gold). She trades whichever of those pairs is stretched — including USDC vs gold. Nothing else. No memecoins, no copy trading, no sniping new coins.",
  },
  {
    q: "How does she decide?",
    a: "She stays split across SOL, USDC, S&P 500, Nasdaq, and gold. If USDC/GLDx (or any other pair) looks stretched, she trades it. Expensive side gets sold for the cheap side. If nothing has moved enough, she waits. Profit and loss stay in USDC.",
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
    a: "She sells everything back to USDC (paper) or SOL (live) and pauses. Then you can withdraw to Phantom.",
  },
  {
    q: "How do I pay?",
    a: "Paper is free. A simple 0.15 SOL / 30 days live seat comes later.",
  },
];
