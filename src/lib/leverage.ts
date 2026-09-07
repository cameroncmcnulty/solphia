/**
 * Leverage is not a multiplier on Jupiter spot.
 * Official SPYx / QQQx / GLDx are spot tokens — there is no issuer 2x.
 * Real leverage is a separate perps venue (Drift / Jupiter Perps) on SOL,
 * isolated from the USDC spot bag, with liquidation and funding.
 * Wired off until that venue is integrated. lockedAuto always forces 1.
 */
export const LEVERAGE_LIVE = false;
export const SPOT_LEVERAGE = 1 as const;
export type LeverageVenue = "spot" | "drift_perps" | "jupiter_perps";

export function leverageVenue(): LeverageVenue {
  return "spot";
}

export function assertSpotOnly(leverage: number | undefined): asserts leverage is 1 {
  if (leverage != null && leverage !== 1) {
    throw new Error("Spot only. Perps venue is not wired — will not fake 2x on Jupiter.");
  }
}
