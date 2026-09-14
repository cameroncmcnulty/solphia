import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin/auth";
import { clientIp, isSolanaAddress } from "@/lib/security";
import { audit, mutateState, pushBounded, readyState } from "@/lib/store";
import {
  activeMembers,
  airdropWeight,
  banMember,
  boostPct,
  deleteMessage,
  ensureCircle,
  muteMember,
  referralCount,
  runAirdrop,
  setRole,
  spotsLeft,
} from "@/lib/circle/engine";
import type { CircleRole } from "@/lib/circle/types";

export const dynamic = "force-dynamic";

const Patch = z.object({
  cap: z.number().int().min(1).max(10_000).optional(),
  pubkey: z.string().optional(),
  role: z.enum(["member", "mod", "admin"]).optional(),
  ban: z.boolean().optional(),
  muteMs: z.number().int().min(0).max(90 * 86_400_000).optional(),
  deleteId: z.string().optional(),
  airdrop: z.number().positive().max(1_000_000_000).optional(),
});

export async function GET(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  const s = await readyState();
  const book = ensureCircle(s.circle);
  const members = Object.values(book.members).map((m) => ({
    ...m,
    boostPct: boostPct(book, m.pubkey),
    refs: referralCount(book, m.pubkey),
    weight: airdropWeight(book, m.pubkey),
    username: s.launch?.accounts?.[m.pubkey]?.username || "",
  }));
  members.sort((a, b) => a.joinedAt - b.joinedAt);
  return NextResponse.json({
    ok: true,
    cap: book.cap,
    spots: spotsLeft(book),
    active: activeMembers(book).length,
    members,
    messages: book.messages.slice(-80),
    airdrops: book.airdrops.slice(-20).reverse(),
  });
}

export async function POST(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  const parsed = Patch.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const b = parsed.data;
  const ip = clientIp(req);
  const out = await mutateState((s) => {
    s.circle = ensureCircle(s.circle);
    const book = s.circle;
    if (b.cap) book.cap = b.cap;
    if (b.deleteId) deleteMessage(book, b.deleteId);
    if (b.pubkey && isSolanaAddress(b.pubkey)) {
      if (b.role) setRole(book, b.pubkey, b.role as CircleRole);
      if (typeof b.ban === "boolean") banMember(book, b.pubkey, b.ban);
      if (typeof b.muteMs === "number") muteMember(book, b.pubkey, b.muteMs);
    }
    let drop = null as ReturnType<typeof runAirdrop> | null;
    if (b.airdrop) drop = runAirdrop(book, b.airdrop);
    pushBounded(s.audit, audit("admin", "circle", JSON.stringify(Object.keys(b)), ip), 400);
    return { drop };
  });
  if (out.drop && !out.drop.ok) return NextResponse.json({ error: out.drop.error, message: "Airdrop failed." }, { status: 400 });
  return NextResponse.json({ ok: true, drop: out.drop && out.drop.ok ? { id: out.drop.id, heads: out.drop.heads } : null });
}
