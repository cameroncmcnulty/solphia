export type PlanId = "pulse" | "copy" | "snipers" | "full";

export interface Plan {
  id: PlanId;
  name: string;
  sol: number;
  tagline: string;
  points: string[];
  includes: PlanId[];
  featured?: boolean;
}

export const PLANS: Plan[] = [
  {
    id: "pulse",
    name: "Pulse",
    sol: 0.15,
    tagline: "The wire only.",
    points: ["Email + in-app alerts", "Safety score on every ping", "No execution desk"],
    includes: ["pulse"],
  },
  {
    id: "copy",
    name: "Copy desk",
    sol: 0.25,
    tagline: "Follow wallets that actually print.",
    points: ["Live KOL board with 7D / 30D PnL", "Paper copy fills on cleared coins", "Watchlist + last print"],
    includes: ["copy"],
  },
  {
    id: "snipers",
    name: "Snipers",
    sol: 0.3,
    tagline: "Launch and graduation only.",
    points: ["Launch filter (≤8m, bundle <28%)", "Migration desk (≥82% bonded)", "Safety vetoes before arming"],
    includes: ["snipers"],
  },
  {
    id: "full",
    name: "Full terminal",
    sol: 0.5,
    tagline: "Every desk. One key.",
    points: ["Pulse + copy + snipers", "Live $1,000 paper book", "0.35% modeled fee vs ~1% industry"],
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
