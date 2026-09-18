import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  VersionedTransaction,
} from "@solana/web3.js";
import {
  createBurnCheckedInstruction,
  getAccount,
  getAssociatedTokenAddressSync,
  getMint,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { rpcUrl } from "../config";
import { isSolanaAddress } from "../security";
import { quotePadSwap } from "../swap/pad";
import { assembleSwapTx } from "../swap/build";
import { treasuryAddress } from "../treasury";
import { treasuryKeypair } from "../treasury/withdraw";

export type BuybackResult =
  | { ok: true; swapSig: string; burnSig?: string; tokens: number; feeSol: number; mint: string }
  | { ok: false; error: string; message: string };

async function signSend(conn: Connection, kp: Keypair, b64: string): Promise<string> {
  const raw = Buffer.from(b64, "base64");
  try {
    const tx = VersionedTransaction.deserialize(raw);
    tx.sign([kp]);
    return conn.sendRawTransaction(tx.serialize(), { skipPreflight: false });
  } catch {
    const tx = Transaction.from(raw);
    tx.partialSign(kp);
    return conn.sendRawTransaction(tx.serialize(), { skipPreflight: false });
  }
}

/** Buy a CA with treasury SOL through the 1% router, then burn the tokens. */
export async function runBuybackBurn(opts: { mint: string; sol: number }): Promise<BuybackResult> {
  const mint = (opts.mint || "").trim();
  const sol = Number(opts.sol);
  if (!isSolanaAddress(mint)) return { ok: false, error: "bad_mint", message: "Set a real token CA to buy back." };
  if (!(sol >= 0.01)) return { ok: false, error: "bad_amount", message: "Use at least 0.01 SOL." };
  const kp = treasuryKeypair();
  const treasury = treasuryAddress();
  if (!kp || kp.publicKey.toBase58() !== treasury) {
    return {
      ok: false,
      error: "no_signer",
      message: "Set TREASURY_SECRET so the treasury can sign the buyback.",
    };
  }
  const owner = kp.publicKey.toBase58();
  const quoted = await quotePadSwap({ side: "buy", mint, amount: sol, skipFee: false });
  if (!quoted.ok) return { ok: false, error: "quote", message: quoted.reason };
  if (!quoted.quote) return { ok: false, error: "quote", message: "No Jupiter route for that mint." };
  const built = await assembleSwapTx({ owner, quote: quoted.quote, feeSol: quoted.feeSol });
  if (!built.ok) return { ok: false, error: "build", message: built.reason };
  const conn = new Connection(rpcUrl(), "confirmed");
  let swapSig: string;
  try {
    swapSig = await signSend(conn, kp, built.transaction);
    await conn.confirmTransaction(swapSig, "confirmed");
  } catch (e) {
    return { ok: false, error: "swap", message: e instanceof Error ? e.message : "Buyback swap failed." };
  }
  try {
    const mintKey = new PublicKey(mint);
    const info = await getMint(conn, mintKey);
    const ata = getAssociatedTokenAddressSync(mintKey, kp.publicKey, false, TOKEN_PROGRAM_ID);
    const acc = await getAccount(conn, ata);
    const raw = acc.amount;
    if (raw <= 0n) {
      return { ok: true, swapSig, tokens: 0, feeSol: quoted.feeSol, mint };
    }
    const { blockhash } = await conn.getLatestBlockhash("confirmed");
    const burn = new Transaction().add(
      createBurnCheckedInstruction(ata, mintKey, kp.publicKey, raw, info.decimals, [], TOKEN_PROGRAM_ID),
    );
    burn.feePayer = kp.publicKey;
    burn.recentBlockhash = blockhash;
    burn.sign(kp);
    const burnSig = await conn.sendRawTransaction(burn.serialize(), { skipPreflight: false });
    await conn.confirmTransaction(burnSig, "confirmed");
    const tokens = Number(raw) / 10 ** info.decimals;
    return { ok: true, swapSig, burnSig, tokens, feeSol: quoted.feeSol, mint };
  } catch {
    return {
      ok: true,
      swapSig,
      tokens: 0,
      feeSol: quoted.feeSol,
      mint,
    };
  }
}
