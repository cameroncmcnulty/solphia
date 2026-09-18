import { Connection, PublicKey, Transaction } from "@solana/web3.js";
import {
  createBurnCheckedInstruction,
  getAccount,
  getAssociatedTokenAddressSync,
  getMint,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { rpcUrl } from "../config";
import { isSolanaAddress } from "../security";
import { quotePadSwap, buildPadSwapTx, splitPadSpend } from "../swap/pad";
import { assembleSwapTx } from "../swap/build";
import { quoteOpenSwap } from "../pair/jupiter";
import { SOL_MINT } from "../pair/mints";
import { treasuryAddress } from "../treasury";
import { treasuryKeypair } from "../treasury/withdraw";
import { signSendAndConfirm, sendSignedTx } from "../tx/send";

export type BuybackResult =
  | { ok: true; swapSig: string; burnSig?: string; tokens: number; feeSol: number; mint: string }
  | { ok: false; error: string; message: string };

/** Buy a CA with treasury SOL through the pad curve when we own it, else the desk 1% router, then burn. */
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
  const conn = new Connection(rpcUrl(), "confirmed");

  const pad = await quotePadSwap({ side: "buy", mint, amount: sol, skipFee: false });
  let swapSig: string;
  let feeSol: number;
  if (pad.ok) {
    const built = await buildPadSwapTx({ owner, mint, side: "buy", amount: sol, creator: pad.creator });
    if (!built.ok) return { ok: false, error: "build", message: built.reason };
    const sent = await signSendAndConfirm(kp, built.transaction, { conn });
    if (!sent.ok) return { ok: false, error: "swap", message: sent.error };
    swapSig = sent.signature;
    feeSol = pad.feeSol;
  } else {
    const { feeSol: skim, swapSol } = splitPadSpend(sol);
    if (swapSol < 0.005) return { ok: false, error: "quote", message: "Amount is too small after the protocol fee." };
    const q = await quoteOpenSwap({
      inputMint: SOL_MINT,
      outputMint: mint,
      amount: swapSol,
      slippageBps: 100,
      inDecimals: 9,
    });
    if (!q.ok) return { ok: false, error: "quote", message: pad.reason || q.reason };
    const built = await assembleSwapTx({ owner, quote: q.quote, feeSol: skim });
    if (!built.ok) return { ok: false, error: "build", message: built.reason };
    const sent = await signSendAndConfirm(kp, built.transaction, { conn });
    if (!sent.ok) return { ok: false, error: "swap", message: sent.error };
    swapSig = sent.signature;
    feeSol = skim;
  }

  try {
    const mintKey = new PublicKey(mint);
    const info = await getMint(conn, mintKey);
    const ata = getAssociatedTokenAddressSync(mintKey, kp.publicKey, false, TOKEN_PROGRAM_ID);
    const acc = await getAccount(conn, ata);
    const raw = acc.amount;
    if (raw <= 0n) {
      return { ok: true, swapSig, tokens: 0, feeSol, mint };
    }
    const { blockhash } = await conn.getLatestBlockhash("confirmed");
    const burn = new Transaction().add(
      createBurnCheckedInstruction(ata, mintKey, kp.publicKey, raw, info.decimals, [], TOKEN_PROGRAM_ID),
    );
    burn.feePayer = kp.publicKey;
    burn.recentBlockhash = blockhash;
    burn.sign(kp);
    const burned = await sendSignedTx(burn, { conn });
    if (!burned.ok) {
      return { ok: true, swapSig, tokens: 0, feeSol, mint };
    }
    const tokens = Number(raw) / 10 ** info.decimals;
    return { ok: true, swapSig, burnSig: burned.signature, tokens, feeSol, mint };
  } catch {
    return {
      ok: true,
      swapSig,
      tokens: 0,
      feeSol,
      mint,
    };
  }
}
