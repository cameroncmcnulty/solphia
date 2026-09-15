import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { withCircle } from "@/lib/store";
import { pinBytes, pinataConfigured } from "@/lib/pinata";
import { addPromo, ensureCircle } from "@/lib/circle/engine";
import { CIRCLE_PROMO_MAX } from "@/lib/circle/types";

export const dynamic = "force-dynamic";
export const maxDuration = 30;
export const runtime = "nodejs";

const MAX_BYTES = 1_200_000;

function isUpload(v: FormDataEntryValue | null): v is File {
  return Boolean(v) && typeof v === "object" && typeof (v as File).arrayBuffer === "function" && typeof (v as File).size === "number";
}

export async function POST(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  if (!pinataConfigured()) {
    return NextResponse.json({ error: "media_failed", message: "Image hosting is not configured yet." }, { status: 400 });
  }
  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const caption = String(form.get("caption") || "").slice(0, 80);
  const file = form.get("file");
  if (!isUpload(file) || file.size < 32) {
    return NextResponse.json({ error: "bad_media", message: "Pick a JPEG or PNG." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "too_big", message: "Image is too large." }, { status: 400 });
  }
  const peek = await withCircle((s) => ensureCircle(s.circle).promos.length, false);
  if (peek >= CIRCLE_PROMO_MAX) {
    return NextResponse.json({ error: "full", message: "All 30 promo spots are filled." }, { status: 400 });
  }
  const buf = Buffer.from(await file.arrayBuffer());
  const mime = ((file.type || "image/jpeg").split(";")[0] || "image/jpeg").trim();
  if (!/^image\/(jpeg|jpg|png|webp|gif)$/i.test(mime)) {
    return NextResponse.json({ error: "bad_media", message: "Use a JPEG, PNG, or WebP." }, { status: 400 });
  }
  const pinned = await pinBytes(buf, mime, "circle-promo");
  if (!pinned?.url) return NextResponse.json({ error: "media_failed", message: "Could not store that image." }, { status: 400 });
  const out = await withCircle((s) => {
    s.circle = ensureCircle(s.circle);
    return addPromo(s.circle, { url: pinned.url, caption });
  }, true);
  if (!out.ok) return NextResponse.json({ error: out.error, message: "Could not save that image." }, { status: 400 });
  return NextResponse.json({ ok: true, promo: out.promo });
}
