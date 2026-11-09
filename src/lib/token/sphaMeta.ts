import { ipfsMetadataUrl, pinJson, pinataConfigured } from "../pinata";
import { tokenMetadataJson } from "./metadata";
import { SPHA_DEFAULT_IMAGE } from "./omics";

export { SPHA_DEFAULT_IMAGE };

/** Hosted fallback so T-30 mint still has a JSON URI if Pinata is down. */
export const SPHA_FALLBACK_META_URI = "https://solphia.io/spha-meta.json";

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
  x?: string;
  telegram?: string;
  discord?: string;
}): Promise<{ image: string; uri: string } | null> {
  const image = /^https:\/\//i.test((opts.image || "").trim()) ? opts.image!.trim() : SPHA_DEFAULT_IMAGE;
  if (pinataConfigured()) {
    const meta = await pinJson(
      tokenMetadataJson({
        name: opts.name,
        symbol: opts.symbol,
        description: opts.description || `${opts.name} on Solphia`,
        image,
        website: opts.website || "https://solphia.io",
        x: opts.x,
        telegram: opts.telegram,
        discord: opts.discord,
      }),
      `${opts.symbol}-meta`,
    );
    if (meta?.cid) {
      const uri = ipfsMetadataUrl(meta.cid, "json");
      if (isTokenMetaUri(uri)) return { image, uri };
    }
  }
  return { image, uri: SPHA_FALLBACK_META_URI };
}
