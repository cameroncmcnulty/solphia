import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import {
  createAssociatedTokenAccountIdempotentInstruction,
  createTransferCheckedInstruction,
  getAssociatedTokenAddressSync,
  getMint,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { rpcUrl } from "../config";
import { readyState } from "../store";
import { sphaMintOf } from "../token/solphia";
import { treasuryAddress } from "../treasury";
import { treasuryKeypair } from "../treasury/withdraw";
import { sendSignedTx } from "../tx/send";

function keypairFromEnv(raw: string): Keypair | null {
  const v = (raw || "").trim();
  if (!v) return null;
  try {
    if (v.startsWith("[")) {
      const arr = JSON.parse(v) as unknown;
      if (Array.isArray(arr) && (arr.length === 64 || arr.length === 32)) return Keypair.fromSecretKey(Uint8Array.from(arr.map(Number)));
    }
    const buf = Buffer.from(v, "base64");
    if (buf.length === 64 || buf.length === 32) return Keypair.fromSecretKey(new Uint8Array(buf));
  } catch {
    /* ignore */
  }
  return null;
}

export async function sendCircleDrop(
  to: string,
  amount: number,
): Promise<{ ok: true; signature: string } | { ok: false; error: string; message: string }> {
  const s = await readyState();
  const mint = sphaMintOf(s.sphaMint);
  const fromPk = s.airdropWallet || s.foundationWallet || treasuryAddress();
  const hot =
    keypairFromEnv(process.env.AIRDROP_SECRET || "") ||
    (() => {
      const t = treasuryKeypair();
      return t && t.publicKey.toBase58() === fromPk ? t : null;
    })();
  if (!hot || hot.publicKey.toBase58() !== fromPk) {
    return {
      ok: false,
      error: "no_signer",
      message: "Rewards are reserved. Set AIRDROP_SECRET for the airdrop wallet, or wait for the next drop release.",
    };
  }
  const conn = new Connection(rpcUrl(), "confirmed");
  const { blockhash } = await conn.getLatestBlockhash("confirmed");
  const toKey = new PublicKey(to);
  const fromKey = hot.publicKey;
  const tx = new Transaction();
  tx.feePayer = fromKey;
  tx.recentBlockhash = blockhash;
  if (mint) {
    try {
      const mintKey = new PublicKey(mint);
      const info = await getMint(conn, mintKey);
      const raw = BigInt(Math.floor(amount * 10 ** info.decimals));
      if (raw <= 0n) return { ok: false, error: "dust", message: "Amount is too small to send." };
      const src = getAssociatedTokenAddressSync(mintKey, fromKey);
      const dst = getAssociatedTokenAddressSync(mintKey, toKey);
      tx.add(createAssociatedTokenAccountIdempotentInstruction(fromKey, dst, toKey, mintKey, TOKEN_PROGRAM_ID));
      tx.add(createTransferCheckedInstruction(src, mintKey, dst, fromKey, raw, info.decimals, [], TOKEN_PROGRAM_ID));
    } catch (e) {
      return { ok: false, error: "token", message: e instanceof Error ? e.message : "Token transfer failed." };
    }
  } else {
    const lamports = Math.round(amount * LAMPORTS_PER_SOL);
    if (lamports < 1000) return { ok: false, error: "dust", message: "Amount is too small to send." };
    tx.add(SystemProgram.transfer({ fromPubkey: fromKey, toPubkey: toKey, lamports }));
  }
  tx.sign(hot);
  const sent = await sendSignedTx(tx, { conn });
  if (!sent.ok) return { ok: false, error: "send", message: sent.error };
  return { ok: true, signature: sent.signature };
}
