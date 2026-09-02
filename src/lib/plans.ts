export type PlanId = "pulse" | "copy" | "snipers" | "full";

export interface Plan {
  id: PlanId;
  name: string;
  sol: number;
  tagline: string;
  story: string;
  points: string[];
  includes: PlanId[];
  featured?: boolean;
}

export const PLANS: Plan[] = [
  {
    id: "pulse",
    name: "Alerts",
    sol: 0.15,
    tagline: "She texts you. You still buy yourself.",
    story:
      "Solphia watches new coins and the wallets we copy. When something looks actually tradeable, you get an email and an in-app ping with a plain-English reason. You open Phantom and decide. No bot is placing trades for you.",
    points: [
      "Ping when a followed wallet buys something clean",
      "Ping when a new coin is about to graduate",
      "Every ping includes why she thinks it's worth a look",
      "You place the trade. She does not.",
    ],
    includes: ["pulse"],
  },
  {
    id: "copy",
    name: "Copy bot",
    sol: 0.25,
    tagline: "The passive one. She copies the setup, then the exit.",
    story:
      "You fund a trading wallet you own and turn her on. She reconstructs why a wallet bought — time from create, holder shape, curve fill — and only copies when that setup is visible from here. First-block bundles she cannot access are faded. She always copies the sell.",
    points: [
      "Copy the decision, not the bag. Fade wallets whose edge is first-block access",
      "Scout and Risk both have to agree. Policy caps size and daily loss",
      "Exit agent: leader sold, ladder at 1.5/2/3/5x, kill −25% from local high",
      "Uses your deposit. Keys never sit in the model",
    ],
    includes: ["copy"],
  },
  {
    id: "snipers",
    name: "Launch bot",
    sol: 0.3,
    tagline: "P(grad) first. She skips more names than she takes.",
    story:
      "Not a paste-CA sniper. The bonding curve is a survival problem. She only arms when P(grad) clears the bar — real SOL per unique buyer, not bot churn. Random 2-minute coins are a no.",
    points: [
      "P(grad) every tick: curve fill, SOL per unique, bot-share, creator, social link, age",
      "Launch only if that number clears the bar. Fast SOL from few trades beats high-turnover bots",
      "Toxic flow and first-block bundles are a stand-down, not a snipe",
      "Exit agent is wired in: ladder, leader-sold, curve stall, kill from local high",
    ],
    includes: ["snipers"],
  },
  {
    id: "full",
    name: "Everything",
    sol: 0.5,
    tagline: "Alerts + copy + launch + Solphia Picks. Cheaper together.",
    story:
      "All four. Buying them separate is more. Everything is 0.50. Copy is the passive path. Picks is her own learned book — extremely picky, deny-first, and it only gets stricter after losses.",
    points: [
      "Email and in-app alerts",
      "Copy bot on the wallets we follow",
      "Launch and graduation bot",
      "Solphia Picks: self-learning mind, Telegram + P(grad) + after-fee P(pay) bar",
    ],
    includes: ["pulse", "copy", "snipers", "full"],
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
  { label: "Paper book, live marks, 0.35% fee", values: ["Yes", "Yes", "Yes", "Yes", "Yes"] },
  { label: "Kill switch · daily loss cap", hint: "Turns her off. Not optional.", values: ["Yes", "Yes", "Yes", "Yes", "Yes"] },
  { label: "Email + in-app alerts", values: ["—", "Yes", "—", "—", "Yes"] },
  { label: "Copy bot (decision + exit)", values: ["—", "—", "Yes", "—", "Yes"] },
  { label: "Launch · P(grad) bar", values: ["—", "—", "—", "Yes", "Yes"] },
  { label: "Graduation fills", values: ["—", "—", "—", "Yes", "Yes"] },
  { label: "Solphia Picks (self-learning)", values: ["—", "—", "—", "—", "Yes"] },
  { label: "You place the trade", values: ["If you want", "Always", "She does", "She does", "She does"] },
  { label: "Keys in the model", values: ["Never", "Never", "Never", "Never", "Never"] },
  { label: "Price / 30 days", values: ["Free", "0.15 SOL", "0.25 SOL", "0.30 SOL", "0.50 SOL"] },
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
    a: "Yes. Auto has a configuration desk: max SOL per trade, min safety, first take-profit, stop-loss, max creator bag. The kill switch and daily loss cap cannot be turned off.",
  },
  {
    q: "How do I pay?",
    a: "SOL from the wallet you trade with, 30-day access. Everything is 0.50 SOL. Buying Alerts + Copy + Launch separate is 0.70. No card. No USDC required.",
  },
  {
    q: "Is this a sniper?",
    a: "No. Sub-5-minute coins are a hard no on Picks. First-block bundles are faded. Faster paste-CA is how accounts die.",
  },
];
