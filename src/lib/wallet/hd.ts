import { hmac } from "@noble/hashes/hmac";
import { sha512 } from "@noble/hashes/sha2";

const HARDENED = 0x80000000;
const MASTER = new TextEncoder().encode("ed25519 seed");

export const SOLANA_PATH = "m/44'/501'/0'/0'";

export function hardened(index: number): number {
  return (index | HARDENED) >>> 0;
}

/** Phantom / Solflare: m/44'/501'/account'/0' */
export function solanaPath(account = 0): number[] {
  return [hardened(44), hardened(501), hardened(account), hardened(0)];
}

function concat(a: Uint8Array, b: Uint8Array, c?: Uint8Array): Uint8Array {
  const out = new Uint8Array(a.length + b.length + (c?.length || 0));
  out.set(a, 0);
  out.set(b, a.length);
  if (c) out.set(c, a.length + b.length);
  return out;
}

function indexBytes(index: number): Uint8Array {
  const b = new Uint8Array(4);
  const n = index >>> 0;
  b[0] = (n >>> 24) & 0xff;
  b[1] = (n >>> 16) & 0xff;
  b[2] = (n >>> 8) & 0xff;
  b[3] = n & 0xff;
  return b;
}

type Node = { key: Uint8Array; chain: Uint8Array };

function master(seed: Uint8Array): Node {
  const I = hmac(sha512, MASTER, seed);
  return { key: I.slice(0, 32), chain: I.slice(32) };
}

function child(node: Node, index: number): Node {
  if (index < HARDENED) throw new Error("Solana derivation is hardened only.");
  const data = concat(new Uint8Array([0]), node.key, indexBytes(index));
  const I = hmac(sha512, node.chain, data);
  return { key: I.slice(0, 32), chain: I.slice(32) };
}

/** SLIP-0010 ed25519. Returns the 32-byte private seed for Keypair.fromSeed. */
export function deriveEd25519Seed(seed: Uint8Array, path: number[] = solanaPath(0)): Uint8Array {
  let node = master(seed);
  for (const index of path) node = child(node, index);
  return node.key;
}

export function parsePath(path: string): number[] {
  const raw = path.trim();
  if (!raw.startsWith("m/")) throw new Error("Bad derivation path.");
  return raw
    .slice(2)
    .split("/")
    .filter(Boolean)
    .map((part) => {
      const hard = part.endsWith("'") || part.endsWith("h");
      const n = Number(hard ? part.slice(0, -1) : part);
      if (!Number.isInteger(n) || n < 0) throw new Error("Bad derivation path.");
      return hard ? hardened(n) : n;
    });
}
