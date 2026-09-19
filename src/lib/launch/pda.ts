import { PublicKey } from "@solana/web3.js";
import { PAD_PROGRAM_ID } from "./ids";

const MINT_SEED = new TextEncoder().encode("mint");

export function newMintNonce(): Uint8Array {
  const n = new Uint8Array(8);
  crypto.getRandomValues(n);
  return n;
}

function bytesToB64(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]!);
  return btoa(s);
}

function b64ToBytes(raw: string): Uint8Array | null {
  try {
    const bin = atob(raw);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  } catch {
    return null;
  }
}

export function mintPda(creator: string | PublicKey, nonce: Uint8Array): PublicKey {
  return PublicKey.findProgramAddressSync(
    [MINT_SEED, new PublicKey(creator).toBytes(), nonce],
    new PublicKey(PAD_PROGRAM_ID),
  )[0];
}

export function nonceToB64(nonce: Uint8Array): string {
  return bytesToB64(nonce);
}

export function nonceFromB64(raw: string): Uint8Array | null {
  const b = b64ToBytes((raw || "").trim());
  return b && b.length === 8 ? b : null;
}
