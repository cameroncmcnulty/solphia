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
    tagline: "The passive one. She copies people who are already up.",
    story:
      "You fund a trading wallet you own and turn her on. When wallets like Cented or Cupsey buy, she copies — but only if the coin also passes safety (no freeze, no bundle dump, real buyers). That's how this is supposed to make you money while you're not staring at a chart.",
    points: [
      "Follows a short list of wallets with public 7-day and 30-day profit",
      "Skips the trade if the coin looks like a rug",
      "Uses your deposit, never a Solphia-held wallet",
      "Does not include launch sniping or email alerts",
    ],
    includes: ["copy"],
  },
  {
    id: "snipers",
    name: "Launch bot",
    sol: 0.3,
    tagline: "Catches new coins and graduations. Higher risk.",
    story:
      "Not copy trading. This bot buys very new tokens and coins about to graduate — only when they pass the same safety checks. Faster, noisier, easier to lose. Use this if you want her hunting, not just following.",
    points: [
      "New coins under 8 minutes, if buyers look real and snipers don't already own it",
      "Graduations when the bonding curve is almost full",
      "Still skips freeze, mint, and serial-rug creators",
      "Not the set-and-forget copy bot",
    ],
    includes: ["snipers"],
  },
  {
    id: "full",
    name: "Everything",
    sol: 0.5,
    tagline: "Alerts + copy bot + launch bot. Cheaper together.",
    story:
      "All three. Buying them separate is 0.70 SOL. Everything is 0.50. Copy is the passive income path. Alerts if you still want to tap in yourself. Launch bot if you want the aggressive side too.",
    points: [
      "Email and in-app alerts",
      "Copy bot on the wallets we follow",
      "Launch and graduation bot",
      "One auto switch, one trading wallet you own",
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
