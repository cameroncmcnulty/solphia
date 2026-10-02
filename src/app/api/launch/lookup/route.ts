import { NextRequest, NextResponse } from "next/server";
import { clientIp, isSolanaAddress, rateLimit } from "@/lib/security";
import { lookupMarketMint } from "@/lib/launch/market";
import { emptyLaunchBook, publicCoin } from "@/lib/launch/engine";
import { withLaunch } from "@/lib/store";
import { padCurveReady } from "@/lib/launch/program";
import { dbcEnabled } from "@/lib/launch/dbcIds";
import { lastPairPrices } from "@/lib/tick";
import { isPlaceholderLabel } from "@/lib/launch/labels";

export const dynamic = "force-dynamic";
export const maxDuration = 20;

export async function GET(req: NextRequest) {
  if (!rateLimit(clientIp(req) + ":lookup", 20, 60_000)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  const mint = (req.nextUrl.searchParams.get("mint") || "").trim();
  if (!isSolanaAddress(mint)) return NextResponse.json({ error: "bad_mint" }, { status: 400 });
  try {
    const solUsd = lastPairPrices().solUsd || 0;
    const s = await withLaunch((st) => st, false);
    const book = s.launch || emptyLaunchBook();
    const owned = book.coins.find((c) => c.mint === mint || c.id === mint);
    if (owned) {
      const coin = publicCoin(owned, solUsd);
      if (isPlaceholderLabel(coin.symbol) || isPlaceholderLabel(coin.name)) {
        const { readSplMeta } = await import("@/lib/token/onchainMeta");
        const meta = await readSplMeta(mint).catch(() => null);
        if (meta && (meta.symbol || meta.name)) {
          return NextResponse.json({
            coin: {
              ...coin,
              name: meta.name || coin.name,
              symbol: meta.symbol || coin.symbol,
              image: meta.image || coin.image,
            },
            solUsd,
          });
        }
      }
      return NextResponse.json({ coin, solUsd });
    }
    const dbc = dbcEnabled() ? await (await import("@/lib/launch/dbc")).dbcPoolByMint(mint) : null;
    if (dbc) {
      const { readSplMeta } = await import("@/lib/token/onchainMeta");
      const meta = await readSplMeta(mint).catch(() => null);
      return NextResponse.json({
        coin: {
          id: mint,
          mint,
          born: true,
          venue: "solphia",
          name: meta?.name || "",
          symbol: meta?.symbol || "",
          image: meta?.image || "",
          blurb: "",
          creator: String((dbc.account as any).poolState?.creator || (dbc.account as any).creator || ""),
          createdAt: Date.now(),
          status: "curve",
          priceSol: 0,
          marketCapSol: 0,
          marketCapUsd: 0,
          progress: 0,
          realSol: 0,
          holders: 0,
          fills: [],
          devRewardsSol: 0,
        },
        solUsd,
      });
    }
    const live = await padCurveReady(mint);
    if (live.ok) {
      return NextResponse.json({
        coin: {
          id: mint,
          mint,
          born: true,
          venue: "solphia",
          name: "Solphia curve",
          symbol: mint.slice(0, 4).toUpperCase(),
          blurb: "",
          creator: live.creator,
          createdAt: Date.now(),
          status: live.curve.phase === "graduated" ? "graduated" : "curve",
          priceSol: 0,
          marketCapSol: 0,
          marketCapUsd: 0,
          progress: 0,
          realSol: live.curve.realSol,
          holders: 0,
          fills: [],
          curve: live.curve,
          devRewardsSol: 0,
        },
        solUsd,
      });
    }
    const row = await lookupMarketMint(mint);
    if (row) {
      return NextResponse.json({
        coin: { ...row.coin, score: row.score, grade: row.grade },
        solUsd: row.solUsd,
      });
    }
    const { readSplMeta } = await import("@/lib/token/onchainMeta");
    const meta = await readSplMeta(mint).catch(() => null);
    const label = (meta?.symbol || meta?.name || mint.slice(0, 4)).replace(/^\$+/, "").toUpperCase() || mint.slice(0, 4).toUpperCase();
    return NextResponse.json({
      coin: {
        id: mint,
        mint,
        born: false,
        venue: "market",
        name: meta?.name || label,
        symbol: meta?.symbol || label,
        image: meta?.image || "",
        blurb: "",
        creator: "",
        createdAt: Date.now(),
        status: "curve",
        priceSol: 0,
        marketCapSol: 0,
        marketCapUsd: 0,
        progress: 0,
        realSol: 0,
        holders: 0,
        fills: [],
        devRewardsSol: 0,
      },
      solUsd,
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "lookup failed" }, { status: 502 });
  }
}
