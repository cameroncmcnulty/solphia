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
    name: "Pulse",
    sol: 0.15,
    tagline: "Signals only. You still click buy.",
    story:
      "Solphia watches Pump.fun, LaunchLab and the copy wallets, then pings you when something actually clears the safety score. Email + in-app. She does not place the trade. You do, in Phantom, if you want it. This is the cheap 'I want her eyes' plan.",
    points: [
      "Push when a coin scores high enough to trade",
      "Ping when a followed wallet prints",
      "Ping when a curve is about to graduate",
      "No auto, no sniper, no copy fills",
    ],
    includes: ["pulse"],
  },
  {
    id: "copy",
    name: "Copy desk",
    sol: 0.25,
    tagline: "Mirror wallets that already have an edge.",
    story:
      "A short list of public KOL wallets (Cented, Cupsey, Decu…) with live 7-day and 30-day PnL. When they buy, Solphia sizes a fill — but only if the coin also passes the risk engine. Most copy bots skip that filter and eat rugs.",
    points: [
      "Live PnL board for the wallets she follows",
      "Auto-mirror buys/sells after the safety gate",
      "Your bankroll, your trading wallet",
      "Does not include launch/migration snipers or Pulse mail",
    ],
    includes: ["copy"],
  },
  {
    id: "snipers",
    name: "Snipers",
    sol: 0.3,
    tagline: "First minutes and graduation. Not KOL flow.",
    story:
      "Two desks. Launch: token is under 8 minutes old, unique flow is real, bundle under 28%. Migration: bonding curve ≥82% or just graduated. Freeze authority, serial deployers and livestream rugs never arm. This is not copy trading.",
    points: [
      "Launch sniper with anti-bundle gates",
      "Migration sniper on Pump.fun / LaunchLab",
      "Hard vetoes before anything fires",
      "No KOL copy board, no alert emails",
    ],
    includes: ["snipers"],
  },
  {
    id: "full",
    name: "Full terminal",
    sol: 0.5,
    tagline: "Pulse + copy + snipers + auto. One key.",
    story:
      "Everything. Alert wire, copy desk, both snipers, and auto-pilot on a trading wallet you own. Stacking the three desks separately is 0.70 SOL. Full is 0.50. 0.35% modeled fee vs ~1% on Axiom/GMGN.",
    points: [
      "Pulse alerts",
      "Copy desk + safety-gated mirrors",
      "Launch and migration snipers",
      "Auto-pilot, paper book, founder tools",
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
