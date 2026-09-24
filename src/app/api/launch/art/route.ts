import { NextRequest, NextResponse } from "next/server";
import { clientIp, rateLimit } from "@/lib/security";
import { ipfsMetadataUrl, pinDataUrl, pinataConfigured } from "@/lib/pinata";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

/** Pin token art as soon as they crop — Pump.fun style. Launch then only signs. */
export async function POST(req: NextRequest) {
  try {
    if (!rateLimit(clientIp(req) + ":pin-art", 12, 60_000)) {
      return NextResponse.json({ error: "rate_limited" }, { status: 429 });
    }
    if (!pinataConfigured()) {
      return NextResponse.json({ error: "pin_failed", message: "Art upload is not configured." }, { status: 503 });
    }
    const body = (await req.json().catch(() => null)) as { image?: string; symbol?: string } | null;
    const image = typeof body?.image === "string" ? body.image : "";
    if (!image.startsWith("data:image/") || image.length < 64 || image.length > 400_000) {
      return NextResponse.json({ error: "bad_image" }, { status: 400 });
    }
    const symbol = (typeof body?.symbol === "string" ? body.symbol : "art").replace(/[^A-Za-z0-9]/g, "").slice(0, 10) || "art";
    const pinned = await pinDataUrl(image, symbol);
    if (!pinned?.cid) {
      return NextResponse.json({ error: "pin_failed", message: "Could not upload token art. Try the photo again." }, { status: 400 });
    }
    const mime = image.slice(5, image.indexOf(";")) || "image/jpeg";
    const ext = mime.includes("png") ? "png" : mime.includes("webp") ? "webp" : "jpg";
    return NextResponse.json({ ok: true, cid: pinned.cid, url: ipfsMetadataUrl(pinned.cid, ext) });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "pin_failed" }, { status: 500 });
  }
}
