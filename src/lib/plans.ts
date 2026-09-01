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
      "You fund a trading wallet you own and turn her on. She only copies wallets that are still good this week — not a 30-day highlight reel — and she sells when they sell. Size caps and a daily loss switch keep a passive book from blowing up.",
    points: [
      "Wallet quality: win rate, 7d vs 30d decay, clusters, style tags",
      "Copies entries and exits. Drops a coin the leader already dumped",
      "Max size per trade, bundle skip, daily loss cap that turns her off",
      "Uses your deposit, never a Solphia-held wallet",
    ],
    includes: ["copy"],
  },
  {
    id: "snipers",
    name: "Launch bot",
    sol: 0.3,
    tagline: "Catches new coins and graduations. Higher risk.",
    story:
      "Not copy trading. Two tight windows only: curve filling with real buyers, then the first minutes after PumpSwap/Raydium. Random 2-minute coins are skipped. Most names still get a hard no.",
    points: [
      "Pre-grad: curve 35–82% filled, unique buyers, no bundle, creator not a serial rug",
      "Post-grad: first minutes on PumpSwap or Raydium, same safety bar",
      "Bundled or insider-looking flow is a skip, and you see why",
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
