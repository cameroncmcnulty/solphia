"use client";

import { Keypair, PublicKey, SystemProgram, Transaction, VersionedTransaction, LAMPORTS_PER_SOL } from "@solana/web3.js";

import { loadOwner as readOwner, persistOwner } from "./owner";
import { asTxB64, b64ToBytes, bytesToB64 } from "../solana/wire";
import { applyExtras, extraKeys, parseTx, serializeTx } from "../solana/extraSign";
import { inPhantomWebView, injectedProvider, openPhantomUl, waitForInjected, type PhAfter } from "./phantomConnect";

const SECRET = "solphia_trading_secret";

export function saveOwner(pubkey: string) {
  persistOwner(pubkey);
}

export function loadOwner(): string | null {
  return readOwner();
}

export function tradingKeypair(): Keypair {
  const raw = localStorage.getItem(SECRET);
  if (raw) return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(raw)));
  const kp = Keypair.generate();
  localStorage.setItem(SECRET, JSON.stringify(Array.from(kp.secretKey)));
  return kp;
}

export function tradingPubkey(): string {
  return tradingKeypair().publicKey.toBase58();
}

function toB64(bytes: Uint8Array): string {
  return bytesToB64(bytes);
}

export function exportSecret(): string {
  return toB64(tradingKeypair().secretKey);
}

export async function buildTransfer(from: string, to: string, sol: number): Promise<Transaction> {
  const { blockhash } = await fetch("/api/sol/blockhash").then((r) => r.json());
  const tx = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: new PublicKey(from),
      toPubkey: new PublicKey(to),
      lamports: Math.round(sol * LAMPORTS_PER_SOL),
    }),
  );
  tx.feePayer = new PublicKey(from);
  tx.recentBlockhash = blockhash;
  return tx;
}

export async function signAndSendSwap(transactionB64: string): Promise<string> {
  const kp = tradingKeypair();
  const raw = b64ToBytes(transactionB64);
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
  const b64 = toB64(signed);
  const r = await fetch("/api/sol/send", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ transaction: b64 }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error || "swap send failed");
  return j.signature as string;
}

/** 1% of clip, paid in SOL from the on-device trading wallet. Same skim as in-house swaps. */
export async function skimProtocolFee(treasury: string, clipUsd: number, solUsd: number): Promise<string | null> {
  if (!treasury || !(clipUsd > 0) || !(solUsd > 0)) return null;
  const sol = (clipUsd * 0.01) / solUsd;
  if (sol < 0.00002) return null;
  const kp = tradingKeypair();
  const tx = await buildTransfer(kp.publicKey.toBase58(), treasury, sol);
  tx.sign(kp);
  const b64 = toB64(tx.serialize());
  const r = await fetch("/api/sol/send", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ transaction: b64 }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error || "fee skim failed");
  return j.signature as string;
}

export async function withdrawToOwner(owner: string, sol: number): Promise<string> {
  return sendFromTrading(owner, sol);
}

async function sendFromTrading(to: string, sol: number): Promise<string> {
  const kp = tradingKeypair();
  const tx = await buildTransfer(kp.publicKey.toBase58(), to, sol);
  tx.sign(kp);
  const b64 = toB64(tx.serialize());
  const r = await fetch("/api/sol/send", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ transaction: b64 }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error || "send failed");
  return j.signature as string;
}

export function phantomProvider(): {
  isPhantom?: boolean;
  signAndSendTransaction: (tx: Transaction | VersionedTransaction) => Promise<{ signature?: string } | string>;
  signTransaction: (tx: Transaction | VersionedTransaction) => Promise<Transaction | VersionedTransaction>;
} | null {
  const p = injectedProvider();
  if (!p || typeof p.signTransaction !== "function") return null;
  return p as {
    isPhantom?: boolean;
    signAndSendTransaction: (tx: Transaction | VersionedTransaction) => Promise<{ signature?: string } | string>;
    signTransaction: (tx: Transaction | VersionedTransaction) => Promise<Transaction | VersionedTransaction>;
  };
}

