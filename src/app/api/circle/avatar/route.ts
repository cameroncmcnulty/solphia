import { NextRequest, NextResponse } from "next/server";
import { isSolanaAddress, rateLimit, clientIp } from "@/lib/security";
import { readyState } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!rateLimit(clientIp(req) + ":circpfp", 80, 60_000)) {
    return new NextResponse(null, { status: 429 });
  }
  const pk = req.nextUrl.searchParams.get("pk") || "";
  if (!isSolanaAddress(pk)) return new NextResponse(null, { status: 404 });
  const s = await readyState();
  const kind = req.nextUrl.searchParams.get("kind") || "pfp";
  const pfp = (kind === "banner" ? s.launch?.accounts?.[pk]?.banner : s.launch?.accounts?.[pk]?.pfp) || "";
  if (!pfp) return new NextResponse(null, { status: 404 });
  if (/^https?:\/\//i.test(pfp)) {
    return NextResponse.redirect(pfp, 302);
  }
  const m = /^data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=\s]+)$/i.exec(pfp);
  if (!m) return new NextResponse(null, { status: 404 });
  const buf = Buffer.from(m[2], "base64");
  if (buf.length < 32) return new NextResponse(null, { status: 404 });
  return new NextResponse(buf, {
    headers: {
      "content-type": m[1],
      "cache-control": "public, max-age=120, stale-while-revalidate=600",
    },
  });
}
