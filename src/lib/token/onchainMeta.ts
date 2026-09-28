import { PublicKey } from "@solana/web3.js";
import { connection } from "../solana/connection";
import { metadataPda, parseMetaplexData } from "./metadata";
import { storedImage } from "../launch/validate";

export type SplMeta = { name: string; symbol: string; image: string; uri: string };

function looksLikeMintLabel(label: string, mint: string) {
  const a = (label || "").replace(/\s/g, "").toUpperCase();
  const b = mint.toUpperCase();
  if (!a) return true;
  if (a === "TOKEN" || a === "UNNAMED" || a === "TKN") return true;
  return b.startsWith(a) && a.length >= 4;
}

export function isPlaceholderMeta(name: string, image: string, mint: string) {
  if (looksLikeMintLabel(name, mint)) return true;
  if (!image || /solphia\.io\/og/i.test(image)) return true;
  return false;
}

export async function readSplMeta(mint: string): Promise<SplMeta | null> {
  try {
    const pk = new PublicKey(mint);
    const acc = await connection().getAccountInfo(metadataPda(pk), "confirmed");
    if (!acc?.data) return null;
    const parsed = parseMetaplexData(acc.data);
    if (!parsed) return null;
    let image = "";
    const uri = (parsed.uri || "").trim();
    if (uri.startsWith("https://") || uri.startsWith("http://")) {
      try {
        const r = await fetch(uri, { signal: AbortSignal.timeout(8_000) });
        const j = (await r.json().catch(() => null)) as { image?: string } | null;
        if (typeof j?.image === "string") image = storedImage(j.image) || j.image;
      } catch {
        /* uri may 404 */
      }
    }
    return {
      name: parsed.name.slice(0, 24) || mint.slice(0, 8),
      symbol: parsed.symbol.slice(0, 10).toUpperCase() || mint.slice(0, 6).toUpperCase(),
      image,
      uri,
    };
  } catch {
    return null;
  }
}
