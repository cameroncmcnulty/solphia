import { Connection, PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import {
  AuthorityType,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountIdempotentInstruction,
  createInitializeMint2Instruction,
  createMintToCheckedInstruction,
  createSetAuthorityInstruction,
  getAssociatedTokenAddressSync,
  getMint,
  getMinimumBalanceForRentExemptMint,
  MINT_SIZE,
} from "@solana/spl-token";
import { createMetadataV3Ix } from "../token/metadata";
import { TOKEN_SUPPLY } from "./curve";

export const PAD_DECIMALS = 6;
export const PAD_SUPPLY = TOKEN_SUPPLY;

export function padRawAmount(tokens: number, decimals = PAD_DECIMALS): bigint {
  let raw = 1n;
  for (let i = 0; i < decimals; i++) raw *= 10n;
  return BigInt(Math.floor(tokens)) * raw;
}

export async function buildPadMintTxs(opts: {
  conn: Connection;
  payer: string;
  mint: PublicKey;
  name: string;
  symbol: string;
  uri?: string;
}): Promise<{ mint: string; txs: Transaction[] }> {
  const payer = new PublicKey(opts.payer);
  const mint = opts.mint;
  const rent = await getMinimumBalanceForRentExemptMint(opts.conn);
  const { blockhash } = await opts.conn.getLatestBlockhash("confirmed");

  const create = new Transaction().add(
    SystemProgram.createAccount({
      fromPubkey: payer,
      newAccountPubkey: mint,
      space: MINT_SIZE,
      lamports: rent,
      programId: TOKEN_PROGRAM_ID,
    }),
    createInitializeMint2Instruction(mint, PAD_DECIMALS, payer, payer, TOKEN_PROGRAM_ID),
  );
  create.feePayer = payer;
  create.recentBlockhash = blockhash;

  const ata = getAssociatedTokenAddressSync(mint, payer, false, TOKEN_PROGRAM_ID);
  const seed = new Transaction();
  seed.feePayer = payer;
  seed.recentBlockhash = blockhash;
  if (opts.uri) {
    seed.add(
      createMetadataV3Ix({
        mint,
        mintAuthority: payer,
        payer,
        updateAuthority: payer,
        name: opts.name.slice(0, 32),
        symbol: opts.symbol.slice(0, 10),
        uri: opts.uri,
      }),
    );
  }
  seed.add(createAssociatedTokenAccountIdempotentInstruction(payer, ata, payer, mint, TOKEN_PROGRAM_ID));
  seed.add(
    createMintToCheckedInstruction(mint, ata, payer, padRawAmount(PAD_SUPPLY, PAD_DECIMALS), PAD_DECIMALS, [], TOKEN_PROGRAM_ID),
  );
  seed.add(createSetAuthorityInstruction(mint, payer, AuthorityType.MintTokens, null, [], TOKEN_PROGRAM_ID));
  seed.add(createSetAuthorityInstruction(mint, payer, AuthorityType.FreezeAccount, null, [], TOKEN_PROGRAM_ID));

  return { mint: mint.toBase58(), txs: [create, seed] };
}

export async function padMintReady(
  conn: Connection,
  mint: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const info = await getMint(conn, new PublicKey(mint), "confirmed");
    if (info.decimals !== PAD_DECIMALS) return { ok: false, error: "bad_decimals" };
    if (info.supply === 0n) return { ok: false, error: "mint_empty" };
    if (info.mintAuthority !== null) return { ok: false, error: "mint_not_locked" };
    return { ok: true };
  } catch {
    return { ok: false, error: "mint_missing" };
  }
}
