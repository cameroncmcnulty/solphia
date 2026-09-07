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
    sol: 0.2,
    tagline: "Paper is free. Live 0.2 SOL / 30d plus 0.1% per clip.",
    story: "Connect Phantom once, add SOL, she runs. Paid gate stays simple.",
    points: ["Paper book included", "Kill switch always on", "0.1% clip fee", "Keys never with us"],
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
  return Math.round((p?.sol || 0.2) * 1_000_000_000);
}

export const COMPARE_ROWS: { label: string; hint?: string; values: [string, string] }[] = [
  { label: "Paper book", values: ["Yes", "Yes"] },
  { label: "Kill switch", hint: "Always on.", values: ["Yes", "Yes"] },
  { label: "SOL vs SPYx, QQQx, GLDx", values: ["Paper", "When live is on"] },
  { label: "Leverage", values: ["None", "Spot only"] },
  { label: "Keys with us", values: ["Never", "Never"] },
  { label: "30 days", values: ["Free", "0.2 SOL"] },
  { label: "Clip fee", hint: "0.1% (10 bps) on each live clip.", values: ["Paper mark", "0.1%"] },
];

export const FAQS: { q: string; a: string }[] = [
  {
    q: "Does she spend my SOL?",
    a: "Connect Phantom once and add SOL to the trading wallet on this device. After that she signs swaps herself from that wallet. Keys never leave the device. Practice is on until you flip to real trades.",
  },
  {
    q: "What does she trade?",
    a: "She holds SOL, USDC, and three official tokens: SPYx (S&P 500), QQQx (Nasdaq-100), and GLDx (gold). She trades whichever of those pairs is stretched — including USDC vs gold. Nothing else. No memecoins, no copy trading, no sniping new coins.",
  },
  {
    q: "How does she decide?",
    a: "She studies SOL, S&P 500, Nasdaq, and gold history — typical day ranges, crash knives, gold safe-haven spikes, cash-session vs overnight, and whether the move even covers fees. Stretch is one input. She skips knives, closed-market fake prints, and trades that fees would eat. PnL stays in USDC.",
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
    a: "There isn’t any. Spot only. She will not borrow or loop your SOL.",
  },
  {
    q: "What happens when I hit KILL?",
    a: "She sells everything back to USDC (paper) or SOL (live) and pauses. Then you can withdraw to Phantom.",
  },
  {
    q: "How do I pay?",
    a: "Paper is free. Live is 0.2 SOL / 30 days, plus a 0.1% fee on each clip.",
  },
];
