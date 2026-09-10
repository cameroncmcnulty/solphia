import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  VersionedTransaction,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { PROTOCOL_FEE_BPS, rpcUrl } from "../config";
import { applyPairDecision, tapeOf } from "../pair/paper";
import { buildSwapTx, quoteSwap } from "../pair/jupiter";
import { USDC_MINT } from "../pair/mints";
import type { PairPrices } from "../pair/prices";
import { pushBounded } from "../store";
import { treasuryAddress } from "../treasury";
import type { Mind, PaperBook, PairIntent, TraderAccount } from "../types";
import { decisionFromIntent } from "./fill";
import { planIntentSwaps } from "./intent";
import { loadDelegatedKeypair } from "./signer";

export const MAX_LIVE_FILLS_PER_TICK = 2;

function toB64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64");
}

async function signAndSend(conn: Connection, kp: Keypair, transactionB64: string): Promise<string> {
  const raw = Buffer.from(transactionB64, "base64");
  let signed: Uint8Array;
  try {
    const tx = VersionedTransaction.deserialize(raw);
    tx.sign([kp]);
    signed = tx.serialize();
  } catch {
    const tx = Transaction.from(raw);
    tx.partialSign(kp);
    signed = tx.serialize();
  }
  return conn.sendRawTransaction(signed, { skipPreflight: false });
}

async function swapLeg(
  conn: Connection,
  kp: Keypair,
  inputMint: string,
  outputMint: string,
  amount: number,
): Promise<string> {
  const q = await quoteSwap({ inputMint, outputMint, amount, slippageBps: 50 });
  if (!q.ok) throw new Error(q.reason);
  if (q.viaUsdc && q.midAmount && q.midAmount > 0) {
    await swapDirect(conn, kp, inputMint, USDC_MINT, amount);
    return swapDirect(conn, kp, USDC_MINT, outputMint, q.midAmount);
  }
  return swapDirect(conn, kp, inputMint, outputMint, amount);
}

async function swapDirect(
  conn: Connection,
  kp: Keypair,
  inputMint: string,
  outputMint: string,
  amount: number,
): Promise<string> {
  const q = await quoteSwap({ inputMint, outputMint, amount, slippageBps: 50 });
  if (!q.ok) throw new Error(q.reason);
  const built = await buildSwapTx(q.quote, kp.publicKey.toBase58());
  if (!built.ok) throw new Error(built.reason);
  return signAndSend(conn, kp, built.transaction);
}

async function skimFee(conn: Connection, kp: Keypair, clipUsd: number, solUsd: number): Promise<void> {
  const treasury = treasuryAddress();
  if (!treasury || !(clipUsd > 0) || !(solUsd > 0)) return;
  const sol = (clipUsd * (PROTOCOL_FEE_BPS / 10_000)) / solUsd;
  if (sol < 0.00002) return;
  const { blockhash } = await conn.getLatestBlockhash();
  const tx = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: kp.publicKey,
      toPubkey: new PublicKey(treasury),
      lamports: Math.round(sol * LAMPORTS_PER_SOL),
    }),
  );
  tx.feePayer = kp.publicKey;
  tx.recentBlockhash = blockhash;
  tx.sign(kp);
  await conn.sendRawTransaction(tx.serialize(), { skipPreflight: false });
}

export async function executeIntentOnchain(opts: {
  kp: Keypair;
  intent: PairIntent;
  solUsd: number;
  spyxUsd: number;
  qqqxUsd: number;
  gldxUsd: number;
  holdings?: { spyxQty?: number; qqqxQty?: number; gldxQty?: number; usdcQty?: number };
}): Promise<string> {
  const legs = planIntentSwaps(opts);
  if (!legs.length) throw new Error("no live swap built");
  const conn = new Connection(rpcUrl(), { commitment: "confirmed" });
  let sig = "";
  for (const leg of legs) {
    sig = await swapLeg(conn, opts.kp, leg.inputMint, leg.outputMint, leg.amount);
  }
  try {
    await skimFee(conn, opts.kp, opts.intent.clipUsd, opts.solUsd);
  } catch {
    /* fee skim is best-effort */
  }
  return sig;
}

function noteFail(book: PaperBook, now: number, reason: string) {
  if (!book.tape) book.tape = [];
  pushBounded(
    book.tape,
    tapeOf(now, "skip", reason, {
      from: book.pendingIntent?.from,
      to: book.pendingIntent?.to,
      sizeUsd: book.pendingIntent?.clipUsd,
    }),
    200,
  );
  book.lastAction = `skip · ${reason}`;
  book.lastSkipReason = reason;
}

export async function fillLiveIntent(
  trader: TraderAccount,
  prices: PairPrices,
  now = Date.now(),
  mind?: Mind,
): Promise<{ ok: boolean; signature?: string; error?: string }> {
  const intent = trader.book.pendingIntent;
  if (!intent) return { ok: false, error: "no_intent" };
  if (trader.book.killed) return { ok: false, error: "killed" };
  const kp = await loadDelegatedKeypair(trader.owner);
  if (!kp) {
    trader.auto.liveDelegate = false;
    noteFail(trader.book, now, "24/7 live key missing. Enable 24/7 live again.");
    return { ok: false, error: "no_signer" };
  }
  if (trader.tradingPubkey && kp.publicKey.toBase58() !== trader.tradingPubkey) {
    noteFail(trader.book, now, "Delegated key does not match this trading wallet.");
    return { ok: false, error: "pubkey_mismatch" };
  }
  try {
    const h = trader.book.pair;
    const sig = await executeIntentOnchain({
      kp,
      intent,
      solUsd: prices.sol.usd,
      spyxUsd: prices.spyx.usd,
      qqqxUsd: prices.qqqx.usd,
      gldxUsd: prices.gldx.usd,
      holdings: h
        ? { spyxQty: h.spyxQty, qqqxQty: h.qqqxQty, gldxQty: h.gldxQty, usdcQty: h.usdcQty }
        : undefined,
    });
    applyPairDecision(trader.book, decisionFromIntent(intent, sig), prices, now, mind);
    return { ok: true, signature: sig };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "live send failed";
    noteFail(trader.book, now, `Live send failed. ${msg}`);
    return { ok: false, error: msg };
  }
}
