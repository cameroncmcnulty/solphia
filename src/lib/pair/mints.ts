/**
 * Official SOL / tokenized S&P 500 rails.
 * Lookalike tickers (SPY, SPYX, "s&p", random Token-2022 clones) are rejected.
 * Admin can override the SPYx mint via SPYX_MINT — still must be a real Solana address.
 */

export const SOL_MINT = "So11111111111111111111111111111111111111112";
export const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

/** Backed / xStocks SP500 xStock on Solana (Token-2022, 8 decimals). Solscan-confirmed. */
export const SPYX_MINT_OFFICIAL = "XsoCS1TfEyfFhfvj8EtZ528L3CaKBDBRqRapnBbDF2W";

export const SOL_DECIMALS = 9;
export const USDC_DECIMALS = 6;
export const SPYX_DECIMALS = 8;

export const GAS_RESERVE_SOL = 0.02;

/** Combined USDC+SOL pool depth on the official mint below this → refuse. */
export const MIN_SPYX_LIQUIDITY_USD = 100_000;

export const PYTH_SOL_USD = "ef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d";
/** Crypto.SPYX/USD — Hermes id; may require PYTH_API_KEY after 2026-08-26. */
export const PYTH_SPYX_USD = process.env.PYTH_SPYX_USD || "";

export function spyxMint(): string {
  const override = (process.env.SPYX_MINT || "").trim();
  if (override && /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(override)) return override;
  return SPYX_MINT_OFFICIAL;
}

export const ALLOWED_MINTS = () => new Set([SOL_MINT, USDC_MINT, spyxMint()]);

const LOOKALIKE = /^(spy|spx|sp500|s&p|s&p500|spyx|spyxstock|us500)$/i;

export function isOfficialSpyx(mint: string, symbol?: string, name?: string): boolean {
  if (mint === spyxMint()) return true;
  if (LOOKALIKE.test((symbol || "").replace(/\s+/g, "")) || LOOKALIKE.test((name || "").replace(/\s+/g, ""))) {
    return false;
  }
  return false;
}

export function isAllowedMint(mint: string): boolean {
  return ALLOWED_MINTS().has(mint);
}

export function routeMintsOk(mints: string[]): boolean {
  const allow = ALLOWED_MINTS();
  return mints.every((m) => allow.has(m));
}
