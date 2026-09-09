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
  | "content"
  | "backtest"
  | "system"
  | "wallets";

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
    id: "spha",
    group: "protocol",
    label: "$SPHA",
    hint: "Token page socials",
    icon: "spha" as const,
  },
  {
    id: "launch",
    group: "protocol",
    label: "Launch pad",
    hint: "Owner earnings and coins on the pad",
    icon: "launch" as const,
    badge: (d: AdminDesk) => d.launchCount || null,
  },
  {
    id: "content",
    group: "protocol",
    label: "Content bot",
    hint: "Daily posts she writes and paints",
    icon: "content" as const,
    badge: (d: AdminDesk) => (d.promos.length ? `${d.promos.length}/24` : null),
  },
  {
    id: "backtest",
    group: "engine",
    label: "Backtest",
    hint: "Replay spot 1× plus SOL 2× / 3×",
    icon: "backtest" as const,
  },
  {
    id: "system",
    group: "engine",
    label: "System",
    hint: "Locked defaults and the audit log",
    icon: "system" as const,
  },
  {
    id: "wallets",
    group: "access",
    label: "Wallets",
    hint: "Admin wallets and treasury",
    icon: "wallets" as const,
  },
] as const;

export type AdminSectionId = (typeof ADMIN_NAV)[number]["id"];
export type AdminNavItem = (typeof ADMIN_NAV)[number];

export const ADMIN_SECTION_IDS: readonly AdminSectionId[] = ADMIN_NAV.map((n) => n.id);

export function isAdminSection(id: string): id is AdminSectionId {
  return (ADMIN_SECTION_IDS as readonly string[]).includes(id);
}

export function adminSection(id: string): AdminNavItem {
  return ADMIN_NAV.find((n) => n.id === id) || ADMIN_NAV[0];
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
