import { NextRequest, NextResponse } from "next/server";
import { SITE_URL } from "@/lib/config";
import { tokenMetadataJson } from "@/lib/token/metadata";
import { loadCampaign } from "@/lib/tools/batchLaunch";
import { themeOf } from "@/lib/tools/identities";

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
  try {
    const c = await loadCampaign();
    const hit = c.tokens.find((t) => t.id === parsed.id);
    if (hit) {
      name = hit.name;
      symbol = hit.symbol;
      blurb = hit.blurb;
      website = hit.website;
      x = hit.x;
      telegram = hit.telegram;
    }
  } catch {
    /* synthesized meta still works */
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
