import { NextRequest, NextResponse } from "next/server";
import { clientIp, rateLimit } from "@/lib/security";
import { artCacheHeaders, artCandidates, fetchFirstImage } from "@/lib/token/art";

function allowed(raw: string): boolean {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return false;
  }
  if (u.protocol !== "https:") return false;
  const host = u.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) return false;
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) {
    const [a, b] = host.split(".").map(Number);
    if (a === 10 || a === 127 || a === 0 || (a === 192 && b === 168) || (a === 172 && (b || 0) >= 16 && (b || 0) <= 31) || (a === 169 && b === 254)) {
      return false;
    }
  }
  return true;
}

export async function serveTokenArt(req: NextRequest): Promise<NextResponse> {
  if (!rateLimit(clientIp(req) + ":token-art", 600, 60_000)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  const mint = (req.nextUrl.searchParams.get("m") || req.nextUrl.searchParams.get("mint") || "").trim();
  const raw = (req.nextUrl.searchParams.get("u") || "").trim();
  const urls = artCandidates(raw, mint).filter((u) => u.startsWith("https:") && allowed(u));
  if (!urls.length) return NextResponse.json({ error: "bad_url" }, { status: 400, headers: artCacheHeaders(false) });
  try {
    const got = await fetchFirstImage(urls);
    if (!got) {
      return NextResponse.json({ error: "fetch_failed" }, { status: 502, headers: artCacheHeaders(false) });
    }
    return new NextResponse(Buffer.from(got.body), {
      headers: {
        "content-type": got.mime,
        ...artCacheHeaders(true),
      },
    });
  } catch {
    return NextResponse.json({ error: "fetch_failed" }, { status: 502, headers: artCacheHeaders(false) });
  }
}
