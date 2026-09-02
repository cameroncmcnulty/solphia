import type { LabKind, LabStrategy, PaperFill } from "../types";

export type { LabKind, LabStrategy };

export function emptyLab(): Record<LabKind, LabStrategy> {
  return {
    copy: { id: "copy", enabled: true, demoted: false, shadowPnlUsd: 0, greenDays: 0, lastDayKey: "", lastDayPnl: 0, trades: 0, denied: 0 },
    launch: { id: "launch", enabled: false, demoted: false, shadowPnlUsd: 0, greenDays: 0, lastDayKey: "", lastDayPnl: 0, trades: 0, denied: 0 },
    migrate: { id: "migrate", enabled: false, demoted: false, shadowPnlUsd: 0, greenDays: 0, lastDayKey: "", lastDayPnl: 0, trades: 0, denied: 0 },
  };
}

export function mergeLab(raw?: Partial<Record<LabKind, Partial<LabStrategy>>>): Record<LabKind, LabStrategy> {
  const base = emptyLab();
  if (!raw) return base;
  for (const k of Object.keys(base) as LabKind[]) {
    if (raw[k]) Object.assign(base[k], raw[k], { id: k });
  }
  return base;
}

export function kindOf(strategy: string): LabKind | null {
  if (strategy === "copy_trade") return "copy";
  if (strategy === "launch_snipe") return "launch";
  if (strategy === "migration_snipe") return "migrate";
  return null;
}

export function noteDenial(lab: Record<LabKind, LabStrategy>, kind: LabKind) {
  lab[kind].denied += 1;
}

export function applyShadow(lab: Record<LabKind, LabStrategy>, fill: PaperFill, startingUsd: number, now = Date.now()) {
  const kind = kindOf(fill.strategy);
  if (!kind) return;
  const s = lab[kind];
  if (fill.side === "sell") {
    s.shadowPnlUsd += fill.pnlUsd || 0;
    s.trades += 1;
    const day = new Date(now).toISOString().slice(0, 10);
    if (s.lastDayKey !== day) {
      if (s.lastDayKey && s.lastDayPnl > 0) s.greenDays += 1;
      else if (s.lastDayKey) s.greenDays = 0;
      s.lastDayKey = day;
      s.lastDayPnl = fill.pnlUsd || 0;
    } else {
      s.lastDayPnl += fill.pnlUsd || 0;
    }
  }
  if (s.shadowPnlUsd < -0.15 * startingUsd || s.lastDayPnl < -0.08 * startingUsd) {
    s.enabled = false;
    s.demoted = true;
  } else if (kind !== "copy" && s.greenDays >= 2 && s.shadowPnlUsd > 0 && s.trades >= 5) {
    s.enabled = true;
    s.demoted = false;
  }
}

export function sizeBudget(lab: LabStrategy, baseUsd: number, live = false): number {
  if (lab.demoted) return 0;
  if (live && !lab.enabled) return 0;
  if (!live && !lab.enabled) return Math.round(baseUsd * 0.25 * 100) / 100;
  return baseUsd;
}
