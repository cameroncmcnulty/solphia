/**
 * SOL 2x/3x is a Jupiter Perps-style long, isolated from spot SPYx/QQQx/GLDx.
 * Fees match Jupiter Perps: 6 bps open, 6 bps close, hourly borrow on the borrowed
 * notional, liquidation when the move eats ~80% of collateral.
 * Live on-chain perps wait on Jupiter's Perps API (still WIP). Until then this
 * sleeve is live-priced paper with the same economics as the lev backtest.
 */
export type Lev = 1 | 2 | 3;
export type LeverageVenue = "spot" | "jupiter_perps";

export const SPOT_LEVERAGE: Lev = 1;
export const LEV_OPEN_BPS = 6;
export const LEV_CLOSE_BPS = 6;
/** ~0.8 bps / hour on borrowed notional (Jupiter borrow varies with JLP utilization). */
export const LEV_BORROW_PER_HOUR = 0.00008;
/** Liquidate when |price move| * L >= 80% of collateral. */
export const LEV_MAINT = 0.8;

export function clampLev(n: unknown): Lev {
  if (n === 2 || n === 3) return n;
  return 1;
}

export function leverageVenue(lev: Lev): LeverageVenue {
  return lev > 1 ? "jupiter_perps" : "spot";
}

export function canUseLeverage(plan?: string | null, founder?: boolean): boolean {
  if (founder) return true;
  return plan === "lev" || plan === "full";
}

/** Paper 2×/3× is free. Live 2×/3× needs the lev seat (or founder). */
export function leverageUnlocked(opts: { mode?: string | null; levSeat?: boolean; founder?: boolean }): boolean {
  if (opts.founder) return true;
  if (opts.mode !== "live") return true;
  return Boolean(opts.levSeat);
}

export function notionalUsd(collateralUsd: number, lev: Lev): number {
  return Math.max(0, collateralUsd) * lev;
}

export function openFeeUsd(notional: number): number {
  return (notional * LEV_OPEN_BPS) / 10_000;
}

export function closeFeeUsd(notional: number): number {
  return (notional * LEV_CLOSE_BPS) / 10_000;
}

export function liqPrice(entryPx: number, lev: Lev): number {
  if (!(entryPx > 0) || lev <= 1) return 0;
  return entryPx * (1 - LEV_MAINT / lev);
}

export function perpPnlUsd(entryPx: number, px: number, notional: number): number {
  if (!(entryPx > 0)) return 0;
  return ((px - entryPx) / entryPx) * notional;
}

export function borrowUsd(opts: {
  notionalUsd: number;
  lev: Lev;
  from: number;
  to: number;
}): number {
  if (opts.lev <= 1 || opts.to <= opts.from) return 0;
  const hours = (opts.to - opts.from) / 3_600_000;
  const borrowed = opts.notionalUsd * (1 - 1 / opts.lev);
  return Math.max(0, borrowed * LEV_BORROW_PER_HOUR * hours);
}

export function levNote(lev: Lev): string {
  if (lev <= 1) return "Spot SOL. No borrow, no liquidation from leverage.";
  return `SOL-PERP ${lev}x · Jupiter Perps fees (6 bps in, 6 bps out) · borrow while open · liq ~${((LEV_MAINT / lev) * 100).toFixed(0)}% against.`;
}
