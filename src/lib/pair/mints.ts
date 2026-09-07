/**
 * Official SOL / xStock rails. SPYx, QQQx, GLDx only.
 * Lookalike tickers and random Token-2022 clones are rejected.
 */

export const SOL_MINT = "So11111111111111111111111111111111111111112";
export const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
export const USDT_MINT = "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB";
/** Wormhole ETH — Jupiter may hop this. Not a position we hold. */
export const WETH_MINT = "7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs";

/** Backed / xStocks SP500 xStock (Token-2022, 8 decimals). */
export const SPYX_MINT_OFFICIAL = "XsoCS1TfEyfFhfvj8EtZ528L3CaKBDBRqRapnBbDF2W";
/** Backed / xStocks Nasdaq-100 xStock (Token-2022, 8 decimals). */
export const QQQX_MINT_OFFICIAL = "Xs8S1uUs1zvS2p7iwtsG3b6fkhpvmwz4GYU3gWAmWHZ";
/** Backed / xStocks Gold xStock (Token-2022, 8 decimals). */
export const GLDX_MINT_OFFICIAL = "Xsv9hRk1z5ystj9MhnA7Lq4vjSsLwzL2nxrwmwtD3re";

export const SOL_DECIMALS = 9;
export const USDC_DECIMALS = 6;
export const XSTOCK_DECIMALS = 8;
export const SPYX_DECIMALS = XSTOCK_DECIMALS;

export const GAS_RESERVE_SOL = 0.02;

/** Combined USDC+SOL pool depth on an official mint below this → refuse that sleeve. */
export const MIN_XSTOCK_LIQUIDITY_USD = 100_000;
export const MIN_SPYX_LIQUIDITY_USD = MIN_XSTOCK_LIQUIDITY_USD;

export const PYTH_SOL_USD = "ef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d";
export const PYTH_SPYX_USD = process.env.PYTH_SPYX_USD || "";

export type XStockId = "spyx" | "qqqx" | "gldx";
export type XStockSymbol = "SPYx" | "QQQx" | "GLDx";

export type XStockMeta = {
  id: XStockId;
  symbol: XStockSymbol;
  name: string;
  shortName: string;
  mintOfficial: string;
  envKey: string;
};

export const XSTOCKS: readonly XStockMeta[] = [
  {
    id: "spyx",
    symbol: "SPYx",
    name: "S&P 500",
    shortName: "SP500 xStock",
    mintOfficial: SPYX_MINT_OFFICIAL,
    envKey: "SPYX_MINT",
  },
  {
    id: "qqqx",
    symbol: "QQQx",
    name: "Nasdaq-100",
    shortName: "Nasdaq xStock",
    mintOfficial: QQQX_MINT_OFFICIAL,
    envKey: "QQQX_MINT",
  },
  {
    id: "gldx",
    symbol: "GLDx",
    name: "Gold",
    shortName: "Gold xStock",
    mintOfficial: GLDX_MINT_OFFICIAL,
    envKey: "GLDX_MINT",
  },
] as const;

function mintOverride(envKey: string, fallback: string): string {
  const override = (process.env[envKey] || "").trim();
  if (override && /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(override)) return override;
  return fallback;
}

export function xstockMint(id: XStockId): string {
  const row = XSTOCKS.find((x) => x.id === id)!;
  return mintOverride(row.envKey, row.mintOfficial);
}

export function spyxMint(): string {
  return xstockMint("spyx");
}

export function qqqxMint(): string {
  return xstockMint("qqqx");
}

export function gldxMint(): string {
  return xstockMint("gldx");
}

export function officialMints(): string[] {
  return XSTOCKS.map((x) => xstockMint(x.id));
}

export function xstockById(id: XStockId): XStockMeta {
  return XSTOCKS.find((x) => x.id === id)!;
}

export function xstockBySymbol(symbol: string): XStockMeta | undefined {
  return XSTOCKS.find((x) => x.symbol === symbol);
}

export function xstockByMint(mint: string): XStockMeta | undefined {
  return XSTOCKS.find((x) => xstockMint(x.id) === mint);
}

export const ALLOWED_MINTS = () => new Set([SOL_MINT, USDC_MINT, ...officialMints()]);

/** Hops Jupiter may use with restrictIntermediateTokens. Endpoints stay SOL / USDC / official xStocks. */
export const LIQUID_HOPS = () => new Set([SOL_MINT, USDC_MINT, USDT_MINT, WETH_MINT, ...officialMints()]);

const LOOKALIKE =
  /^(spy|spx|sp500|s&p|s&p500|spyx|spyxstock|us500|qqq|nasdaq|ndx|qqqx|us100|gld|gold|xau|gldx|iau)$/i;

export function isOfficialSpyx(mint: string, symbol?: string, name?: string): boolean {
  return isOfficialXstock(mint, symbol, name) && mint === spyxMint();
}

export function isOfficialXstock(mint: string, symbol?: string, name?: string): boolean {
  if (officialMints().includes(mint)) return true;
  if (LOOKALIKE.test((symbol || "").replace(/\s+/g, "")) || LOOKALIKE.test((name || "").replace(/\s+/g, ""))) {
    return false;
  }
  return false;
}

export function isAllowedMint(mint: string): boolean {
  return ALLOWED_MINTS().has(mint);
}

export function routeMintsOk(mints: string[]): boolean {
  const hops = LIQUID_HOPS();
  return mints.every((m) => hops.has(m));
}
