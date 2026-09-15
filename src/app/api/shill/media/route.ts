import { NextRequest, NextResponse } from "next/server";
import { clientIp, isSolanaAddress, rateLimit } from "@/lib/security";
import { withShill } from "@/lib/store";
import { pinBytes, pinataConfigured } from "@/lib/pinata";
import { ensureShill, postShill } from "@/lib/shill/engine";

export const dynamic = "force-dynamic";
export const maxDuration = 30;
export const runtime = "nodejs";

const MAX_BYTES = 900_000;

function isUpload(v: FormDataEntryValue | null): v is File {
  return Boolean(v) && typeof v === "object" && typeof (v as File).arrayBuffer === "function" && typeof (v as File).size === "number";
}

export async function POST(req: NextRequest) {
  if (!rateLimit(clientIp(req) + ":shillmedia", 12, 60_000)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  if (!pinataConfigured()) {
    return NextResponse.json({ error: "media_failed", message: "Image hosting is not configured yet." }, { status: 400 });
  }
  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const pubkey = String(form.get("pubkey") || "");
  const replyTo = String(form.get("replyTo") || "") || undefined;
  const file = form.get("file");
  if (!isSolanaAddress(pubkey) || !isUpload(file) || file.size < 32) {
    return NextResponse.json({ error: "bad_media", message: "Pick a JPEG or PNG photo." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "too_big", message: "Compress the image first." }, { status: 400 });
  }
  const buf = Buffer.from(await file.arrayBuffer());
  const mime = ((file.type || "image/jpeg").split(";")[0] || "image/jpeg").trim();
  if (!/^image\/(jpeg|jpg|png|webp|gif)$/i.test(mime)) {
    return NextResponse.json({ error: "bad_media", message: "Use a JPEG, PNG, or WebP photo." }, { status: 400 });
  }
  const pinned = await pinBytes(buf, mime, "shill");
  if (!pinned?.url) {
    return NextResponse.json({ error: "media_failed", message: "Could not store that image. Try a smaller photo." }, { status: 400 });
  }
  const posted = await withShill((s) => {
    s.shill = ensureShill(s.shill);
    return postShill(s.shill, { owner: pubkey, kind: "media", media: pinned.url, replyTo });
  }, true);
  if (!posted.ok) return NextResponse.json({ error: posted.error, waitMs: posted.waitMs }, { status: 400 });
  return NextResponse.json({ ok: true, message: posted.message });
}
