import { PublicKey } from "@solana/web3.js";
import { getTokenMetadata } from "@solana/spl-token";
import { connection } from "../solana/connection";
import { metadataPda, parseMetaplexData } from "./metadata";
import { storedImage } from "../launch/validate";
import { isPlaceholderLabel, looksLikeMintTicker } from "../launch/labels";
import { isSolanaAddress } from "../wallet/addr";

export type SplMeta = { name: string; symbol: string; image: string; uri: string };

export function isPlaceholderMeta(name: string, image: string, mint: string, symbol?: string) {
  if (looksLikeMintTicker(name, mint)) return true;
  if (symbol && looksLikeMintTicker(symbol, mint)) return true;
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

async function fillImage(out: Record<string, SplMeta>, pending: { mint: string; uri: string }[]) {
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
}

/** Batch Metaplex, then Token-2022 TokenMetadata. Never invent Token/TOKEN. */
export async function readSplMetas(mints: string[]): Promise<Record<string, SplMeta>> {
  const uniq = [...new Set(mints.map((m) => String(m || "").trim()).filter((m) => isSolanaAddress(m)))].slice(0, 16);
  if (!uniq.length) return {};
  const out: Record<string, SplMeta> = {};
  const pending: { mint: string; uri: string }[] = [];
  try {
    const accs = await connection().getMultipleAccountsInfo(
      uniq.map((m) => metadataPda(new PublicKey(m))),
      "confirmed",
    );
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
  } catch {
    /* Metaplex miss — Token-2022 metadata may still be on the mint */
  }

  const missing = uniq.filter((m) => !out[m]?.name && !out[m]?.symbol);
  if (missing.length) {
    const conn = connection();
    await Promise.all(
      missing.map(async (mint) => {
        try {
          const meta = await Promise.race([
            getTokenMetadata(conn, new PublicKey(mint)),
            new Promise<null>((resolve) => {
              setTimeout(() => resolve(null), 3_500);
            }),
          ]);
          if (!meta) return;
          const row = fromParsed({ name: meta.name || "", symbol: meta.symbol || "", uri: meta.uri || "" });
          if (!row.name && !row.symbol) return;
          out[mint] = row;
          if (row.uri.startsWith("http://") || row.uri.startsWith("https://")) pending.push({ mint, uri: row.uri });
        } catch {
          /* classic SPL or no TokenMetadata extension */
        }
      }),
    );
  }

  await fillImage(out, pending);
  return out;
}
