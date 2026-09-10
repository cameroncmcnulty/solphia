import { NextRequest, NextResponse } from "next/server";
import { clientIp, rateLimit } from "@/lib/security";

export const dynamic = "force-dynamic";

function allowed(raw: string): URL | null {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return null;
  }
  if (u.protocol !== "https:") return null;
  const host = u.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) return null;
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) {
    const [a, b] = host.split(".").map(Number);
    if (a === 10 || a === 127 || a === 0 || (a === 192 && b === 168) || (a === 172 && b >= 16 && b <= 31) || (a === 169 && b === 254)) {
      return null;
    }
  }
  return u;
}

export async function GET(req: NextRequest) {
  if (!rateLimit(clientIp(req) + ":media", 240, 60_000)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  const target = allowed(req.nextUrl.searchParams.get("u") || "");
  if (!target) return NextResponse.json({ error: "bad_url" }, { status: 400 });
  try {
    const r = await fetch(target.toString(), {
      cache: "force-cache",
      headers: { accept: "image/*,*/*;q=0.8", "user-agent": "Solphia/1.0 (+https://solphia.io)" },
      signal: AbortSignal.timeout(7000),
      redirect: "follow",
    });
    if (!r.ok) return NextResponse.json({ error: "fetch_failed" }, { status: 502 });
    const mime = (r.headers.get("content-type") || "image/jpeg").split(";")[0].trim();
    if (!mime.startsWith("image/")) return NextResponse.json({ error: "not_image" }, { status: 400 });
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length > 2_500_000) return NextResponse.json({ error: "too_big" }, { status: 400 });
    return new NextResponse(buf, {
      headers: {
        "content-type": mime,
        "cache-control": "public, max-age=3600, s-maxage=86400",
      },
    });
  } catch {
    return NextResponse.json({ error: "fetch_failed" }, { status: 502 });
  }
}
