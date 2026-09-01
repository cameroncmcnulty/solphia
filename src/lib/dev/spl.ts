import {
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountIdempotentInstruction,
  createBurnInstruction,
  createInitializeMint2Instruction,
  createMintToInstruction,
  createTransferInstruction,
  createSetAuthorityInstruction,
  getAssociatedTokenAddressSync,
  getMint,
  AuthorityType,
} from "@solana/spl-token";
import {
  Keypair,
  PublicKey,
  SystemProgram,
  TransactionInstruction,
  Connection,
} from "@solana/web3.js";

export function ata(mint: PublicKey, owner: PublicKey, program = TOKEN_PROGRAM_ID) {
  return getAssociatedTokenAddressSync(mint, owner, true, program, ASSOCIATED_TOKEN_PROGRAM_ID);
}

export function createSplMintIxs(opts: {
  payer: PublicKey;
  mint: Keypair;
  decimals: number;
  supplyRaw: bigint;
  revokeMint: boolean;
  revokeFreeze: boolean;
}): TransactionInstruction[] {
  const lamports = 1_461_600;
  const ixs: TransactionInstruction[] = [
    SystemProgram.createAccount({
      fromPubkey: opts.payer,
      newAccountPubkey: opts.mint.publicKey,
      space: 82,
      lamports,
      programId: TOKEN_PROGRAM_ID,
    }),
    createInitializeMint2Instruction(opts.mint.publicKey, opts.decimals, opts.payer, opts.payer, TOKEN_PROGRAM_ID),
  ];
  const dest = ata(opts.mint.publicKey, opts.payer);
  ixs.push(
    createAssociatedTokenAccountIdempotentInstruction(
      opts.payer,
      dest,
      opts.payer,
      opts.mint.publicKey,
      TOKEN_PROGRAM_ID,
    ),
  );
  if (opts.supplyRaw > 0n) {
    ixs.push(
      createMintToInstruction(opts.mint.publicKey, dest, opts.payer, opts.supplyRaw, [], TOKEN_PROGRAM_ID),
    );
  }
  if (opts.revokeMint) {
    ixs.push(
      createSetAuthorityInstruction(opts.mint.publicKey, opts.payer, AuthorityType.MintTokens, null, [], TOKEN_PROGRAM_ID),
    );
  }
  if (opts.revokeFreeze) {
    ixs.push(
      createSetAuthorityInstruction(opts.mint.publicKey, opts.payer, AuthorityType.FreezeAccount, null, [], TOKEN_PROGRAM_ID),
    );
  }
  return ixs;
}

export function transferIxs(opts: {
  payer: PublicKey;
  mint: PublicKey;
  destinations: { owner: PublicKey; amount: bigint }[];
  program?: PublicKey;
  authority?: PublicKey;
}): TransactionInstruction[] {
  const program = opts.program || TOKEN_PROGRAM_ID;
  const authority = opts.authority || opts.payer;
  const source = ata(opts.mint, authority, program);
  const ixs: TransactionInstruction[] = [];
  for (const d of opts.destinations) {
    const dest = ata(opts.mint, d.owner, program);
    ixs.push(
      createAssociatedTokenAccountIdempotentInstruction(opts.payer, dest, d.owner, opts.mint, program),
      createTransferInstruction(source, dest, authority, d.amount, [], program),
    );
  }
  return ixs;
}

export function burnIx(opts: { owner: PublicKey; mint: PublicKey; amount: bigint; program?: PublicKey }) {
  const program = opts.program || TOKEN_PROGRAM_ID;
  return createBurnInstruction(ata(opts.mint, opts.owner, program), opts.mint, opts.owner, opts.amount, [], program);
}

export function revokeIxs(opts: { owner: PublicKey; mint: PublicKey; mintAuth: boolean; freezeAuth: boolean }) {
  const ixs: TransactionInstruction[] = [];
  if (opts.mintAuth) {
    ixs.push(createSetAuthorityInstruction(opts.mint, opts.owner, AuthorityType.MintTokens, null));
  }
  if (opts.freezeAuth) {
    ixs.push(createSetAuthorityInstruction(opts.mint, opts.owner, AuthorityType.FreezeAccount, null));
  }
  return ixs;
}

export async function detectTokenProgram(conn: Connection, mint: PublicKey): Promise<PublicKey> {
  const info = await conn.getAccountInfo(mint);
  if (info?.owner.equals(TOKEN_2022_PROGRAM_ID)) return TOKEN_2022_PROGRAM_ID;
  return TOKEN_PROGRAM_ID;
}

export async function mintDecimals(conn: Connection, mint: PublicKey, program: PublicKey) {
  const m = await getMint(conn, mint, "confirmed", program);
  return m.decimals;
}

void TOKEN_2022_PROGRAM_ID;
