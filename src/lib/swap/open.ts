import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { connection } from "../solana/connection";
import { isSolanaAddress } from "../security";
import { SOL_MINT, USDC_MINT, SOL_DECIMALS, USDC_DECIMALS } from "../pair/mints";
import { quoteOpenSwap } from "../pair/jupiter";
import { assemblePhantomSwapTx } from "./build";
import { liveSwapFeeSol } from "./route";
import { buildPadSwapTx, quotePadSwap } from "./pad";
import { isDeskMint } from "../tx/venue";
import { tokenUiAmount } from "../solana/tokenBalance";
import { simulateUnsignedB64 } from "../solana/simulate";

export type AnyQuote =
  | {
      ok: true;
      via: "curve" | "jupiter";
      outAmount: number;
      feeSol: number;
      spendSol: number;
      impactPct: number;
      inMint: string;
      outMint: string;
      inDecimals: number;
      outDecimals: number;
    }
  | { ok: false; reason: string };

const decCache = new Map<string, { at: number; n: number }>();

export function padPair(inputMint: string, outputMint: string): { mint: string; side: "buy" | "sell" } | null {
  if (!isSolanaAddress(inputMint) || !isSolanaAddress(outputMint) || inputMint === outputMint) return null;
  if (inputMint === SOL_MINT && outputMint !== SOL_MINT) return { mint: outputMint, side: "buy" };
  if (outputMint === SOL_MINT && inputMint !== SOL_MINT) return { mint: inputMint, side: "sell" };
  return null;
}

export async function mintDecimals(mint: string): Promise<number> {
  if (mint === SOL_MINT) return SOL_DECIMALS;
  if (mint === USDC_MINT) return USDC_DECIMALS;
  const hit = decCache.get(mint);
  if (hit && Date.now() - hit.at < 10 * 60_000) return hit.n;
  let n = 6;
  try {
    const info = await connection().getParsedAccountInfo(new PublicKey(mint), "confirmed");
    const d = Number((info.value?.data as { parsed?: { info?: { decimals?: number } } } | undefined)?.parsed?.info?.decimals);
    if (Number.isFinite(d) && d >= 0 && d <= 18) n = d;
  } catch {
    n = 6;
  }
  decCache.set(mint, { at: Date.now(), n });
  return n;
}

export async function quoteAnySwap(opts: {
  inputMint: string;
  outputMint: string;
  amount: number;
  slippageBps?: number;
  /** Protocol wallets skip the widget 1% so they do not skim themselves. Curve 1% stays on-chain. */
  skipHouse?: boolean;
}): Promise<AnyQuote> {
  if (!isSolanaAddress(opts.inputMint) || !isSolanaAddress(opts.outputMint) || opts.inputMint === opts.outputMint) {
    return { ok: false, reason: "Pick two different tokens." };
  }
  if (!(opts.amount > 0)) return { ok: false, reason: "Enter an amount." };
  const slip = opts.slippageBps ?? 100;
  const skipHouse = Boolean(opts.skipHouse);
  const pair = padPair(opts.inputMint, opts.outputMint);
  if (pair && !isDeskMint(pair.mint)) {
    try {
      const pad = await quotePadSwap({ mint: pair.mint, side: pair.side, amount: opts.amount, slippageBps: slip });
      if (pad.ok) {
        const [inDecimals, outDecimals] = await Promise.all([mintDecimals(opts.inputMint), mintDecimals(opts.outputMint)]);
        return {
          ok: true,
          via: "curve",
          outAmount: pad.outAmount,
          feeSol: pad.feeSol,
          spendSol: pad.spendSol,
          impactPct: pad.impactPct,
          inMint: opts.inputMint,
          outMint: opts.outputMint,
          inDecimals,
          outDecimals,
        };
      }
    } catch {
      /* not on our curve — Jupiter next */
    }
  }
  const [inDecimals, outDecimals] = await Promise.all([mintDecimals(opts.inputMint), mintDecimals(opts.outputMint)]);
  const buyFee = skipHouse || opts.inputMint !== SOL_MINT ? 0 : liveSwapFeeSol(opts.amount);
  const quoteAmount = buyFee > 0 ? Math.max(0, opts.amount - buyFee) : opts.amount;
  let q: Awaited<ReturnType<typeof quoteOpenSwap>>;
  try {
    q = await quoteOpenSwap({
      inputMint: opts.inputMint,
      outputMint: opts.outputMint,
      amount: quoteAmount,
      slippageBps: slip,
      inDecimals,
      outDecimals,
    });
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : "No swap route." };
  }
  if (!q.ok) return { ok: false, reason: q.reason };
  const feeSol = skipHouse
    ? 0
    : opts.inputMint === SOL_MINT
      ? liveSwapFeeSol(opts.amount)
      : opts.outputMint === SOL_MINT
        ? liveSwapFeeSol(q.outAmount)
        : 0;
  return {
    ok: true,
    via: "jupiter",
    outAmount: opts.outputMint === SOL_MINT && feeSol > 0 ? Math.max(0, q.outAmount - feeSol) : q.outAmount,
    feeSol,
    spendSol: opts.amount,
    impactPct: q.impactPct,
    inMint: opts.inputMint,
    outMint: opts.outputMint,
    inDecimals,
    outDecimals,
  };
}

