import { ipfsMetadataUrl, pinJson, pinataConfigured } from "../pinata";
import { tokenMetadataJson } from "./metadata";
import { SPHA_DEFAULT_IMAGE } from "./omics";

export { SPHA_DEFAULT_IMAGE };

/** DBC / Phantom / Dexscreener need a JSON document, not the marketing site. */
export function isTokenMetaUri(uri?: string): boolean {
  const u = (uri || "").trim();
  if (!/^https:\/\//i.test(u) || u.length > 255) return false;
  if (/^https:\/\/(www\.)?solphia\.io(\/|$)/i.test(u) && !/\/ipfs\//i.test(u) && !/\.json(\?|$)/i.test(u)) {
    return false;
  }
  return /\/ipfs\//i.test(u) || /\.json(\?|$)/i.test(u) || /[?&]ext=json\b/i.test(u);
}

export async function pinSphaTokenMeta(opts: {
  name: string;
  symbol: string;
  description?: string;
  image?: string;
  website?: string;
}): Promise<{ image: string; uri: string } | null> {
  if (!pinataConfigured()) return null;
  const image = /^https:\/\//i.test((opts.image || "").trim()) ? opts.image!.trim() : SPHA_DEFAULT_IMAGE;
  const meta = await pinJson(
    tokenMetadataJson({
      name: opts.name,
      symbol: opts.symbol,
      description: opts.description || `${opts.name} on Solphia`,
      image,
      website: opts.website || "https://solphia.io",
    }),
    `${opts.symbol}-meta`,
  );
  if (!meta?.cid) return null;
  return { image, uri: ipfsMetadataUrl(meta.cid, "json") };
}
