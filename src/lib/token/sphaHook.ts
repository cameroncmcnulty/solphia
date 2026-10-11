import { PublicKey, SystemProgram, TransactionInstruction } from "@solana/web3.js";

/** No-op Token-2022 transfer hook. Lets official $SPHA keep mint authority at T0. */
export const SPHA_TRANSFER_HOOK = "8LWWfmNThfN6wkLKJbod6eoNceVCEdb3GXFYiPPp6xmx";

export function sphaHookExtraPda(mint: PublicKey, hook = new PublicKey(SPHA_TRANSFER_HOOK)): PublicKey {
  return PublicKey.findProgramAddressSync([Buffer.from("extra-account-metas"), mint.toBuffer()], hook)[0];
}

export function sphaHookInitIx(payer: PublicKey, mint: PublicKey): TransactionInstruction {
  const hook = new PublicKey(SPHA_TRANSFER_HOOK);
  return new TransactionInstruction({
    programId: hook,
    keys: [
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: sphaHookExtraPda(mint, hook), isSigner: false, isWritable: true },
      { pubkey: mint, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: Buffer.from([1]),
  });
}
