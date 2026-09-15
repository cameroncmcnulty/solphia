import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin/auth";
import { clientIp } from "@/lib/security";
import { audit, pushBounded, withShill } from "@/lib/store";
import { deleteShill, ensureShill, livePins } from "@/lib/shill/engine";
import { displayMedia } from "@/lib/pinata";

export const dynamic = "force-dynamic";

const Patch = z.object({
  deleteId: z.string().optional(),
  unpinId: z.string().optional(),
  wipe: z.boolean().optional(),
});

export async function GET(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  const s = await withShill((st) => st, false);
  const book = ensureShill(s.shill);
  return NextResponse.json({
    ok: true,
    members: Object.keys(book.members).length,
    pins: livePins(book).map((p) => ({ ...p, image: displayMedia(p.image) })),
    messages: book.messages.slice(-80).reverse().map((m) => ({
      ...m,
      media: m.media ? displayMedia(m.media) : m.media,
    })),
  });
}

export async function POST(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  const parsed = Patch.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const b = parsed.data;
  const ip = clientIp(req);
  await withShill((s) => {
    s.shill = ensureShill(s.shill);
    if (b.wipe) {
      s.shill.messages = [];
      s.shill.pins = [];
      pushBounded(s.audit, audit("admin", "shill_wipe", "all", ip), 400);
    }
    if (b.deleteId) {
      const hit = s.shill.messages.find((m) => m.id === b.deleteId);
      if (hit) deleteShill(s.shill, b.deleteId, hit.owner);
      pushBounded(s.audit, audit("admin", "shill_delete", b.deleteId, ip), 400);
    }
    if (b.unpinId) {
      s.shill.pins = s.shill.pins.filter((p) => p.id !== b.unpinId);
      pushBounded(s.audit, audit("admin", "shill_unpin", b.unpinId, ip), 400);
    }
  }, true);
  return NextResponse.json({ ok: true });
}
