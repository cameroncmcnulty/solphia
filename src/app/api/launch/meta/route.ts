import { NextRequest, NextResponse } from "next/server";
import { isSolanaAddress } from "@/lib/security";
import { withLaunch } from "@/lib/store";
import { tokenMetadataJson } from "@/lib/token/metadata";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const mint = req.nextUrl.searchParams.get("mint") || "";
  if (!isSolanaAddress(mint)) return NextResponse.json({ error: "bad_mint" }, { status: 400 });
  const s = await withLaunch((st) => st, false);
  const coin = (s.launch?.coins || []).find((c) => c.mint === mint);
  if (!coin) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json(
    tokenMetadataJson({
      name: coin.name,
      symbol: coin.symbol,
      description: coin.blurb || coin.name,
      image: coin.image || "",
      website: coin.links?.website,
    }),
  );
}
