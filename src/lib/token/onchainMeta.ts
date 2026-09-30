import { PublicKey } from "@solana/web3.js";
import { connection } from "../solana/connection";
import { metadataPda, parseMetaplexData } from "./metadata";
import { storedImage } from "../launch/validate";
import { isPlaceholderLabel } from "../launch/labels";
import { isSolanaAddress } from "../wallet/addr";

export type SplMeta = { name: string; symbol: string; image: string; uri: string };

function looksLikeMintLabel(label: string, mint: string) {
  const a = (label || "").replace(/\s/g, "").replace(/^\$+/, "").toUpperCase();
  const b = mint.toUpperCase();
  if (!a) return true;
  if (isPlaceholderLabel(a)) return true;
  return b.startsWith(a) && a.length >= 4;
}

export function isPlaceholderMeta(name: string, image: string, mint: string, symbol?: string) {
  if (looksLikeMintLabel(name, mint)) return true;
  if (symbol && looksLikeMintLabel(symbol, mint)) return true;
  if (!image || /solphia\.io\/og/i.test(image)) return true;
  return false;
}

function fromParsed(parsed: { name: string; symbol: string; uri: string }, image = ""): SplMeta {
  const name = parsed.name.slice(0, 24);
  const symbol = parsed.symbol.slice(0, 10).toUpperCase();
  return {
    name: name && !isPlaceholderLabel(name) ? name : "",
    symbol: symbol && !isPlaceholderLabel(symbol) ? symbol : "",
    image,
    uri: (parsed.uri || "").trim(),
  };
}

export async function readSplMeta(mint: string): Promise<SplMeta | null> {
  const all = await readSplMetas([mint]);
  return all[mint] || null;
}

/** Batch Metaplex name/symbol/image. Never invent Token/TOKEN. */
export async function readSplMetas(mints: string[]): Promise<Record<string, SplMeta>> {
  const uniq = [...new Set(mints.map((m) => String(m || "").trim()).filter((m) => isSolanaAddress(m)))].slice(0, 16);
  if (!uniq.length) return {};
  const out: Record<string, SplMeta> = {};
  try {
    const accs = await connection().getMultipleAccountsInfo(
      uniq.map((m) => metadataPda(new PublicKey(m))),
      "confirmed",
    );
    const pending: { mint: string; uri: string }[] = [];
    for (let i = 0; i < uniq.length; i++) {
      const data = accs[i]?.data;
      if (!data) continue;
      const parsed = parseMetaplexData(data);
      if (!parsed) continue;
      const row = fromParsed(parsed);
      if (!row.name && !row.symbol) continue;
      out[uniq[i]] = row;
      if (row.uri.startsWith("http://") || row.uri.startsWith("https://")) pending.push({ mint: uniq[i], uri: row.uri });
    }
    await Promise.all(
      pending.map(async ({ mint, uri }) => {
        try {
          const r = await fetch(uri, { signal: AbortSignal.timeout(4_000) });
          const j = (await r.json().catch(() => null)) as { image?: string } | null;
          if (typeof j?.image === "string" && out[mint]) out[mint].image = storedImage(j.image) || j.image;
        } catch {
          /* uri may 404 */
        }
      }),
    );
  } catch {
    return out;
  }
  return out;
}
