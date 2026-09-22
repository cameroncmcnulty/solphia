import {
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  TransactionInstruction,
} from "@solana/web3.js";

/** Metaplex Token Metadata program. */
export const TOKEN_METADATA_PROGRAM_ID = new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");

export function metadataPda(mint: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("metadata"), TOKEN_METADATA_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    TOKEN_METADATA_PROGRAM_ID,
  )[0];
}

function borshString(s: string): Buffer {
  const b = Buffer.from(s, "utf8");
  const n = Buffer.alloc(4);
  n.writeUInt32LE(b.length, 0);
  return Buffer.concat([n, b]);
}

/** CreateMetadataAccountV3 so Phantom, Dexscreener, and Jupiter show name/image. */
export function createMetadataV3Ix(opts: {
  mint: PublicKey;
  mintAuthority: PublicKey;
  payer: PublicKey;
  updateAuthority: PublicKey;
  name: string;
  symbol: string;
  uri: string;
}): TransactionInstruction {
  const metadata = metadataPda(opts.mint);
  const seller = Buffer.alloc(2);
  seller.writeUInt16LE(0, 0);
  const data = Buffer.concat([
    Buffer.from([33]),
    borshString(opts.name.slice(0, 32)),
    borshString(opts.symbol.slice(0, 10)),
    borshString(opts.uri.slice(0, 200)),
    seller,
    Buffer.from([0]),
    Buffer.from([0]),
    Buffer.from([0]),
    Buffer.from([1]),
    Buffer.from([0]),
  ]);
  return new TransactionInstruction({
    programId: TOKEN_METADATA_PROGRAM_ID,
    keys: [
      { pubkey: metadata, isSigner: false, isWritable: true },
      { pubkey: opts.mint, isSigner: false, isWritable: false },
      { pubkey: opts.mintAuthority, isSigner: true, isWritable: false },
      { pubkey: opts.payer, isSigner: true, isWritable: true },
      { pubkey: opts.updateAuthority, isSigner: true, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
    ],
    data,
  });
}

function imageExt(url: string, mime?: string): "png" | "jpg" | "webp" | "gif" {
  const m = (mime || "").toLowerCase();
  if (m.includes("png")) return "png";
  if (m.includes("webp")) return "webp";
  if (m.includes("gif")) return "gif";
  if (m.includes("jpeg") || m.includes("jpg")) return "jpg";
  const path = url.split("?")[0].toLowerCase();
  if (path.endsWith(".png")) return "png";
  if (path.endsWith(".webp")) return "webp";
  if (path.endsWith(".gif")) return "gif";
  if (path.endsWith(".jpg") || path.endsWith(".jpeg")) return "jpg";
  return "png";
}

function imageMime(ext: string): string {
  if (ext === "jpg") return "image/jpeg";
  if (ext === "webp") return "image/webp";
  if (ext === "gif") return "image/gif";
  return "image/png";
}

/** Phantom uses ?ext= when the URI has no filename (IPFS CIDs). */
export function withImageExt(url: string, mime?: string): string {
  const raw = (url || "").trim();
  if (!raw || !/^https?:\/\//i.test(raw)) return raw;
  const ext = imageExt(raw, mime);
  try {
    const u = new URL(raw);
    if (!u.searchParams.get("ext")) u.searchParams.set("ext", ext);
    return u.toString();
  } catch {
    return raw.includes("?") ? `${raw}&ext=${ext}` : `${raw}?ext=${ext}`;
  }
}

export function tokenMetadataJson(opts: {
  name: string;
  symbol: string;
  description: string;
  image: string;
  website?: string;
  mime?: string;
}): Record<string, unknown> {
  const ext = imageExt(opts.image, opts.mime);
  const image = withImageExt(opts.image, opts.mime);
  const type = imageMime(ext);
  return {
    name: opts.name,
    symbol: opts.symbol,
    description: opts.description || opts.name,
    image,
    external_url: opts.website || "https://solphia.io",
    seller_fee_basis_points: 0,
    attributes: [],
    properties: {
      files: image ? [{ uri: image, type }] : [],
      category: "image",
    },
  };
}
