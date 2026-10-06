import type { AdminDesk } from "./types";

/**
 * Admin sidebar. Add a tool in three steps:
 *  1. Append an item here (id, group, label, hint, icon).
 *  2. Render it in src/components/admin/sections/index.tsx.
 *  3. Drop a section component next to the others.
 *
 * Groups keep the menu readable as the desk grows. Hash URLs
 * (#overview, #spha, …) deep-link a tool after login.
 */
export const ADMIN_GROUPS = [
  { id: "ops", label: "Ops", blurb: "Desk, bots, and health" },
  { id: "site", label: "Site", blurb: "Same pages as solphia.io" },
  { id: "people", label: "People", blurb: "Accounts, ranks, mail" },
  { id: "engine", label: "Engine", blurb: "Replay the live book" },
] as const;

export type AdminGroupId = (typeof ADMIN_GROUPS)[number]["id"];

export type AdminIcon =
  | "overview"
  | "desk"
  | "traders"
  | "spha"
  | "launch"
  | "backtest"
  | "system"
  | "wallets"
  | "users"
  | "health"
  | "circle"
  | "mail"
  | "shill"
  | "ranks";

export const ADMIN_NAV = [
  {
    id: "overview",
    group: "ops",
    label: "Overview",
    hint: "Holdings, wallets, volume, and PnL",
    icon: "overview" as const,
  },
  {
    id: "desk",
    group: "ops",
    label: "Live desk",
    hint: "Public xStock book, tape, and feeds",
    icon: "desk" as const,
  },
  {
    id: "traders",
    group: "ops",
    label: "Bots",
    hint: "Personal books and 24/7 live clips",
    icon: "traders" as const,
    badge: (d: AdminDesk) => d.traders.length || null,
  },
  {
    id: "health",
    group: "ops",
    label: "Health",
    hint: "Plans, speed, locked defaults, audit",
    icon: "health" as const,
  },
  {
    id: "launch",
    group: "site",
    label: "Launch pad",
    hint: "Same bonding curve as /launch",
    icon: "launch" as const,
    badge: (d: AdminDesk) => d.launchCount || null,
  },
  {
    id: "shill",
    group: "site",
    label: "Shill Zone",
    hint: "Same room as /shill — pins and chat",
    icon: "shill" as const,
    badge: (d: AdminDesk) => d.shill?.messages || null,
  },
  {
    id: "circle",
    group: "site",
    label: "Founders Circle",
    hint: "Same hangout as /circle",
    icon: "circle" as const,
    badge: (d: AdminDesk) => d.circle?.members || null,
  },
  {
    id: "wallets",
    group: "site",
    label: "Project",
    hint: "Wallets, SPHA launch, tokenomics",
    icon: "wallets" as const,
  },
  {
    id: "users",
    group: "people",
    label: "Users",
    hint: "Email, Google, wallets, seats, mods, and delete",
    icon: "users" as const,
    badge: (d: AdminDesk) => d.users?.length || null,
  },
  {
    id: "ranks",
    group: "people",
    label: "Ranks",
    hint: "XP, badges, intros, favourite CAs",
    icon: "ranks" as const,
  },
  {
    id: "mail",
    group: "people",
    label: "Mail",
    hint: "admin@solphia.io identities",
    icon: "mail" as const,
  },
  {
    id: "backtest",
    group: "engine",
    label: "Backtest",
    hint: "Replay spot 1× plus SOL 2× / 3×",
    icon: "backtest" as const,
  },
] as const;

export type AdminSectionId = (typeof ADMIN_NAV)[number]["id"];
export type AdminNavItem = (typeof ADMIN_NAV)[number];

export const ADMIN_SECTION_IDS: readonly AdminSectionId[] = ADMIN_NAV.map((n) => n.id);

export function isAdminSection(id: string): boolean {
  return id === "spha" || id === "system" || (ADMIN_SECTION_IDS as readonly string[]).includes(id);
}

export function resolveAdminSection(id: string): AdminSectionId {
  if (id === "spha") return "wallets";
  if (id === "system") return "health";
  if ((ADMIN_SECTION_IDS as readonly string[]).includes(id)) return id as AdminSectionId;
  return "overview";
}

export function adminSection(id: string): AdminNavItem {
  const resolved = resolveAdminSection(id);
  return ADMIN_NAV.find((n) => n.id === resolved) || ADMIN_NAV[0];
}

export function filterAdminNav(q: string): AdminNavItem[] {
  const needle = q.trim().toLowerCase();
  if (!needle) return [...ADMIN_NAV];
  return ADMIN_NAV.filter((n) => {
    const group = ADMIN_GROUPS.find((g) => g.id === n.group);
    const hay = `${n.id} ${n.label} ${n.hint} ${group?.label || ""} ${group?.blurb || ""}`.toLowerCase();
    return hay.includes(needle);
  });
}
