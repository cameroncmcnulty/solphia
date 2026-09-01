"use client";

import { Keypair, PublicKey, Transaction, TransactionInstruction } from "@solana/web3.js";
import type { PackedIx } from "./ix";
import { unpackIx } from "./ix";

export type { PackedIx };
export { unpackIx };

type Provider = {
  publicKey?: { toString(): string };
  connect: () => Promise<{ publicKey: { toString(): string } }>;
  signTransaction?: (tx: Transaction) => Promise<Transaction>;
  signAndSendTransaction?: (tx: Transaction) => Promise<{ signature: string } | string>;
};

function pick(): Provider | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    phantom?: { solana?: Provider };
    solflare?: Provider;
    solana?: Provider;
  };
  return w.phantom?.solana || w.solflare || w.solana || null;
}

export async function connectedPubkey(): Promise<string> {
  const p = pick();
  if (!p) throw new Error("Open this page in Phantom or Solflare.");
  if (p.publicKey) return p.publicKey.toString();
  const res = await p.connect();
  return res.publicKey.toString();
}

export async function signAndSend(opts: {
  ixs: TransactionInstruction[];
  extraSigners?: Keypair[];
}): Promise<string> {
  const p = pick();
  if (!p) throw new Error("Open this page in Phantom or Solflare.");
  const payer = await connectedPubkey();
  const { blockhash } = await fetch("/api/sol/blockhash").then((r) => r.json());
  const tx = new Transaction();
  tx.feePayer = new PublicKey(payer);
  tx.recentBlockhash = blockhash;
  for (const ix of opts.ixs) tx.add(ix);
  if (opts.extraSigners?.length) tx.partialSign(...opts.extraSigners);

  if (p.signAndSendTransaction) {
    const sent = await p.signAndSendTransaction(tx);
    return typeof sent === "string" ? sent : sent.signature;
  }
  if (!p.signTransaction) throw new Error("Wallet cannot sign transactions.");
  const signed = await p.signTransaction(tx);
  const raw = signed.serialize();
  let s = "";
  raw.forEach((b) => {
    s += String.fromCharCode(b);
  });
  const r = await fetch("/api/sol/send", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ transaction: btoa(s) }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error || "send failed");
  return j.signature as string;
}

export function solscan(sig: string) {
  return `https://solscan.io/tx/${sig}`;
}