export async function buildAnySwapTx(opts: {
  owner: string;
  inputMint: string;
  outputMint: string;
  amount: number;
  slippageBps?: number;
  priority?: "auto" | "low" | "medium" | "high";
  skipHouse?: boolean;
}): Promise<{ ok: true; transaction: string; via: "curve" | "jupiter"; outAmount: number; feeSol: number } | { ok: false; reason: string }> {
  if (!isSolanaAddress(opts.owner)) return { ok: false, reason: "Connect a wallet first." };
  if (opts.inputMint === SOL_MINT) {
    try {
      const lamports = await connection().getBalance(new PublicKey(opts.owner));
      const need = Math.round(opts.amount * LAMPORTS_PER_SOL);
      if (lamports < need + 5_000) {
        return { ok: false, reason: "Not enough SOL in this wallet. Try a smaller amount." };
      }
    } catch {
      /* sim below still catches a short bag */
    }
  } else {
    try {
      const have = await tokenUiAmount(connection(), opts.owner, opts.inputMint);
      if (opts.amount > have.amount + 1e-9) {
        return { ok: false, reason: "Not enough of that token in this wallet. Try a smaller amount." };
      }
    } catch {
      /* sim below still catches a short bag */
    }
  }
  const skipHouse = Boolean(opts.skipHouse);
  const q = await quoteAnySwap({ ...opts, skipHouse });
  if (!q.ok) return q;
  const slip = opts.slippageBps ?? 100;
  if (q.via === "curve") {
    const pair = padPair(opts.inputMint, opts.outputMint);
    if (!pair) return { ok: false, reason: "Could not build the swap." };
    const tx = await buildPadSwapTx({
      owner: opts.owner,
      mint: pair.mint,
      side: pair.side,
      amount: opts.amount,
    });
    if (!tx.ok) return { ok: false, reason: tx.reason };
    const sim = await simulateUnsignedB64(tx.transaction);
    if (!sim.ok) return sim;
    return { ok: true, transaction: tx.transaction, via: "curve", outAmount: q.outAmount, feeSol: q.feeSol };
  }
  const buyFee = skipHouse || opts.inputMint !== SOL_MINT ? 0 : liveSwapFeeSol(opts.amount);
  const quoteAmount = buyFee > 0 ? Math.max(0, opts.amount - buyFee) : opts.amount;
  const jup = await quoteOpenSwap({
    inputMint: opts.inputMint,
    outputMint: opts.outputMint,
    amount: quoteAmount,
    slippageBps: slip,
    inDecimals: q.inDecimals,
    outDecimals: q.outDecimals,
  });
  if (!jup.ok) return { ok: false, reason: jup.reason };
  const feeAfter = opts.outputMint === SOL_MINT && opts.inputMint !== SOL_MINT;
  const feeSol = skipHouse ? 0 : buyFee > 0 ? buyFee : feeAfter ? liveSwapFeeSol(jup.outAmount) : 0;
  const built = await assemblePhantomSwapTx({
    owner: opts.owner,
    quote: jup.quote,
    feeSol,
    feeAfter,
    priority: opts.priority,
  });
  if (!built.ok) return built;
  const sim = await simulateUnsignedB64(built.transaction);
  if (!sim.ok) return sim;
  const outAmount = feeAfter && feeSol > 0 ? Math.max(0, jup.outAmount - feeSol) : jup.outAmount;
  return { ok: true, transaction: built.transaction, via: "jupiter", outAmount, feeSol };
}
