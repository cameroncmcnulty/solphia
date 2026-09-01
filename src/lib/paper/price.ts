import type { TokenSnapshot } from "../types";

/** Live mark. Pump.fun mints are 1e9 supply; never invent a price for other venues. */
export function tokenPriceUsd(token?: TokenSnapshot | null): number {
  if (!token) return 0;
  if (token.priceUsd > 0) return token.priceUsd;
  const pump = token.venue === "pumpfun" || token.venue === "pumpswap" || token.mint.endsWith("pump");
  if (pump && token.marketCapUsd > 0) return token.marketCapUsd / 1_000_000_000;
  return 0;
}
