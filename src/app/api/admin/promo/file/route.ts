import fs from "fs";
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { promoPath } from "@/lib/admin/promo";
import { loadState } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  const id = req.nextUrl.searchParams.get("id") || "";
  const item = (loadState().promos || []).find((p) => p.id === id);
  if (!item) return NextResponse.json({ error: "missing" }, { status: 404 });
  if (item.file) {
    try {
      const buf = fs.readFileSync(promoPath(item.file));
      return new NextResponse(buf, {
        headers: {
          "content-type": item.mime || (item.kind === "video" ? "video/mp4" : "image/jpeg"),
          "cache-control": "private, max-age=3600",
          "content-disposition": `inline; filename="${item.file}"`,
        },
      });
    } catch {
      /* fall through to remote */
    }
  }
  if (item.remoteUrl) return NextResponse.redirect(item.remoteUrl);
  return NextResponse.json({ error: "missing_file" }, { status: 404 });
}
