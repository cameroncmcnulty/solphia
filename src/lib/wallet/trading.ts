"use client";

import { Keypair, PublicKey, SystemProgram, Transaction, LAMPORTS_PER_SOL } from "@solana/web3.js";

const SECRET = "solphia_trading_secret";
const OWNER = "solphia_owner";

export function saveOwner(pubkey: string) {
  localStorage.setItem(OWNER, pubkey);
}

export function loadOwner(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(OWNER);
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
  let s = "";
  bytes.forEach((b) => {
    s += String.fromCharCode(b);
  });
  return btoa(s);
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

export async function withdrawToOwner(owner: string, sol: number): Promise<string> {
  const kp = tradingKeypair();
  const tx = await buildTransfer(kp.publicKey.toBase58(), owner, sol);
  tx.sign(kp);
  const b64 = toB64(tx.serialize());
  const r = await fetch("/api/sol/send", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ transaction: b64 }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error || "withdraw failed");
  return j.signature;
}
