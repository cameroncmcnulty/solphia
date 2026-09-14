import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import {
  AuthorityType,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountIdempotentInstruction,
  createInitializeMint2Instruction,
  createMintToCheckedInstruction,
  createSetAuthorityInstruction,
  getAssociatedTokenAddressSync,
  getMinimumBalanceForRentExemptMint,
  MINT_SIZE,
} from "@solana/spl-token";
import {
  SPHA_DECIMALS,
  SPHA_SUPPLY,
  sphaAllocations,
  sphaRawAmount,
  type SphaAllocation,
  type SphaDestinations,
  type SphaNetwork,
} from "./omics";
import { createMetadataV3Ix } from "./metadata";

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

export function encodeTx(tx: Transaction): string {
  return Buffer.from(tx.serialize({ requireAllSignatures: false, verifySignatures: false })).toString("base64");
}
