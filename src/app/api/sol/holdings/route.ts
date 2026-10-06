import { NextRequest, NextResponse } from "next/server";
import { Connection, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { clientIp, isSolanaAddress, rateLimit } from "@/lib/security";
import { rpcUrl } from "@/lib/config";
import { TOKEN_2022_PROGRAM, TOKEN_PROGRAM } from "@/lib/solana/tokenBalance";
import { readSplMetas } from "@/lib/token/onchainMeta";
import { SOL_MINT } from "@/lib/pair/mints";
import { lastPairPrices } from "@/lib/tick";
import { emptyLaunchBook } from "@/lib/launch/engine";
import { withLaunch } from "@/lib/store";
import { sphaMintOf } from "@/lib/token/solphia";

export const dynamic = "force-dynamic";
export const maxDuration = 20;

type Holding = {
  mint: string;
  amount: number;
  decimals: number;
  name: string;
  symbol: string;
  image: string;
  usd: number | null;
  change24h: number | null;
  born: boolean;
  sol: boolean;
};

function parsedTokenRows(values: { pubkey: PublicKey; account: { data: unknown } }[]) {
  const out: { mint: string; amount: number; decimals: number }[] = [];
  for (const row of values) {
    const data = row.account.data as {
      parsed?: { info?: { mint?: string; tokenAmount?: { uiAmount?: number; decimals?: number } } };
    };
    const info = data?.parsed?.info;
    const mint = info?.mint || "";
    const amount = Number(info?.tokenAmount?.uiAmount) || 0;
    if (!mint || !(amount > 0)) continue;
    out.push({ mint, amount, decimals: Number(info?.tokenAmount?.decimals) || 0 });
  }
  return out;
}

async function jupPrices(mints: string[]): Promise<Record<string, { usd: number; change24h: number | null }>> {
  const ids = [...new Set(mints)].filter((m) => isSolanaAddress(m)).slice(0, 80);
  if (!ids.length) return {};
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 1500);
  try {
    const r = await fetch(`https://lite-api.jup.ag/price/v2?ids=${ids.map(encodeURIComponent).join(",")}&showExtraInfo=true`, {
      cache: "no-store",
      headers: { accept: "application/json" },
      signal: ctrl.signal,
    });
    const j = (await r.json().catch(() => null)) as {
      data?: Record<string, { price?: string | number; extraInfo?: { lastSwappedPrice?: { lastJupiterSellAt?: number; lastJupiterSellPrice?: string } } }>;
    } | null;
    const out: Record<string, { usd: number; change24h: number | null }> = {};
    for (const [mint, row] of Object.entries(j?.data || {})) {
      const usd = Number(row?.price);
      if (!(usd > 0)) continue;
      out[mint] = { usd, change24h: null };
    }
    return out;
  } catch {
    return {};
  } finally {
    clearTimeout(t);
  }
}

export async function GET(req: NextRequest) {
  if (!rateLimit(clientIp(req) + ":holdings", 20, 60_000)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  const pubkey = (req.nextUrl.searchParams.get("pubkey") || "").trim();
  if (!isSolanaAddress(pubkey)) return NextResponse.json({ error: "bad_pubkey" }, { status: 400 });
  try {
    const conn = new Connection(rpcUrl(), { commitment: "confirmed" });
    const owner = new PublicKey(pubkey);
    const [lamports, legacy, t22, state] = await Promise.all([
      conn.getBalance(owner),
      conn.getParsedTokenAccountsByOwner(owner, { programId: new PublicKey(TOKEN_PROGRAM) }),
      conn.getParsedTokenAccountsByOwner(owner, { programId: new PublicKey(TOKEN_2022_PROGRAM) }),
      withLaunch((s) => s, false).catch(() => null),
    ]);
    const launch = state?.launch || emptyLaunchBook();
    const born = new Set((launch.coins || []).map((c) => c.mint).filter(Boolean) as string[]);
    const spha = sphaMintOf(state?.sphaMint);
    const tokens = parsedTokenRows([...legacy.value, ...t22.value]);
    const merged = new Map<string, { amount: number; decimals: number }>();
    for (const row of tokens) {
      const prev = merged.get(row.mint);
      if (!prev) merged.set(row.mint, { amount: row.amount, decimals: row.decimals });
      else prev.amount += row.amount;
    }
    const mints = [...merged.keys()];
    const metaChunks: string[][] = [];
    for (let i = 0; i < mints.length && i < 48; i += 16) metaChunks.push(mints.slice(i, i + 16));
    const [metaParts, prices] = await Promise.all([
      Promise.all(metaChunks.map((chunk) => readSplMetas(chunk))),
      jupPrices([SOL_MINT, ...mints.slice(0, 79)]),
    ]);
    const meta: Record<string, { name: string; symbol: string; image: string }> = {};
    for (const part of metaParts) Object.assign(meta, part);
    const solUsd = prices[SOL_MINT]?.usd || lastPairPrices().solUsd || 0;
    const rows: Holding[] = [
      {
        mint: SOL_MINT,
        amount: lamports / LAMPORTS_PER_SOL,
        decimals: 9,
        name: "Solana",
        symbol: "SOL",
        image: "",
        usd: solUsd > 0 ? (lamports / LAMPORTS_PER_SOL) * solUsd : null,
        change24h: prices[SOL_MINT]?.change24h ?? null,
        born: false,
        sol: true,
      },
    ];
    for (const [mint, bal] of merged) {
      const info = meta[mint];
      const px = prices[mint]?.usd;
      const coin = (launch.coins || []).find((c) => c.mint === mint);
      rows.push({
        mint,
        amount: bal.amount,
        decimals: bal.decimals,
        name: info?.name || coin?.name || "",
        symbol: info?.symbol || coin?.symbol || "",
        image: info?.image || coin?.image || "",
        usd: px && px > 0 ? bal.amount * px : null,
        change24h: prices[mint]?.change24h ?? null,
        born: born.has(mint) || mint === spha,
        sol: false,
      });
    }
    return NextResponse.json({
      pubkey,
      sol: lamports / LAMPORTS_PER_SOL,
      solUsd,
      holdings: rows,
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "rpc" }, { status: 502 });
  }
}
