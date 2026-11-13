import {
  ComputeBudgetProgram,
  Connection,
  PublicKey,
  Transaction,
} from "@solana/web3.js";
import {
  AuthorityType,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountIdempotentInstruction,
  createMintToCheckedInstruction,
  createSetAuthorityInstruction,
  getAssociatedTokenAddressSync,
  unpackMint,
} from "@solana/spl-token";
import { sphaHookExtraPda, sphaHookInitIx } from "../token/sphaHook";
import { sphaRawAmount } from "../token/omics";
import { tokenUiAmount } from "../solana/tokenBalance";
import { BATCH_SUPPLY } from "./identities";

/** Mint the project slice into the launch wallet, then revoke mint + freeze. */
export async function buildProjectSliceMintTx(opts: {
  conn: Connection;
  payer: string;
  mint: string;
  to: string;
  tokens: number;
  supplyCap?: number;
}): Promise<{ transaction: Transaction; minted: number }> {
  const payer = new PublicKey(opts.payer);
  const mint = new PublicKey(opts.mint);
  const dest = new PublicKey(opts.to);
  const info = await opts.conn.getAccountInfo(mint, "confirmed");
  if (!info) throw new Error("Mint not on-chain yet.");
  const tokenProgram = info.owner.equals(TOKEN_2022_PROGRAM_ID) ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID;
  const mintState = unpackMint(mint, info, tokenProgram);
  const cap = opts.supplyCap ?? BATCH_SUPPLY;
  const supplyUi = Number(mintState.supply) / 10 ** mintState.decimals;
  const room = Math.max(0, cap - supplyUi);
  const need = Math.min(Math.max(0, Math.floor(opts.tokens)), Math.floor(room));
  if (!(need > 0)) throw new Error("Project slice already minted.");
  const extraPda = tokenProgram.equals(TOKEN_2022_PROGRAM_ID) ? sphaHookExtraPda(mint) : null;
  const extraInfo = extraPda ? await opts.conn.getAccountInfo(extraPda, "confirmed") : null;
  const { blockhash, lastValidBlockHeight } = await opts.conn.getLatestBlockhash("confirmed");
  const tx = new Transaction().add(
    ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }),
    ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 50_000 }),
  );
  if (tokenProgram.equals(TOKEN_2022_PROGRAM_ID) && !extraInfo) tx.add(sphaHookInitIx(payer, mint));
  const ata = getAssociatedTokenAddressSync(mint, dest, false, tokenProgram);
  tx.add(createAssociatedTokenAccountIdempotentInstruction(payer, ata, dest, mint, tokenProgram));
  tx.add(createMintToCheckedInstruction(mint, ata, payer, sphaRawAmount(need, mintState.decimals), mintState.decimals, [], tokenProgram));
  const have = await tokenUiAmount(opts.conn, opts.to, opts.mint);
  if ((have.amount || 0) >= need) {
    /* already there — still revoke if we can */
  }
  if (mintState.mintAuthority && mintState.mintAuthority.equals(payer)) {
    tx.add(createSetAuthorityInstruction(mint, payer, AuthorityType.MintTokens, null, [], tokenProgram));
  }
  if (mintState.freezeAuthority && mintState.freezeAuthority.equals(payer)) {
    tx.add(createSetAuthorityInstruction(mint, payer, AuthorityType.FreezeAccount, null, [], tokenProgram));
  }
  tx.feePayer = payer;
  tx.recentBlockhash = blockhash;
  tx.lastValidBlockHeight = lastValidBlockHeight;
  return { transaction: tx, minted: need };
}
