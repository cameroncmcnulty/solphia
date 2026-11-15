import { NextRequest, NextResponse } from "next/server";
import { tokenMetadataJson } from "@/lib/token/metadata";
import { SNIPER_CREATED_ON } from "@/lib/tools/identities";
import { findProjectByHandle, artUrl } from "@/lib/tools/v3/project";
import { v3HandleOf, v3WebsiteOf } from "@/lib/tools/v3/host";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ ticker: string }> }) {
  const { ticker } = await ctx.params;
  const handle = v3HandleOf(ticker);
  const p = await findProjectByHandle(handle).catch(() => null);
  const match = Boolean(p?.id);
  const symbol = match && p ? p.symbol : handle.toUpperCase().slice(0, 10) || "COIN";
  const name = match && p ? p.name : symbol;
  const image = match && p?.image ? p.image : artUrl(handle);
  const json = tokenMetadataJson({
    name,
    symbol,
    description: match && p ? p.blurb || p.tagline || `${name} on Solana.` : `${name} on Solana.`,
    image,
    website: match && p ? p.website : v3WebsiteOf(symbol),
    x: match && p ? p.x : "",
    telegram: match && p ? p.telegram : "",
    createdOn: SNIPER_CREATED_ON,
  });
  return NextResponse.json(json, {
    headers: { "cache-control": "public, max-age=60" },
  });
}
