import {
  ComputeBudgetProgram,
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import {
  AuthorityType,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountIdempotentInstruction,
  createInitializeMint2Instruction,
  createMintToCheckedInstruction,
  createSetAuthorityInstruction,
  getAssociatedTokenAddressSync,
  getMinimumBalanceForRentExemptMint,
  unpackMint,
  MINT_SIZE,
} from "@solana/spl-token";
import {
  SPHA_DECIMALS,
  SPHA_SUPPLY,
  sphaAllocations,
  sphaRawAmount,
  sphaTeamLegs,
  type SphaAllocation,
  type SphaDestinations,
  type SphaNetwork,
} from "./omics";
import { createMetadataV3Ix } from "./metadata";
import { sphaHookExtraPda, sphaHookInitIx } from "./sphaHook";
import { tokenUiAmount } from "../solana/tokenBalance";

export function sphaRpc(network: SphaNetwork, mainnetRpc: string): string {
  if (network === "devnet") return "https://api.devnet.solana.com";
  return mainnetRpc;
}

export type LaunchTxSet = {
  mint: string;
  txs: Transaction[];
  allocations: SphaAllocation[];
};

export async function buildSphaLaunchTxs(opts: {
  conn: Connection;
  payer: string;
  mint: Keypair;
  dest: SphaDestinations;
  supply?: number;
  decimals?: number;
  name?: string;
  symbol?: string;
  uri?: string;
}): Promise<LaunchTxSet> {
  const payer = new PublicKey(opts.payer);
  const mint = opts.mint.publicKey;
  const decimals = opts.decimals ?? SPHA_DECIMALS;
  const supply = opts.supply ?? SPHA_SUPPLY;
  const allocations = sphaAllocations(opts.dest, supply);
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
    createInitializeMint2Instruction(mint, decimals, payer, payer, TOKEN_PROGRAM_ID),
  );
  create.feePayer = payer;
  create.recentBlockhash = blockhash;

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
        name: (opts.name || "Solphia").slice(0, 32),
        symbol: (opts.symbol || "SPHA").slice(0, 10),
        uri: opts.uri,
      }),
    );
  }
  for (const row of allocations) {
    const owner = new PublicKey(row.wallet);
    const ata = getAssociatedTokenAddressSync(mint, owner, false, TOKEN_PROGRAM_ID);
    seed.add(createAssociatedTokenAccountIdempotentInstruction(payer, ata, owner, mint, TOKEN_PROGRAM_ID));
    seed.add(createMintToCheckedInstruction(mint, ata, payer, sphaRawAmount(row.tokens, decimals), decimals, [], TOKEN_PROGRAM_ID));
  }

  const lock = new Transaction().add(
    createSetAuthorityInstruction(mint, payer, AuthorityType.MintTokens, null, [], TOKEN_PROGRAM_ID),
    createSetAuthorityInstruction(mint, payer, AuthorityType.FreezeAccount, null, [], TOKEN_PROGRAM_ID),
  );
  lock.feePayer = payer;
  lock.recentBlockhash = blockhash;

  return { mint: mint.toBase58(), txs: [create, seed, lock], allocations };
}

/** After DBC pool create: mint 8.6 / 9.7 / 4.6 into project wallets, then revoke mint (+ freeze if set). */
export async function buildSphaTeamMintTx(opts: {
  conn: Connection;
  payer: string;
  mint: string;
  dest: SphaDestinations;
}): Promise<{ transaction: Transaction; legs: { id: string; to: string; tokens: number }[] }> {
  const payer = new PublicKey(opts.payer);
  const mint = new PublicKey(opts.mint);
  const info = await opts.conn.getAccountInfo(mint, "confirmed");
  if (!info) throw new Error("Mint not on-chain yet.");
  const tokenProgram = info.owner.equals(TOKEN_2022_PROGRAM_ID) ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID;
  const mintState = unpackMint(mint, info, tokenProgram);
  const legs = sphaTeamLegs(opts.dest);
  if (!legs.length) throw new Error("Set owner, foundation, and treasury wallets first.");
  const supplyUi = Number(mintState.supply) / 10 ** mintState.decimals;
  let room = Math.max(0, SPHA_SUPPLY - supplyUi);
  const extraPda = tokenProgram.equals(TOKEN_2022_PROGRAM_ID) ? sphaHookExtraPda(mint) : null;
  const extraInfo = extraPda ? await opts.conn.getAccountInfo(extraPda, "confirmed") : null;
  const { blockhash, lastValidBlockHeight } = await opts.conn.getLatestBlockhash("confirmed");
  const tx = new Transaction().add(
    ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }),
    ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 50_000 }),
  );
  if (tokenProgram.equals(TOKEN_2022_PROGRAM_ID) && !extraInfo) tx.add(sphaHookInitIx(payer, mint));
  const minted: { id: string; to: string; tokens: number }[] = [];
  for (const leg of legs) {
    if (!(room > 0)) break;
    const have = await tokenUiAmount(opts.conn, leg.to, opts.mint);
    const need = Math.min(Math.max(0, Math.floor(leg.tokens - (have.amount || 0) + 1e-6)), Math.floor(room));
    if (!(need > 0)) continue;
    const owner = new PublicKey(leg.to);
    const ata = getAssociatedTokenAddressSync(mint, owner, false, tokenProgram);
    tx.add(createAssociatedTokenAccountIdempotentInstruction(payer, ata, owner, mint, tokenProgram));
    tx.add(createMintToCheckedInstruction(mint, ata, payer, sphaRawAmount(need, mintState.decimals), mintState.decimals, [], tokenProgram));
    minted.push({ id: leg.id, to: leg.to, tokens: need });
    room -= need;
  }
  if (mintState.mintAuthority && mintState.mintAuthority.equals(payer)) {
    tx.add(createSetAuthorityInstruction(mint, payer, AuthorityType.MintTokens, null, [], tokenProgram));
  }
  if (mintState.freezeAuthority && mintState.freezeAuthority.equals(payer)) {
    tx.add(createSetAuthorityInstruction(mint, payer, AuthorityType.FreezeAccount, null, [], tokenProgram));
  }
  if (tx.instructions.length <= 2) throw new Error("Team slices already minted.");
  tx.feePayer = payer;
  tx.recentBlockhash = blockhash;
  tx.lastValidBlockHeight = lastValidBlockHeight;
  return { transaction: tx, legs: minted.length ? minted : legs };
}

export function encodeTx(tx: Transaction | { serialize: (opts?: any) => Uint8Array | Buffer }): string {
  let bytes: Uint8Array;
  try {
    bytes = Uint8Array.from(tx.serialize({ requireAllSignatures: false, verifySignatures: false }) as Uint8Array);
  } catch {
    bytes = Uint8Array.from(tx.serialize() as Uint8Array);
  }
  return Buffer.from(bytes).toString("base64");
}
