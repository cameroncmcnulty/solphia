import { NextRequest, NextResponse } from "next/server";
import { renderTokenPng } from "@/lib/tools/tokenArt";
import { themeOf } from "@/lib/tools/identities";
import { loadProject } from "@/lib/tools/v3/project";
import { v3HandleOf } from "@/lib/tools/v3/host";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ ticker: string }> }) {
  const { ticker } = await ctx.params;
  const handle = v3HandleOf(ticker);
  let symbol = handle.toUpperCase().slice(0, 10) || "COIN";
  let theme = themeOf(symbol);
  try {
    const p = await loadProject();
    if (p.handle === handle || p.symbol.toLowerCase() === handle) {
      symbol = p.symbol || symbol;
      theme = themeOf(p.themeId || p.name || symbol);
    }
  } catch {
    /* deterministic fallback */
  }
  const png = renderTokenPng(`v3_${handle}`, symbol, theme);
  return new NextResponse(new Uint8Array(png), {
    headers: {
      "content-type": "image/png",
      "cache-control": "public, max-age=3600",
    },
  });
}
