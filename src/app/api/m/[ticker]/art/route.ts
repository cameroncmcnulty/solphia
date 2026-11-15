import { NextRequest, NextResponse } from "next/server";
import { renderTokenPng } from "@/lib/tools/tokenArt";
import { themeOf } from "@/lib/tools/identities";
import { findProjectByHandle } from "@/lib/tools/v3/project";
import { v3HandleOf } from "@/lib/tools/v3/host";

export const dynamic = "force-dynamic";

async function serveRemote(url: string) {
  if (url.startsWith("data:image/")) {
    const comma = url.indexOf(",");
    const meta = url.slice(5, comma);
    const mime = (meta.split(";")[0] || "image/png").trim();
    const bytes = Buffer.from(url.slice(comma + 1), "base64");
    return new NextResponse(new Uint8Array(bytes), {
      headers: { "content-type": mime, "cache-control": "public, max-age=3600" },
    });
  }
  if (!url.startsWith("http")) return null;
  const r = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(12_000) });
  if (!r.ok) return null;
  const mime = (r.headers.get("content-type") || "image/png").split(";")[0].trim() || "image/png";
  const bytes = Buffer.from(await r.arrayBuffer());
  return new NextResponse(new Uint8Array(bytes), {
    headers: { "content-type": mime, "cache-control": "public, max-age=3600" },
  });
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ ticker: string }> }) {
  const { ticker } = await ctx.params;
  const handle = v3HandleOf(ticker);
  const kind = req.nextUrl.searchParams.get("kind") === "hero" ? "hero" : "art";
  let symbol = handle.toUpperCase().slice(0, 10) || "COIN";
  let theme = themeOf(symbol);
  let remote = "";
  try {
    const p = await findProjectByHandle(handle);
    if (p) {
      symbol = p.symbol || symbol;
      theme = themeOf(p.themeId || p.name || symbol);
      remote = kind === "hero" ? p.heroImage || p.image : p.image;
    }
  } catch {
    /* deterministic fallback */
  }
  if (remote) {
    const served = await serveRemote(remote).catch(() => null);
    if (served) return served;
  }
  const png = renderTokenPng(`v3_${handle}`, symbol, theme);
  return new NextResponse(new Uint8Array(png), {
    headers: {
      "content-type": "image/png",
      "cache-control": "public, max-age=3600",
    },
  });
}
