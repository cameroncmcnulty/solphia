/**
 * Solphia fair-launch curve.
 * Constant-product virtual AMM (same family as Pump.fun): price is k / reserves.
 * Launch is free (0 SOL). Revenue is the 1.00% swap fee — under Pump.fun's 1.25%
 * and in line with Moonshot's 1% on $100+ trades.
 *
 * Fee split on every buy and sell:
 *   50% creator Dev Rewards (withdraw anytime)
 *   25% owner earnings
 *   25% protocol treasury
 *
 * Live on-chain custody needs the Solphia launch program. This module is the
 * canonical math both paper and that program must match.
 */

export const TOKEN_SUPPLY = 1_000_000_000;
/** ~80% sold on the curve; 20% seeds the graduated AMM with curve SOL. */
export const CURVE_SALE = 800_000_000;
export const LP_RESERVE = TOKEN_SUPPLY - CURVE_SALE;
export const VIRTUAL_SOL = 30;
export const VIRTUAL_TOKENS = 1_073_000_191;
export const GRADUATE_SOL = 85;
export const SWAP_FEE_BPS = 100;
export const DEV_FEE_BPS = 50;
export const OWNER_FEE_BPS = 25;
export const TREAS_FEE_BPS = 25;
export const CREATE_FEE_SOL = 0;
export const GRADUATE_FEE_SOL = 0.01;
export const MAX_WALLET_BPS = 200;
export const ANTI_SNIPE_MS = 60_000;
export const ANTI_SNIPE_SOL = 1;
export const MIN_TRADE_SOL = 0.01;
export const MAX_TRADE_SOL = 40;
/** Square token art used by Pump, X, Telegram, Discord, Dexscreener. */
export const TOKEN_IMAGE_PX = 1000;
export const DEV_BUY_MAX_SOL = 2;

export const K = VIRTUAL_SOL * VIRTUAL_TOKENS;

export type CurvePhase = "curve" | "graduated";

export type CurveState = {
  virtualSol: number;
  virtualTokens: number;
  realSol: number;
  tokensSold: number;
  phase: CurvePhase;
};

export function emptyCurve(): CurveState {
  return {
    virtualSol: VIRTUAL_SOL,
    virtualTokens: VIRTUAL_TOKENS,
    realSol: 0,
    tokensSold: 0,
    phase: "curve",
  };
}

export function spotPriceSol(c: CurveState): number {
  if (!(c.virtualTokens > 0)) return 0;
  return c.virtualSol / c.virtualTokens;
}

export function marketCapSol(c: CurveState): number {
  return spotPriceSol(c) * TOKEN_SUPPLY;
}

export function progressPct(c: CurveState): number {
  return Math.max(0, Math.min(1, c.realSol / GRADUATE_SOL));
}

export function splitFee(feeSol: number): { dev: number; owner: number; treasury: number } {
  const dev = (feeSol * DEV_FEE_BPS) / SWAP_FEE_BPS;
  const owner = (feeSol * OWNER_FEE_BPS) / SWAP_FEE_BPS;
  const treasury = Math.max(0, feeSol - dev - owner);
  return { dev, owner, treasury };
}

export function feeOn(sol: number): number {
  return Math.max(0, sol) * (SWAP_FEE_BPS / 10_000);
}

export type Quote = {
  ok: true;
  solIn?: number;
  solOut?: number;
  tokensOut?: number;
  tokensIn?: number;
  feeSol: number;
  split: { dev: number; owner: number; treasury: number };
  priceSol: number;
  impactPct: number;
  newCurve: CurveState;
};

export type QuoteErr = { ok: false; error: string };

export function quoteBuy(c: CurveState, solIn: number): Quote | QuoteErr {
  if (c.phase !== "curve") return { ok: false, error: "graduated" };
  if (!(solIn >= MIN_TRADE_SOL)) return { ok: false, error: "too_small" };
  if (solIn > MAX_TRADE_SOL) return { ok: false, error: "too_large" };
  const feeSol = feeOn(solIn);
  const net = solIn - feeSol;
  if (!(net > 0)) return { ok: false, error: "fee_eats_trade" };
  const newVirtualSol = c.virtualSol + net;
  const newVirtualTokens = K / newVirtualSol;
  const tokensOut = c.virtualTokens - newVirtualTokens;
  if (!(tokensOut > 0)) return { ok: false, error: "zero_out" };
  const left = CURVE_SALE - c.tokensSold;
  if (tokensOut > left) return { ok: false, error: "curve_empty" };
  const px0 = spotPriceSol(c);
  const next: CurveState = {
    virtualSol: newVirtualSol,
    virtualTokens: newVirtualTokens,
    realSol: c.realSol + net,
    tokensSold: c.tokensSold + tokensOut,
    phase: c.realSol + net >= GRADUATE_SOL ? "graduated" : "curve",
  };
  const px1 = spotPriceSol(next);
  return {
    ok: true,
    solIn,
    tokensOut,
    feeSol,
    split: splitFee(feeSol),
    priceSol: px1,
    impactPct: px0 > 0 ? px1 / px0 - 1 : 0,
    newCurve: next,
  };
}

export function quoteSell(c: CurveState, tokensIn: number): Quote | QuoteErr {
  if (c.phase !== "curve") return { ok: false, error: "graduated" };
  if (!(tokensIn > 0)) return { ok: false, error: "too_small" };
  if (tokensIn > c.tokensSold + 1e-6) return { ok: false, error: "not_enough_sold" };
  const newVirtualTokens = c.virtualTokens + tokensIn;
  const newVirtualSol = K / newVirtualTokens;
  const grossSol = Math.min(c.realSol, c.virtualSol - newVirtualSol);
  if (!(grossSol > 0)) return { ok: false, error: "zero_out" };
  const feeSol = feeOn(grossSol);
  const solOut = grossSol - feeSol;
  if (!(solOut > 0)) return { ok: false, error: "fee_eats_trade" };
  const px0 = spotPriceSol(c);
  const next: CurveState = {
    virtualSol: newVirtualSol,
    virtualTokens: newVirtualTokens,
    realSol: c.realSol - grossSol,
    tokensSold: c.tokensSold - tokensIn,
    phase: "curve",
  };
  const px1 = spotPriceSol(next);
  return {
    ok: true,
    tokensIn,
    solOut,
    feeSol,
    split: splitFee(feeSol),
    priceSol: px1,
    impactPct: px0 > 0 ? px1 / px0 - 1 : 0,
    newCurve: next,
  };
}

export function graduatePool(c: CurveState): { sol: number; tokens: number } | null {
  if (c.phase !== "graduated") return null;
  const sol = Math.max(0, c.realSol - GRADUATE_FEE_SOL);
  const tokens = LP_RESERVE + Math.max(0, CURVE_SALE - c.tokensSold);
  return { sol, tokens };
}
