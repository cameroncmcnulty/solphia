import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { pinBytes, pinJson, pinataConfigured } from "@/lib/pinata";
import { tokenMetadataJson } from "@/lib/token/metadata";
import { SPHA_NAME, SPHA_SYMBOL } from "@/lib/token/omics";

export const dynamic = "force-dynamic";
export const maxDuration = 30;
export const runtime = "nodejs";

function isUpload(v: FormDataEntryValue | null): v is File {
  return Boolean(v) && typeof v === "object" && typeof (v as File).arrayBuffer === "function" && typeof (v as File).size === "number";
}

export async function POST(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  if (!pinataConfigured()) {
    return NextResponse.json({ error: "pinata", message: "Pinata is not configured." }, { status: 400 });
  }
  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const file = form.get("file");
  if (!isUpload(file) || file.size < 32 || file.size > 900_000) {
    return NextResponse.json({ error: "bad_image", message: "Use a JPEG or PNG under 900 KB." }, { status: 400 });
  }
  const name = String(form.get("name") || SPHA_NAME).slice(0, 32);
  const symbol = String(form.get("symbol") || SPHA_SYMBOL).slice(0, 10);
  const blurb = String(form.get("blurb") || "").slice(0, 280);
  const website = String(form.get("website") || "https://solphia.io").slice(0, 160);
  const buf = Buffer.from(await file.arrayBuffer());
  const mime = ((file.type || "image/jpeg").split(";")[0] || "image/jpeg").trim();
  const pinned = await pinBytes(buf, mime, "spha-art");
  if (!pinned?.url) return NextResponse.json({ error: "pin_image", message: "Could not pin the token art." }, { status: 400 });
  const meta = await pinJson(
    tokenMetadataJson({ name, symbol, description: blurb || `${name} · ${symbol}`, image: pinned.url, website }),
    "spha-meta",
  );
  if (!meta?.url) return NextResponse.json({ error: "pin_meta", message: "Could not pin token metadata." }, { status: 400 });
  return NextResponse.json({ ok: true, image: pinned.url, uri: meta.url });
}
