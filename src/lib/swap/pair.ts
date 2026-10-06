import { SOL_MINT, USDC_MINT } from "../pair/mints";

/** Other side of a swap pair. SOL pairs with USDC; every other mint pairs with SOL. Never the same mint. */
export function swapComplementMint(mint: string, solMint = SOL_MINT, usdcMint = USDC_MINT): string {
  return mint === solMint ? usdcMint : solMint;
}

/**
 * Default pay/recv mints. Empty / unknown → SOL → USDC.
 * buy TOKEN → SOL → TOKEN. sell TOKEN → TOKEN → SOL.
 * buy SOL → USDC → SOL. sell SOL → SOL → USDC.
 */
export function swapDefaultPair(
  focusMint?: string,
  side: "buy" | "sell" = "buy",
  solMint = SOL_MINT,
  usdcMint = USDC_MINT,
): { pay: string; recv: string } {
  const mint = (focusMint || "").trim();
  if (!mint || mint.length < 32) return { pay: solMint, recv: usdcMint };
  if (side === "sell") return { pay: mint, recv: swapComplementMint(mint, solMint, usdcMint) };
  return { pay: swapComplementMint(mint, solMint, usdcMint), recv: mint };
}
