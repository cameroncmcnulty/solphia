import nacl from "tweetnacl";
import { decodeBase64, decodeUTF8 } from "tweetnacl-util";
import { PublicKey } from "@solana/web3.js";
import { isSolanaAddress } from "../security";

export function siwsMessage(pubkey: string, nonce: string, origin: string): string {
  return [
    "SOLPHIA wants you to sign in.",
    `Origin: ${origin}`,
    `Address: ${pubkey}`,
    `Nonce: ${nonce}`,
    "This proves wallet control. Solphia never asks for your seed.",
  ].join("\n");
}

export function verifySiws(pubkey: string, message: string, signatureB64: string): boolean {
  if (!isSolanaAddress(pubkey)) return false;
  try {
    const key = new PublicKey(pubkey).toBytes();
    const msg = decodeUTF8(message);
    let sig: Uint8Array;
    try {
      sig = decodeBase64(signatureB64);
    } catch {
      sig = Uint8Array.from(Buffer.from(signatureB64, "base64"));
    }
    if (sig.length !== 64) return false;
    return nacl.sign.detached.verify(msg, sig, key);
  } catch {
    return false;
  }
}
