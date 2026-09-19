import { PublicKey } from "@solana/web3.js";
import { PAD_PROGRAM_ID } from "./ids";

const MINT_SEED = new TextEncoder().encode("mint");

export function newMintNonce(): Uint8Array {
  const n = new Uint8Array(8);
  crypto.getRandomValues(n);
  return n;
}

export function mintPda(creator: string | PublicKey, nonce: Uint8Array): PublicKey {
  return PublicKey.findProgramAddressSync(
    [MINT_SEED, new PublicKey(creator).toBuffer(), Buffer.from(nonce)],
    new PublicKey(PAD_PROGRAM_ID),
  )[0];
}

export function nonceToB64(nonce: Uint8Array): string {
  return Buffer.from(nonce).toString("base64");
}

export function nonceFromB64(raw: string): Buffer | null {
  try {
    const b = Buffer.from(raw, "base64");
    return b.length === 8 ? b : null;
  } catch {
    return null;
  }
}
