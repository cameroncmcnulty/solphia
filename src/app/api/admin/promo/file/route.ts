import fs from "fs";
import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin/auth";
import { promoPath, promoViewOk } from "@/lib/admin/promoFile";
import { loadState } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id") || "";
  const token = req.nextUrl.searchParams.get("t") || "";
  if (!isAdminRequest(req) && !promoViewOk(id, token)) {
    return NextResponse.json({ error: "admin_auth_required" }, { status: 401 });
  }
  const item = (loadState().promos || []).find((p) => p.id === id);
  if (!item) return NextResponse.json({ error: "missing" }, { status: 404 });
  if (item.file) {
    try {
      const buf = fs.readFileSync(promoPath(item.file));
      return new NextResponse(new Uint8Array(buf), {
        headers: {
          "content-type": item.mime || (item.kind === "video" ? "video/mp4" : "image/png"),
          "cache-control": "private, max-age=3600",
        },
      });
    } catch {
      /* fall through */
    }
  }
  if (item.remoteUrl) return NextResponse.redirect(item.remoteUrl);
  return NextResponse.json({ error: "missing_file" }, { status: 404 });
}
