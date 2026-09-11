import { Connection, Keypair, Transaction, VersionedTransaction } from "@solana/web3.js";
import { applyPairDecision, BOOK_TAPE_MAX, tapeOf } from "../pair/paper";
import { quoteBestRoute } from "../pair/jupiter";
import { USDC_MINT } from "../pair/mints";
import type { PairPrices } from "../pair/prices";
import { pushBounded } from "../store";
import type { Mind, PaperBook, PairIntent, TraderAccount } from "../types";
import { decisionFromIntent } from "./fill";
import { planIntentSwaps } from "./intent";
import { loadDelegatedKeypair } from "./signer";
import { assembleSwapTx } from "../swap/build";
import { protocolFeeSol } from "../swap/route";
import { BOT_SLIPPAGE_BPS, rpcUrl } from "../config";

export const MAX_LIVE_FILLS_PER_TICK = 2;

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

async function swapDirect(
  conn: Connection,
  kp: Keypair,
  inputMint: string,
  outputMint: string,
  amount: number,
  feeSol = 0,
): Promise<string> {
  const q = await quoteBestRoute({ inputMint, outputMint, amount, slippageBps: BOT_SLIPPAGE_BPS });
  if (!q.ok) throw new Error(q.reason);
  const built = await assembleSwapTx({ owner: kp.publicKey.toBase58(), quote: q.quote, feeSol });
  if (!built.ok) throw new Error(built.reason);
  return signAndSend(conn, kp, built.transaction);
}

async function swapLeg(
  conn: Connection,
  kp: Keypair,
  inputMint: string,
  outputMint: string,
  amount: number,
  feeSol = 0,
): Promise<string> {
  const q = await quoteBestRoute({ inputMint, outputMint, amount, slippageBps: BOT_SLIPPAGE_BPS });
  if (!q.ok) throw new Error(q.reason);
  if (q.viaUsdc && q.midAmount && q.midAmount > 0) {
    await swapDirect(conn, kp, inputMint, USDC_MINT, amount, feeSol);
    return swapDirect(conn, kp, USDC_MINT, outputMint, q.midAmount, 0);
  }
  return swapDirect(conn, kp, inputMint, outputMint, amount, feeSol);
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
  const feeSol = protocolFeeSol(opts.intent.clipUsd, opts.solUsd);
  let sig = "";
  for (let i = 0; i < legs.length; i++) {
    const leg = legs[i];
    sig = await swapLeg(conn, opts.kp, leg.inputMint, leg.outputMint, leg.amount, i === 0 ? feeSol : 0);
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
    BOOK_TAPE_MAX,
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
    noteFail(trader.book, now, "Live key missing. Turn her on again so the server can sign.");
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
