import { SOL_MINT } from "../pair/mints";

/** Leave enough SOL for the signature and rent so MAX cannot empty the wallet. */
export const SOL_GAS_RESERVE = 0.02;

export function spendableAmount(balance: number, mint: string, solMint = SOL_MINT): number {
  if (!(balance > 0)) return 0;
  if (mint === solMint) return Math.max(0, balance - SOL_GAS_RESERVE);
  return balance;
}

export function amountExceedsBalance(pay: number, spendable: number): boolean {
  return pay > 0 && spendable >= 0 && pay > spendable + 1e-9;
}
