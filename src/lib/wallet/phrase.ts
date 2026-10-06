import { Keypair } from "@solana/web3.js";
import { generateMnemonic, mnemonicToSeedSync, validateMnemonic } from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english.js";
import { b58dec, b58enc } from "./phantomBox";
import { deriveEd25519Seed, solanaPath } from "./hd";

export const PHRASE_WORDS = 12;

export function newPhrase(): string {
  return generateMnemonic(wordlist, 128);
}

export function normalizePhrase(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .join(" ");
}

export function phraseOk(raw: string): boolean {
  const phrase = normalizePhrase(raw);
  const n = phrase ? phrase.split(" ").length : 0;
  if (n !== 12 && n !== 24) return false;
  return validateMnemonic(phrase, wordlist);
}

export function phraseWords(raw: string): string[] {
  return normalizePhrase(raw).split(" ").filter(Boolean);
}

export function keypairFromPhrase(raw: string, account = 0): Keypair {
  const phrase = normalizePhrase(raw);
  if (!phraseOk(phrase)) throw new Error("That recovery phrase is not valid.");
  const seed = mnemonicToSeedSync(phrase);
  return Keypair.fromSeed(deriveEd25519Seed(seed, solanaPath(account)));
}

function asBytes(raw: string): Uint8Array | null {
  const t = raw.trim();
  if (!t) return null;
  if (t.startsWith("[")) {
    try {
      const arr = JSON.parse(t) as unknown;
      if (!Array.isArray(arr) || (arr.length !== 32 && arr.length !== 64)) return null;
      if (!arr.every((n) => typeof n === "number" && n >= 0 && n <= 255)) return null;
      return Uint8Array.from(arr);
    } catch {
      return null;
    }
  }
  if (/^[0-9a-fA-F]+$/.test(t) && (t.length === 64 || t.length === 128)) {
    const out = new Uint8Array(t.length / 2);
    for (let i = 0; i < out.length; i++) out[i] = parseInt(t.slice(i * 2, i * 2 + 2), 16);
    return out;
  }
  try {
    const b = b58dec(t);
    if (b.length === 32 || b.length === 64) return b;
  } catch {
    /* not b58 */
  }
  return null;
}

export function keypairFromSecret(raw: string): Keypair {
  const bytes = asBytes(raw);
  if (!bytes) throw new Error("Paste a recovery phrase or a Solana private key.");
  if (bytes.length === 32) return Keypair.fromSeed(bytes);
  if (bytes.length === 64) return Keypair.fromSecretKey(bytes);
  throw new Error("Private key must be 32 or 64 bytes.");
}

export function importKeypair(raw: string, account = 0): { keypair: Keypair; phrase?: string } {
  const text = raw.trim();
  if (!text) throw new Error("Paste a recovery phrase or a Solana private key.");
  if (phraseOk(text) || text.split(/\s+/).length >= 12) {
    const phrase = normalizePhrase(text);
    return { keypair: keypairFromPhrase(phrase, account), phrase };
  }
  return { keypair: keypairFromSecret(text) };
}

export function secretB58(secret: Uint8Array): string {
  return b58enc(secret);
}

export function pickConfirmSlots(wordCount: number, n = 3): number[] {
  const count = Math.max(0, Math.floor(wordCount));
  const take = Math.min(n, count);
  const slots = Array.from({ length: count }, (_, i) => i);
  for (let i = slots.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const a = slots[i]!;
    slots[i] = slots[j]!;
    slots[j] = a;
  }
  return slots.slice(0, take).sort((a, b) => a - b);
}

export function phraseFile(phrase: string, pubkey: string): string {
  return [
    "Solphia wallet recovery phrase",
    "Keep this file offline. Anyone with these words can spend your funds.",
    "Solphia never has a copy.",
    "",
    `Address: ${pubkey}`,
    "",
    normalizePhrase(phrase),
    "",
  ].join("\n");
}
