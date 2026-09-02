export type PlanId = "pulse" | "copy" | "snipers" | "full";

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
    id: "pulse",
    name: "Alerts",
    sol: 0.15,
    tagline: "She pings. You buy.",
    story: "Clean setups hit your inbox. You still place the trade.",
    points: ["Wallet-buy pings", "Graduation pings", "Plain-English why", "You click buy"],
    includes: ["pulse"],
    icon: "/icons/plan-alerts.jpg",
  },
  {
    id: "copy",
    name: "Copy",
    sol: 0.25,
    tagline: "She copies the setup, then the exit.",
    story: "Fund a wallet you own. She copies visible setups only — never first-block bags.",
    points: ["Visible setups only", "Scout + Risk agree", "Always copies the sell", "Your keys stay yours"],
    includes: ["copy"],
    icon: "/icons/plan-copy.jpg",
  },
  {
    id: "snipers",
    name: "Launch",
    sol: 0.3,
    tagline: "P(grad) first. Most names she skips.",
    story: "Not a paste-CA sniper. She only arms when P(grad) clears.",
    points: ["P(grad) every tick", "No 2-minute coins", "No first-block snipes", "Exit ladder on"],
    includes: ["snipers"],
    icon: "/icons/plan-launch.jpg",
  },
  {
    id: "full",
    name: "Everything",
    sol: 0.5,
    tagline: "All desks. Cheaper together.",
    story: "Alerts + copy + launch + Picks. Buying them separate is 0.70.",
    points: ["Alerts", "Copy bot", "Launch + grad", "Solphia Picks"],
    includes: ["pulse", "copy", "snipers", "full"],
    icon: "/icons/plan-full.jpg",
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

export const COMPARE_ROWS: { label: string; hint?: string; values: [string, string, string, string, string] }[] = [
  { label: "Paper book", values: ["Yes", "Yes", "Yes", "Yes", "Yes"] },
  { label: "Kill switch", hint: "Always on.", values: ["Yes", "Yes", "Yes", "Yes", "Yes"] },
  { label: "Email alerts", values: ["—", "Yes", "—", "—", "Yes"] },
  { label: "Copy bot", values: ["—", "—", "Yes", "—", "Yes"] },
  { label: "Launch bot", values: ["—", "—", "—", "Yes", "Yes"] },
  { label: "Graduation", values: ["—", "—", "—", "Yes", "Yes"] },
  { label: "Solphia Picks", values: ["—", "—", "—", "—", "Yes"] },
  { label: "Who trades", values: ["You", "You", "She", "She", "She"] },
  { label: "Keys with us", values: ["Never", "Never", "Never", "Never", "Never"] },
  { label: "30 days", values: ["Free", "0.15 SOL", "0.25 SOL", "0.30 SOL", "0.50 SOL"] },
];

export const FAQS: { q: string; a: string }[] = [
  {
    q: "Does she spend my SOL?",
    a: "Only if you turn her on and deposit into a trading wallet on your phone. Keys stay on the device. Solphia never holds a hot wallet. Paper trading is the default until live is flipped on.",
  },
  {
    q: "Why does she skip so many coins?",
    a: "That is the product. Most Pump.fun names die on day one. Scout has to like a setup, Risk has to agree, and policy caps size and daily loss. Solphia Picks also needs Telegram, P(grad) ≥ 62%, and a learned P(pay) bar.",
  },
  {
    q: "What are live stats?",
    a: "The tape, the $1,000 paper book, names she refused, P(grad) on each coin, and the mind’s study count. Those numbers come from the engine, not a marketing counter.",
  },
  {
    q: "Copy vs Picks vs Launch?",
    a: "Copy follows wallets that are still good this week, and only when the setup is visible from here. Launch waits for P(grad). Picks is her own book — the pickiest desk, trained on after-fee outcomes.",
  },
  {
    q: "Can I change size, stop, and take-profit?",
    a: "Yes. The trading hub has sliders for max SOL per trade, min safety, first take-profit, stop-loss, and max creator bag. The kill switch and daily loss cap cannot be turned off.",
  },
  {
    q: "How do I pay?",
    a: "SOL from the wallet you trade with, 30-day access. Everything is 0.50 SOL. Buying Alerts + Copy + Launch separate is 0.70. No card. No USDC required.",
  },
  {
    q: "Is this a sniper?",
    a: "No. Sub-5-minute coins are a hard no on Picks. First-block bundles are faded. Faster paste-CA is how accounts die.",
  },
  {
    q: "What is the SOL / USDT desk?",
    a: "A conservative spot scalp of SOL against Tether. She sizes from the stop (at least 0.5%, from structure), takes the first target at 2R after fees, and stops new entries at a 0.5% daily goal. No leverage. Memecoin 35 bps fees would eat a 1% scalp — this desk models 9 bps a side, which is still conservative for SOL/USDT.",
  },
];
