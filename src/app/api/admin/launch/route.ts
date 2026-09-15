import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin/auth";
import { clientIp } from "@/lib/security";
import { audit, pushBounded, withLaunch } from "@/lib/store";
import { emptyLaunchBook } from "@/lib/launch/engine";
import { ensureBoosts } from "@/lib/launch/boost";

export const dynamic = "force-dynamic";

const Patch = z.object({
  expireBoost: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  const parsed = Patch.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const ip = clientIp(req);
  await withLaunch((s) => {
    if (!s.launch) s.launch = emptyLaunchBook();
    if (parsed.data.expireBoost) {
      const rows = ensureBoosts(s.launch);
      const hit = rows.find((b) => b.id === parsed.data.expireBoost);
      if (hit) {
        hit.status = "done";
        hit.endsAt = Date.now();
        pushBounded(s.audit, audit("admin", "boost_end", hit.id, ip), 400);
      }
    }
  }, true);
  return NextResponse.json({ ok: true });
}
