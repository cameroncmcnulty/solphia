import { SOL_DECIMALS, SOL_MINT, USDC_DECIMALS, USDC_MINT } from "../pair/mints";

/** Leave enough SOL for the signature and rent so MAX cannot empty the wallet. */
export const SOL_GAS_RESERVE = 0.02;

export function spendableAmount(balance: number, mint: string, solMint = SOL_MINT): number {
  if (!(balance > 0)) return 0;
  if (mint === solMint) return Math.max(0, balance - SOL_GAS_RESERVE);
  return balance;
}

export function payDecimals(mint: string, solMint = SOL_MINT): number {
  if (mint === solMint) return SOL_DECIMALS;
  if (mint === USDC_MINT) return USDC_DECIMALS;
  return 6;
}

/** Floor to mint units. Never round up — MAX must stay at or under the bag. */
export function floorToDecimals(n: number, decimals: number): number {
  if (!(n > 0) || !Number.isFinite(n)) return 0;
  const d = Math.max(0, Math.min(18, Math.trunc(decimals)));
  const scale = 10 ** d;
  return Math.floor(n * scale + 1e-9) / scale;
}

/**
 * YOU PAY prefill for MAX / percent chips.
 * Display rounding (toFixed) used to turn 25.87396 USDC into 25.874 and then fail the bag check.
 */
export function maxPayString(n: number, mint: string, solMint = SOL_MINT): string {
  const d = payDecimals(mint, solMint);
  if (!(n > 0) || !Number.isFinite(n)) return "0";
  const scale = 10 ** d;
  const units = Math.floor(n * scale + 1e-9);
  if (units <= 0) return "0";
  const whole = Math.trunc(units / scale);
  const frac = String(units - whole * scale).padStart(d, "0").replace(/0+$/, "");
  return frac ? `${whole}.${frac}` : String(whole);
}

export function amountExceedsBalance(pay: number, spendable: number): boolean {
  return pay > 0 && spendable >= 0 && pay > spendable + 1e-9;
}
