import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin/auth";
import { clientIp, isSolanaAddress } from "@/lib/security";
import { audit, pushBounded, withLaunch } from "@/lib/store";
import { emptyLaunchBook } from "@/lib/launch/engine";
import { leaderboard, publicCard, resetRank, setRankTo, setRankXp } from "@/lib/rank/engine";

export const dynamic = "force-dynamic";

const Patch = z.object({
  pubkey: z.string(),
  grantXp: z.number().int().min(1).max(50_000).optional(),
  setRank: z.number().int().min(1).max(100).optional(),
  setXp: z.number().int().min(0).max(5_000_000).optional(),
  reset: z.boolean().optional(),
});

export async function GET(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  const s = await withLaunch((st) => st, false);
  const book = s.launch || emptyLaunchBook();
  return NextResponse.json({
    ok: true,
    board: leaderboard(book, 80),
  });
}

export async function POST(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  const parsed = Patch.safeParse(await req.json().catch(() => null));
  if (!parsed.success || !isSolanaAddress(parsed.data.pubkey)) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const b = parsed.data;
  const ip = clientIp(req);
  const out = await withLaunch((s) => {
    if (!s.launch) s.launch = emptyLaunchBook();
    if (b.reset) {
      const r = resetRank(s.launch, b.pubkey);
      pushBounded(s.audit, audit("admin", "rank_reset", b.pubkey, ip), 400);
      return r;
    }
    if (typeof b.setRank === "number") {
      const r = setRankTo(s.launch, b.pubkey, b.setRank);
      pushBounded(s.audit, audit("admin", "rank_set", `${b.pubkey}:${b.setRank}`, ip), 400);
      return r;
    }
    if (typeof b.setXp === "number") {
      const r = setRankXp(s.launch, b.pubkey, b.setXp);
      pushBounded(s.audit, audit("admin", "rank_xp", `${b.pubkey}:${b.setXp}`, ip), 400);
      return r;
    }
    if (typeof b.grantXp === "number") {
      const acc = s.launch.accounts[b.pubkey];
      const next = (acc?.xp || 0) + b.grantXp;
      const r = setRankXp(s.launch, b.pubkey, next);
      pushBounded(s.audit, audit("admin", "rank_grant", `${b.pubkey}:+${b.grantXp}`, ip), 400);
      return r;
    }
    return { ok: false as const, error: "noop" };
  }, true);
  if (!out || !("ok" in out) || !out.ok) return NextResponse.json({ error: "failed" }, { status: 400 });
  const s = await withLaunch((st) => st, false);
  return NextResponse.json({ ok: true, card: publicCard(s.launch?.accounts?.[b.pubkey], b.pubkey) });
}
