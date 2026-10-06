import { createHmac } from "crypto";
import { Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import { connection } from "../solana/connection";
import { sendSignedTx, type SendResult } from "../tx/send";
import { isSolanaAddress } from "../security";

/** Leave enough for rent + the drain signature. */
export const VAULT_KEEP_LAMPORTS = 2_000_000;
const DUST_LAMPORTS = 5_000;

/**
 * HD fee vaults for creators / referrers only. Owner and treasury are in-house project wallets.
 * Seed is FEE_VAULT_SECRET, else LIVE_SIGNER_SECRET. Do not rotate the seed or addresses move.
 */
function vaultSeed(): string {
  return (process.env.FEE_VAULT_SECRET || process.env.LIVE_SIGNER_SECRET || "").trim();
}

export function vaultsConfigured(): boolean {
  return Boolean(vaultSeed());
}

export function feeVaultKeypair(owner: string, seed = vaultSeed()): Keypair | null {
  const s = (seed || "").trim();
  if (!s || !isSolanaAddress(owner)) return null;
  const digest = createHmac("sha256", s).update("solphia-fee-vault:v1:" + owner).digest();
  return Keypair.fromSeed(digest);
}

export function feeVaultAddress(owner: string, seed = vaultSeed()): string {
  return feeVaultKeypair(owner, seed)?.publicKey.toBase58() || "";
}

/** Pay this address, not the user's Phantom. Claim drains the vault in one transfer. */
export function payoutAddress(owner: string): string {
  if (!isSolanaAddress(owner)) return owner;
  return feeVaultAddress(owner) || owner;
}

export function vaultClaimableLamports(balanceLamports: number): number {
  return Math.max(0, Number(balanceLamports) || 0) - VAULT_KEEP_LAMPORTS > DUST_LAMPORTS
    ? Math.max(0, Number(balanceLamports) || 0) - VAULT_KEEP_LAMPORTS
    : 0;
}

export async function vaultBalanceLamports(owner: string): Promise<number> {
  const kp = feeVaultKeypair(owner);
  if (!kp) return 0;
  return connection().getBalance(kp.publicKey, "confirmed");
}

export async function vaultSnapshot(owner: string): Promise<{
  pk: string;
  sol: number;
  claimableSol: number;
} | null> {
  if (!vaultsConfigured() || !isSolanaAddress(owner)) return null;
  const kp = feeVaultKeypair(owner);
  if (!kp) return null;
  const lamports = await connection().getBalance(kp.publicKey, "confirmed");
  return {
    pk: kp.publicKey.toBase58(),
    sol: lamports / LAMPORTS_PER_SOL,
    claimableSol: vaultClaimableLamports(lamports) / LAMPORTS_PER_SOL,
  };
}

/**
 * One SystemProgram.transfer: vault → the paired Phantom.
 * Server-signed. Destination is locked to `owner` so a forged pubkey only pays that owner.
 */
export async function drainFeeVault(owner: string): Promise<SendResult & { sol: number; vaultPk: string }> {
  const empty = { ok: false as const, error: "empty", sol: 0, vaultPk: "" };
  const kp = feeVaultKeypair(owner);
  if (!kp || !isSolanaAddress(owner)) return empty;
  const from = kp.publicKey;
  const bal = await connection().getBalance(from, "confirmed");
  const lamports = vaultClaimableLamports(bal);
  if (lamports < DUST_LAMPORTS) return { ...empty, vaultPk: from.toBase58() };
  const { blockhash } = await connection().getLatestBlockhash("confirmed");
  const tx = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: from,
      toPubkey: new PublicKey(owner),
      lamports,
    }),
  );
  tx.feePayer = from;
  tx.recentBlockhash = blockhash;
  tx.sign(kp);
  const sent = await sendSignedTx(tx);
  if (!sent.ok) return { ok: false, error: sent.error, sol: 0, vaultPk: from.toBase58() };
  return { ok: true, signature: sent.signature, sol: lamports / LAMPORTS_PER_SOL, vaultPk: from.toBase58() };
}
