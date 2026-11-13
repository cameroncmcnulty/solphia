import { NextRequest, NextResponse } from "next/server";
import { loadCampaign } from "@/lib/tools/batchLaunch";
import { renderTokenPng } from "@/lib/tools/tokenArt";
import { themeOf } from "@/lib/tools/identities";

export const dynamic = "force-dynamic";

function parseId(raw: string): { id: string; symbol: string; theme: string } {
  const id = decodeURIComponent(raw || "").replace(/\.(png|svg)$/i, "").slice(0, 48);
  const parts = id.split("_");
  const head = parts[0] || "rneon";
  const symbol = (parts[1] || "COIN").replace(/[^A-Z0-9]/g, "").slice(0, 10) || "COIN";
  const theme = themeOf(head.slice(1) || symbol);
  return { id, symbol, theme };
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id: raw } = await ctx.params;
  const parsed = parseId(raw);
  let symbol = parsed.symbol;
  let theme = parsed.theme;
  try {
    const c = await loadCampaign();
    const hit = c.tokens.find((t) => t.id === parsed.id);
    if (hit) {
      symbol = hit.symbol;
      theme = hit.theme;
    }
  } catch {
    /* deterministic fallback */
  }
  const png = renderTokenPng(parsed.id, symbol, theme);
  return new NextResponse(new Uint8Array(png), {
    headers: {
      "content-type": "image/png",
      "cache-control": "public, max-age=86400, immutable",
    },
  });
}
