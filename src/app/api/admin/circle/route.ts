import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin/auth";
import { clientIp, isSolanaAddress } from "@/lib/security";
import { audit, mutateState, pushBounded, withCircle } from "@/lib/store";
import { displayMedia } from "@/lib/pinata";
import {
  activeMembers,
  addJob,
  addPromo,
  airdropWeight,
  banMember,
  boostPct,
  deleteMessage,
  ensureCircle,
  muteMember,
  referralCount,
  removeJob,
  removePromo,
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
  promoUrl: z.string().max(2000).optional(),
  promoCaption: z.string().max(80).optional(),
  deletePromoId: z.string().optional(),
  access: z.enum(["pending", "ready"]).optional(),
  jobTitle: z.string().max(80).optional(),
  jobBlurb: z.string().max(400).optional(),
  jobHref: z.string().max(300).optional(),
  deleteJobId: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  const s = await withCircle((st) => st, false);
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
    promos: (book.promos || []).map((p) => ({ ...p, url: displayMedia(p.url) })),
    jobs: book.jobs || [],
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
      if (b.access) {
        const m = book.members[b.pubkey];
        if (m) m.access = b.access;
      }
    }
    if (b.deletePromoId) removePromo(book, b.deletePromoId);
    if (b.deleteJobId) removeJob(book, b.deleteJobId);
    let promo = null as ReturnType<typeof addPromo> | null;
    if (b.promoUrl) promo = addPromo(book, { url: b.promoUrl, caption: b.promoCaption });
    let job = null as ReturnType<typeof addJob> | null;
    if (b.jobTitle) job = addJob(book, { title: b.jobTitle, blurb: b.jobBlurb || "", href: b.jobHref });
    let drop = null as ReturnType<typeof runAirdrop> | null;
    if (b.airdrop) drop = runAirdrop(book, b.airdrop);
    pushBounded(s.audit, audit("admin", "circle", JSON.stringify(Object.keys(b)), ip), 400);
    return { drop, promo, job };
  });
  if (out.drop && !out.drop.ok) return NextResponse.json({ error: out.drop.error, message: "Airdrop failed." }, { status: 400 });
  if (out.promo && !out.promo.ok) {
    const message = out.promo.error === "full" ? "All 30 promo spots are filled." : "Could not save that image.";
    return NextResponse.json({ error: out.promo.error, message }, { status: 400 });
  }
  if (out.job && !out.job.ok) {
    const message = out.job.error === "need_title" ? "Give the listing a title." : "Could not save that listing.";
    return NextResponse.json({ error: out.job.error, message }, { status: 400 });
  }
  return NextResponse.json({
    ok: true,
    drop: out.drop && out.drop.ok ? { id: out.drop.id, heads: out.drop.heads } : null,
    promo: out.promo && out.promo.ok ? out.promo.promo : null,
    job: out.job && out.job.ok ? out.job.job : null,
  });
}
