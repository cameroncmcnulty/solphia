import { NextRequest, NextResponse } from "next/server";
import { sniffImageMime } from "@/lib/image/sniff";
import { renderTokenPng } from "@/lib/tools/tokenArt";
import { themeOf } from "@/lib/tools/identities";
import { findProjectByHandle } from "@/lib/tools/v3/project";
import { v3HandleOf } from "@/lib/tools/v3/host";

export const dynamic = "force-dynamic";

function asImage(bytes: Buffer, declared = ""): NextResponse | null {
  if (bytes.length < 32) return null;
  const mime = sniffImageMime(bytes, declared);
  if (!mime.startsWith("image/")) return null;
  return new NextResponse(new Uint8Array(bytes), {
    headers: { "content-type": mime, "cache-control": "public, max-age=3600" },
  });
}

async function serveRemote(url: string) {
  if (url.startsWith("data:image/")) {
    const comma = url.indexOf(",");
    if (comma < 0) return null;
    const meta = url.slice(5, comma);
    const declared = (meta.split(";")[0] || "image/png").trim();
    const bytes = Buffer.from(url.slice(comma + 1), "base64");
    return asImage(bytes, declared);
  }
  if (!url.startsWith("http")) return null;
  const r = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(12_000) });
  if (!r.ok) return null;
  const declared = (r.headers.get("content-type") || "").split(";")[0].trim();
  const bytes = Buffer.from(await r.arrayBuffer());
  return asImage(bytes, declared);
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
