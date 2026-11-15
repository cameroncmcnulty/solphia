import { NextRequest, NextResponse } from "next/server";
import { SITE_URL } from "@/lib/config";
import { tokenMetadataJson } from "@/lib/token/metadata";
import { loadCampaign } from "@/lib/tools/batchLaunch";
import { loadCampaign as loadCampaignV2 } from "@/lib/tools/batchLaunchV2";
import { SNIPER_CREATED_ON, SNIPER_TELEGRAM, SNIPER_X, themeOf, tickerHandle } from "@/lib/tools/identities";

export const dynamic = "force-dynamic";

function parseId(raw: string) {
  const id = decodeURIComponent(raw || "").replace(/\.json$/i, "").slice(0, 48);
  const parts = id.split("_");
  const head = parts[0] || "rneon";
  const symbol = (parts[1] || "COIN").replace(/[^A-Z0-9]/g, "").slice(0, 10) || "COIN";
  return { id, symbol, theme: themeOf(head.slice(1) || symbol) };
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id: raw } = await ctx.params;
  const parsed = parseId(raw);
  let name = parsed.symbol.slice(0, 1) + parsed.symbol.slice(1).toLowerCase();
  let symbol = parsed.symbol;
  let blurb = `${name} on Solphia.`;
  let website = "https://solphia.io";
  let x: string | undefined;
  let telegram: string | undefined;
  let fromV2 = false;
  try {
    const c = await loadCampaign();
    const hit = c.tokens.find((t) => t.id === parsed.id);
    const v2 = hit ? null : (await loadCampaignV2()).tokens.find((t) => t.id === parsed.id);
    const row = hit || v2;
    fromV2 = Boolean(v2);
    if (row) {
      name = row.name;
      symbol = row.symbol;
      blurb = row.blurb;
      website = row.website;
      x = row.x;
      telegram = row.telegram;
    }
  } catch {
    /* synthesized meta still works */
  }
  if (fromV2) {
    website = website && website !== "https://solphia.io" ? website : `https://solphia.io/c/${tickerHandle(symbol)}`;
    x = x || SNIPER_X;
    telegram = telegram || SNIPER_TELEGRAM;
    if (!blurb.startsWith("$")) blurb = `$${symbol} ${blurb}`;
  }
  const image = `${SITE_URL.replace(/\/$/, "")}/api/tools/token-art/${encodeURIComponent(parsed.id)}`;
  const json = tokenMetadataJson({
    name,
    symbol,
    description: blurb,
    image,
    website,
    x,
    telegram,
    mime: "image/png",
    createdOn: fromV2 ? SNIPER_CREATED_ON : undefined,
  });
  const body = JSON.stringify(json);
  if (req.nextUrl.searchParams.get("ext") === "json" || raw.endsWith(".json")) {
    return new NextResponse(body, {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "public, max-age=300",
      },
    });
  }
  return NextResponse.json(json, {
    headers: { "cache-control": "public, max-age=300" },
  });
}
