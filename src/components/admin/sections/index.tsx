"use client";

import type { ComponentType } from "react";
import type { AdminSectionId } from "@/lib/admin/nav";
import { useAdmin } from "../AdminProvider";
import { OverviewSection } from "./Overview";
import { DeskSection } from "./Desk";
import { TradersSection } from "./Traders";
import { SphaSection } from "./Spha";
import { LaunchSection } from "./Launch";
import { ContentSection } from "./Content";
import { BacktestSection } from "./Backtest";
import { SystemSection } from "./System";
import { WalletsSection } from "./Wallets";
import { UsersSection } from "./Users";

/** Map a nav id to its screen. Add a tool here when you append it in src/lib/admin/nav.ts. */
export const ADMIN_SECTIONS: Record<AdminSectionId, ComponentType> = {
  overview: OverviewSection,
  desk: DeskSection,
  traders: TradersSection,
  spha: SphaSection,
  launch: LaunchSection,
  content: ContentSection,
  backtest: BacktestSection,
  system: SystemSection,
  wallets: WalletsSection,
  users: UsersSection,
};

export function AdminSection() {
  const { section } = useAdmin();
  const View = ADMIN_SECTIONS[section] || OverviewSection;
  return <View />;
}
