import { NextRequest, NextResponse } from "next/server";
import { isSolanaAddress, rateLimit, clientIp } from "@/lib/security";
import { housePfpPath, PFP_SENTINEL } from "@/lib/launch/validate";
import { artCandidates, fetchFirstImage } from "@/lib/token/art";
import { withLaunch } from "@/lib/store";
import { getPfp, putPfp } from "@/lib/pfpStore";

export const dynamic = "force-dynamic";

const MISS = {
  "cache-control": "no-store",
  "cdn-cache-control": "no-store",
  "vercel-cdn-cache-control": "no-store",
};

function miss(status = 404) {
  return new NextResponse(null, { status, headers: MISS });
}

function serveData(pfp: string) {
  const m = /^data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=\s]+)$/i.exec(pfp);
  if (!m) return miss();
  const buf = Buffer.from(m[2], "base64");
  if (buf.length < 32) return miss();
  return new NextResponse(buf, {
    headers: {
      "content-type": m[1],
      "cache-control": "private, no-cache, no-store, must-revalidate",
      "cdn-cache-control": "no-store",
      "vercel-cdn-cache-control": "no-store",
    },
  });
}

export async function GET(req: NextRequest) {
  if (!rateLimit(clientIp(req) + ":circpfp", 800, 60_000)) {
    return miss(429);
  }
  const pk = req.nextUrl.searchParams.get("pk") || "";
  if (!isSolanaAddress(pk)) return miss();
  const kind = req.nextUrl.searchParams.get("kind") || "pfp";
  if (kind !== "banner") {
    const stored = await getPfp(pk);
    if (stored) return serveData(stored);
  }
  const s = await withLaunch((st) => st, false);
  const pfp = (kind === "banner" ? s.launch?.accounts?.[pk]?.banner : s.launch?.accounts?.[pk]?.pfp) || "";
  if (!pfp || pfp === PFP_SENTINEL) return miss();
  const house = housePfpPath(pfp);
  if (house) {
    return NextResponse.redirect(new URL(house, req.nextUrl.origin), 302);
  }
  if (pfp.startsWith("/api/media") || pfp.startsWith("/api/token-art") || pfp.startsWith("/api/circle/avatar")) {
    return NextResponse.redirect(new URL(pfp, req.nextUrl.origin), 302);
  }
  if (/^https?:\/\//i.test(pfp)) {
    const got = await fetchFirstImage(artCandidates(pfp), 4_000);
    if (!got) return miss();
    return new NextResponse(Buffer.from(got.body), {
      headers: {
        "content-type": got.mime,
        "cache-control": "public, max-age=120, stale-while-revalidate=600",
      },
    });
  }
  const served = serveData(pfp);
  if (served.status === 200 && kind !== "banner") {
    void putPfp(pk, pfp);
  }
  return served;
}
