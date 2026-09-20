import { SWAP_FEE_BPS } from "../launch/curve";
import { isSolanaAddress } from "../security";
import { buildPadTradeTx, padCurveReady, quoteBuyRaw, quoteSellRaw } from "../launch/program";
import { launchError } from "../launch/errors";
import { SOL_MINT } from "../pair/mints";
import { isDeskMint, resolveVenue } from "../tx/venue";

export const PAD_SWAP_FEE_BPS = SWAP_FEE_BPS;

function feeSolOf(amountSol: number): number {
  return Math.floor(amountSol * PAD_SWAP_FEE_BPS) / 10_000;
}

export function splitPadSpend(amountSol: number): { feeSol: number; swapSol: number } {
  const feeSol = feeSolOf(amountSol);
  const swapSol = Math.max(0, amountSol - feeSol);
  return { feeSol, swapSol };
}

export type PadQuote =
  | {
      ok: true;
      via: "curve";
      impactPct: number;
      outAmount: number;
      feeSol: number;
      spendSol: number;
      inMint: string;
      outMint: string;
      creator: string;
    }
  | { ok: false; reason: string; error?: string };

/** Pad-only quote. Jupiter is never a pad fallback. */
export async function quotePadSwap(opts: {
  side: "buy" | "sell";
  mint: string;
  amount: number;
  slippageBps?: number;
  skipFee?: boolean;
}): Promise<PadQuote> {
  if (!isSolanaAddress(opts.mint) || opts.mint === SOL_MINT) return { ok: false, reason: launchError("bad_mint"), error: "bad_mint" };
  if (!(opts.amount > 0)) return { ok: false, reason: "Enter an amount." };
  if (isDeskMint(opts.mint)) return { ok: false, reason: launchError("desk_mint"), error: "desk_mint" };
  const venue = await resolveVenue(opts.mint);
  if (venue.venue !== "pad") return { ok: false, reason: launchError("not_on_curve"), error: "not_on_curve" };
  const vs = BigInt(Math.round(venue.curve.virtualSol * 1e9));
  const vt = BigInt(Math.round(venue.curve.virtualTokens * 1e6));
  if (opts.side === "buy") {
    if (opts.amount < 0.01) return { ok: false, reason: launchError("too_small"), error: "too_small" };
    const q = quoteBuyRaw(vs, vt, BigInt(Math.round(opts.amount * 1e9)));
    if (q.tokensOut <= 0n) return { ok: false, reason: launchError("zero_out"), error: "zero_out" };
    return {
      ok: true,
      via: "curve",
      impactPct: 0,
      outAmount: Number(q.tokensOut) / 1e6,
      feeSol: Number(q.fee) / 1e9,
      spendSol: opts.amount,
      inMint: SOL_MINT,
      outMint: opts.mint,
      creator: venue.creator,
    };
  }
  const q = quoteSellRaw(vs, vt, BigInt(Math.round(opts.amount * 1e6)));
  if (q.solOut <= 0n) return { ok: false, reason: launchError("zero_out"), error: "zero_out" };
  return {
    ok: true,
    via: "curve",
    impactPct: 0,
    outAmount: Number(q.solOut) / 1e9,
    feeSol: Number(q.fee) / 1e9,
    spendSol: opts.amount,
    inMint: opts.mint,
    outMint: SOL_MINT,
    creator: venue.creator,
  };
}

export async function buildPadSwapTx(opts: {
  owner: string;
  mint: string;
  side: "buy" | "sell";
  amount: number;
  creator?: string;
}): Promise<{ ok: true; transaction: string } | { ok: false; reason: string }> {
  if (!isSolanaAddress(opts.owner)) return { ok: false, reason: "Connect Phantom first." };
  const live = await padCurveReady(opts.mint);
  const creator = opts.creator || (live.ok ? live.creator : opts.owner);
  const built = await buildPadTradeTx({
    mint: opts.mint,
    owner: opts.owner,
    creator,
    side: opts.side,
    sol: opts.side === "buy" ? opts.amount : undefined,
    tokens: opts.side === "sell" ? opts.amount : undefined,
  });
  if (!built.ok) return { ok: false, reason: launchError(built.error) };
  return { ok: true, transaction: built.transaction };
}