export async function signAndSendPhantom(transactionB64: string): Promise<string> {
  return signPhantomAndSend(transactionB64);
}

/**
 * Phantom docs: one signer, signTransaction (so Blowfish can simulate), then we send.
 * Extra signers (mint keypairs) must be attached AFTER Phantom signs — never before.
 * https://docs.phantom.com/developer-powertools/domain-and-transaction-warnings
 */
export async function signLegacyTx(tx: Transaction, extra?: Keypair, after?: PhAfter): Promise<string> {
  const unsigned = tx.serialize({ requireAllSignatures: false, verifySignatures: false });
  return signPhantomAndSend(toB64(unsigned), extra, after);
}

export async function signPhantomAndSend(transactionB64: string, extra?: Keypair | Keypair[], after?: PhAfter): Promise<string> {
  const packed = asTxB64(transactionB64);
  const extras = extraKeys(extra);
  let provider = phantomProvider();
  if (!provider) {
    const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
    const mobile = /iPhone|iPad|iPod|Android/i.test(ua);
    await waitForInjected(inPhantomWebView() ? 8000 : mobile ? 1200 : 200);
    provider = phantomProvider();
  }
  if (provider) {
    const raw = b64ToBytes(packed);
    const tx = parseTx(raw);
    const fromPhantom = (await provider.signTransaction(tx as Transaction)) as Transaction | VersionedTransaction;
    applyExtras(fromPhantom, extras);
    return sendSignedB64(toB64(serializeTx(fromPhantom)));
  }
  if (inPhantomWebView()) {
    throw new Error("Phantom is open but isn't ready to sign. Pull down to refresh this tab, then tap Launch again.");
  }
  await openPhantomUl({
    packed,
    extraSecrets: extras.map((k) => toB64(k.secretKey)),
    after,
    pubkey: readOwner(),
  });
  throw new Error("PHANTOM_REDIRECT");
}

async function sendViaApi(b64: string): Promise<string> {
  const r = await fetch("/api/sol/send", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ transaction: b64 }),
    signal: AbortSignal.timeout(10_000),
  });
  const text = await r.text();
  let j: { error?: string; signature?: string } = {};
  try {
    j = JSON.parse(text) as { error?: string; signature?: string };
  } catch {
    throw new Error("Broadcast failed (" + r.status + ").");
  }
  if (!r.ok) throw new Error(typeof j.error === "string" ? j.error : "send failed");
  if (typeof j.signature !== "string" || !j.signature) throw new Error("Broadcast did not return a signature.");
  return j.signature;
}

async function sendSignedB64(b64: string): Promise<string> {
  let last = "send failed";
  for (let i = 0; i < 3; i++) {
    try {
      return await sendViaApi(b64);
    } catch (e) {
      last = e instanceof Error ? e.message : "send failed";
      if (/Access forbidden|403/.test(last)) break;
      await new Promise((r) => setTimeout(r, 400 * (i + 1)));
    }
  }
  throw new Error(last);
}

/** @deprecated pad launches are one-signer PDAs. Extra mint signer only for admin $SPHA. */
export async function signPumpLaunch(transactionB64: string, mint: Keypair): Promise<string> {
  return signPhantomAndSend(transactionB64, mint);
}

/** First-month seat: Phantom (owner) → treasury. */
export async function paySeatFromPhantom(owner: string, treasury: string, sol: number): Promise<string> {
  return signLegacyTx(await buildTransfer(owner, treasury, sol));
}

/** Later months: on-device trading wallet → treasury. No extra Phantom popup. */
export async function paySeatFromTrading(treasury: string, sol: number): Promise<string> {
  return sendFromTrading(treasury, sol);
}

export function importSecret(b64: string): string {
  const cleaned = b64.trim();
  const bytes = b64ToBytes(cleaned);
  if (bytes.length !== 64) throw new Error("Backup is not a 64-byte trading key.");
  const kp = Keypair.fromSecretKey(bytes);
  localStorage.setItem(SECRET, JSON.stringify(Array.from(kp.secretKey)));
  return kp.publicKey.toBase58();
}
