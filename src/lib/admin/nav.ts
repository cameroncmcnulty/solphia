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
  { id: "ops", label: "Ops", blurb: "Watch the desk" },
  { id: "protocol", label: "Protocol", blurb: "Token, pad, posts" },
  { id: "engine", label: "Engine", blurb: "Replay and locks" },
  { id: "access", label: "Access", blurb: "Keys and logs" },
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
    hint: "Public book, tape, and price feeds",
    icon: "desk" as const,
  },
  {
    id: "traders",
    group: "ops",
    label: "Bots & seats",
    hint: "Personal books and paid seats",
    icon: "traders" as const,
    badge: (d: AdminDesk) => d.traders.length || null,
  },
  {
    id: "launch",
    group: "protocol",
    label: "Launch pad",
    hint: "Bonding curve, same as the site",
    icon: "launch" as const,
    badge: (d: AdminDesk) => d.launchCount || null,
  },
  {
    id: "backtest",
    group: "engine",
    label: "Backtest",
    hint: "Replay spot 1× plus SOL 2× / 3×",
    icon: "backtest" as const,
  },
  {
    id: "health",
    group: "ops",
    label: "Health",
    hint: "Storage, speed, and plan ceilings",
    icon: "health" as const,
  },
  {
    id: "system",
    group: "engine",
    label: "System",
    hint: "Locked defaults and the audit log",
    icon: "system" as const,
  },
  {
    id: "users",
    group: "access",
    label: "Users",
    hint: "Search, edit, and delete accounts",
    icon: "users" as const,
    badge: (d: AdminDesk) => d.users?.length || null,
  },
  {
    id: "wallets",
    group: "protocol",
    label: "Project",
    hint: "Wallets, SPHA launch, tokenomics",
    icon: "wallets" as const,
  },
  {
    id: "circle",
    group: "protocol",
    label: "Founders Circle",
    hint: "Hangout, jobs, members, airdrops",
    icon: "circle" as const,
    badge: (d: AdminDesk) => d.circle?.members || null,
  },
  {
    id: "mail",
    group: "access",
    label: "Mail",
    hint: "admin@solphia.io and @solphia.io identities",
    icon: "mail" as const,
  },
  {
    id: "shill",
    group: "protocol",
    label: "Shill Zone",
    hint: "Chat, pins, and the pump loop room",
    icon: "shill" as const,
    badge: (d: AdminDesk) => d.shill?.messages || null,
  },
  {
    id: "ranks",
    group: "access",
    label: "Ranks",
    hint: "XP, badges, intros, favourite CAs",
    icon: "ranks" as const,
  },
] as const;

export type AdminSectionId = (typeof ADMIN_NAV)[number]["id"];
export type AdminNavItem = (typeof ADMIN_NAV)[number];

export const ADMIN_SECTION_IDS: readonly AdminSectionId[] = ADMIN_NAV.map((n) => n.id);

export function isAdminSection(id: string): boolean {
  return id === "spha" || (ADMIN_SECTION_IDS as readonly string[]).includes(id);
}

export function resolveAdminSection(id: string): AdminSectionId {
  if (id === "spha") return "wallets";
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
