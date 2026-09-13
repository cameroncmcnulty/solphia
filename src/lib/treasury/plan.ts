import { LAMPORTS_PER_SOL } from "@solana/web3.js";

/** Leave enough for rent + a couple of fees so the treasury account stays open. */
export const TREASURY_KEEP_LAMPORTS = 2_000_000;
export const TREASURY_MIN_SEND_LAMPORTS = 1_000_000;

export type WithdrawKind = "pct" | "sol";

export type WithdrawPlan =
  | { ok: true; lamports: number; sol: number; remainingLamports: number; remainingSol: number }
  | { ok: false; error: "empty" | "dust" | "bad_value" };

export function planTreasuryWithdraw(balanceLamports: number, kind: WithdrawKind, value: number): WithdrawPlan {
  if (!Number.isFinite(value) || value <= 0) return { ok: false, error: "bad_value" };
  const spendable = Math.max(0, Math.floor(balanceLamports) - TREASURY_KEEP_LAMPORTS);
  if (spendable < TREASURY_MIN_SEND_LAMPORTS) return { ok: false, error: "empty" };
  let lamports = 0;
  if (kind === "pct") {
    const pct = Math.min(100, value);
    lamports = Math.floor((spendable * pct) / 100);
  } else {
    lamports = Math.round(value * LAMPORTS_PER_SOL);
  }
  if (lamports > spendable) lamports = spendable;
  if (lamports < TREASURY_MIN_SEND_LAMPORTS) return { ok: false, error: "dust" };
  const remainingLamports = Math.floor(balanceLamports) - lamports;
  return {
    ok: true,
    lamports,
    sol: lamports / LAMPORTS_PER_SOL,
    remainingLamports,
    remainingSol: remainingLamports / LAMPORTS_PER_SOL,
  };
}
