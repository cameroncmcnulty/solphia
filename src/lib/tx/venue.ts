/**
 * Solphia transaction venues.
 *
 * pad  — our on-chain curve program. Every launch buy/sell lives here. Never Jupiter.
 * desk — official SOL / USDC / SPYx / QQQx / GLDx. We do not own those pools, so the
 *        live desk still quotes Jupiter to reach them.
 * market — a mint we do not list and that is not on our curve. We do not route it.
 */
import { padCurveReady } from "../launch/program";
import type { CurveState } from "../launch/curve";
import { ALLOWED_MINTS, SOL_MINT, isAllowedMint } from "../pair/mints";

export type TxVenue = "pad" | "desk" | "market";

export type ResolvedVenue =
  | { venue: "pad"; creator: string; curve: CurveState }
  | { venue: "desk" }
  | { venue: "market" };

export function isDeskMint(mint: string): boolean {
  return isAllowedMint(mint);
}

export function deskMintSet(): Set<string> {
  return ALLOWED_MINTS();
}

export function isWrappedSol(mint: string): boolean {
  return mint === SOL_MINT;
}

export async function resolveVenue(mint: string): Promise<ResolvedVenue> {
  if (isDeskMint(mint)) return { venue: "desk" };
  const live = await padCurveReady(mint);
  if (live.ok) return { venue: "pad", creator: live.creator, curve: live.curve };
  return { venue: "market" };
}
