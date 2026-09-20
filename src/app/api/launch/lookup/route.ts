import { NextRequest, NextResponse } from "next/server";
import { clientIp, isSolanaAddress, rateLimit } from "@/lib/security";
import { lookupMarketMint } from "@/lib/launch/market";
import { emptyLaunchBook, publicCoin } from "@/lib/launch/engine";
import { withLaunch } from "@/lib/store";
import { padCurveReady } from "@/lib/launch/program";
import { dbcPoolByMint } from "@/lib/launch/dbc";
import { lastPairPrices } from "@/lib/tick";

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
      return NextResponse.json({ coin: publicCoin(owned, solUsd), solUsd });
    }
    const dbc = await dbcPoolByMint(mint);
    if (dbc) {
      return NextResponse.json({
        coin: {
          id: mint,
          mint,
          born: true,
          venue: "solphia",
          name: "Solphia curve",
          symbol: mint.slice(0, 4).toUpperCase(),
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
    if (!row) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json({
      coin: { ...row.coin, score: row.score, grade: row.grade },
      solUsd: row.solUsd,
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "lookup failed" }, { status: 502 });
  }
}
