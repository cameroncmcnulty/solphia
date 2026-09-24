import { Keypair, Transaction, VersionedTransaction } from "@solana/web3.js";
import { b64ToBytes, bytesToB64 } from "./wire";

export function parseTx(raw: Uint8Array): Transaction | VersionedTransaction {
  if (raw.length > 0 && (raw[0] & 0x80) !== 0) return VersionedTransaction.deserialize(raw);
  return Transaction.from(raw);
}

export function extraKeys(extra?: Keypair | Keypair[]): Keypair[] {
  if (!extra) return [];
  return Array.isArray(extra) ? extra.filter(Boolean) : [extra];
}

export function extrasFromSecrets(secrets?: string[]): Keypair[] {
  if (!secrets?.length) return [];
  const out: Keypair[] = [];
  for (const s of secrets) {
    try {
      out.push(Keypair.fromSecretKey(b64ToBytes(s)));
    } catch {
      /* skip bad secret */
    }
  }
  return out;
}

function requiredSignerSet(tx: Transaction | VersionedTransaction): Set<string> {
  const out = new Set<string>();
  if ("instructions" in tx && Array.isArray((tx as Transaction).instructions)) {
    for (const s of (tx as Transaction).signatures) {
      if (s.publicKey) out.add(s.publicKey.toBase58());
    }
    return out;
  }
  const msg = (tx as VersionedTransaction).message;
  const keys = "staticAccountKeys" in msg ? msg.staticAccountKeys : [];
  const n = "header" in msg ? msg.header.numRequiredSignatures : 0;
  for (let i = 0; i < n && i < keys.length; i++) out.add(keys[i]!.toBase58());
  return out;
}

function isLegacy(tx: Transaction | VersionedTransaction): tx is Transaction {
  return "instructions" in tx && Array.isArray((tx as Transaction).instructions);
}

/** Phantom signs first. Extra mint/config keys attach on the same object after. */
export function applyExtras(tx: Transaction | VersionedTransaction, extra?: Keypair | Keypair[]) {
  const need = requiredSignerSet(tx);
  const extras = extraKeys(extra).filter((k) => need.has(k.publicKey.toBase58()));
  if (!extras.length) return;
  if (isLegacy(tx)) {
    tx.partialSign(...extras);
    return;
  }
  tx.sign(extras);
}

function toBytes(ser: Uint8Array | number[]): Uint8Array {
  return ser instanceof Uint8Array ? ser : Uint8Array.from(ser);
}

export function serializeTx(tx: Transaction | VersionedTransaction): Uint8Array {
  if (typeof (tx as Transaction).serialize !== "function") {
    throw new Error("Phantom returned an unusable transaction.");
  }
  if (isLegacy(tx)) return toBytes(tx.serialize({ requireAllSignatures: true }));
  return toBytes((tx as VersionedTransaction).serialize());
}

export function signedTxB64(raw: Uint8Array, extra?: Keypair | Keypair[]): string {
  const tx = parseTx(raw);
  applyExtras(tx, extra);
  return bytesToB64(serializeTx(tx));
}
