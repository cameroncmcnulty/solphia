import { PublicKey, TransactionInstruction } from "@solana/web3.js";

export type PackedIx = {
  programId: string;
  keys: { pubkey: string; isSigner: boolean; isWritable: boolean }[];
  data: string;
};

export function packIx(ix: TransactionInstruction): PackedIx {
  return {
    programId: ix.programId.toBase58(),
    keys: ix.keys.map((k) => ({
      pubkey: k.pubkey.toBase58(),
      isSigner: k.isSigner,
      isWritable: k.isWritable,
    })),
    data: Buffer.from(ix.data).toString("base64"),
  };
}

export function unpackIx(p: PackedIx): TransactionInstruction {
  return new TransactionInstruction({
    programId: new PublicKey(p.programId),
    keys: p.keys.map((k) => ({
      pubkey: new PublicKey(k.pubkey),
      isSigner: k.isSigner,
      isWritable: k.isWritable,
    })),
    data: Buffer.from(p.data, "base64"),
  });
}
