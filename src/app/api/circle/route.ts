import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { clientIp, isSolanaAddress, rateLimit, sanitizeText, isEmail } from "@/lib/security";
import { mutateState, readyState, withCircle } from "@/lib/store";
import { pinDataUrl } from "@/lib/pinata";
import { sphaMintOf } from "@/lib/token/solphia";
import { SITE_URL } from "@/lib/config";
import { displayMedia } from "@/lib/pinata";
import { treasuryAddress } from "@/lib/treasury";
import {
  activeMembers,
  airdropWeight,
  boostPct,
  canModerate,
  circleStale,
  claimAmount,
  deleteMessage,
  ensureCircle,
  hasAccess,
  inviteUrl,
  isMuted,
  joinCircle,
  markClaimed,
  postMessage,
  reactMessage,
  referralCount,
} from "@/lib/circle/engine";
import { CIRCLE_REACTS, CIRCLE_STICKERS } from "@/lib/circle/types";
import { sendCircleDrop } from "@/lib/circle/payout";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const typingMem = new Map<string, number>();

const Body = z.object({
  action: z.enum(["join", "chat", "react", "typing", "read", "claim", "media", "delete"]),
  pubkey: z.string(),
  email: z.string().optional(),
  referrer: z.string().optional(),
  text: z.string().max(2000).optional(),
  sticker: z.string().max(16).optional(),
  media: z.string().max(2_000_000).optional(),
  replyTo: z.string().max(40).optional(),
  id: z.string().optional(),
  emoji: z.string().max(8).optional(),
});

function publicMember(m: ReturnType<typeof activeMembers>[number], book: ReturnType<typeof ensureCircle>) {
  return {
    pubkey: m.pubkey,
    role: m.role,
    status: m.status,
    color: m.color,
    joinedAt: m.joinedAt,
    boostPct: boostPct(book, m.pubkey),
    refs: referralCount(book, m.pubkey),
    access: hasAccess(m) ? "ready" : "pending",
    invitedPubkey: m.invitedPubkey || "",
  };
}

export async function GET(req: NextRequest) {
  const pubkey = req.nextUrl.searchParams.get("pubkey") || "";
  const s = await withCircle((st) => st, false);
  const raw = s.circle;
  const book = ensureCircle(raw);
  if (circleStale(raw, book)) {
    await withCircle((st) => {
      st.circle = ensureCircle(st.circle);
    }, true);
  }
  const me = isSolanaAddress(pubkey) ? book.members[pubkey] : undefined;
  const banned = me?.status === "banned";
  const official = [
    treasuryAddress(),
    s.treasuryWallet,
    s.ownerWallet,
    s.devWallet,
    s.foundationWallet,
    s.airdropWallet,
    s.lpWallet,
    s.launch?.ownerWallet,
    ...(s.adminWallets || []),
  ].filter(Boolean) as string[];
  const ready = hasAccess(me);
  const base = {
    members: activeMembers(book).length,
    mint: sphaMintOf(s.sphaMint),
    official,
    link: pubkey ? inviteUrl(SITE_URL, pubkey) : "",
    promos: ready ? (book.promos || []).map((p) => ({ ...p, url: displayMedia(p.url) })) : [],
  };
  if (!me || banned) {
    return NextResponse.json({ ...base, member: null, banned: Boolean(banned), ready: false });
  }
  const acc = s.launch?.accounts?.[pubkey];
  return NextResponse.json({
    ...base,
    ready,
    member: {
      ...publicMember(me, book),
      email: me.email,
      unclaimed: me.unclaimed || 0,
      claimed: me.claimed || 0,
      muted: isMuted(me),
      username: acc?.username || "",
      hasPfp: Boolean(acc?.pfp),
    },
  });
}

export async function POST(req: NextRequest) {
  if (!rateLimit(clientIp(req) + ":circle", 40, 60_000)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success || !isSolanaAddress(parsed.data.pubkey)) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const b = parsed.data;
  if (b.action === "typing") {
    const s = await readyState();
    const me = ensureCircle(s.circle).members[b.pubkey];
    if (!me || me.status === "banned") return NextResponse.json({ error: "not_member" }, { status: 400 });
    typingMem.set(b.pubkey, Date.now() + 4000);
    return NextResponse.json({ ok: true });
  }
  if (b.action === "join") {
    if (!b.email || !isEmail(b.email)) return NextResponse.json({ error: "bad_email", message: "Enter a real email for updates." }, { status: 400 });
    const out = await withCircle((s) => {
      s.circle = ensureCircle(s.circle);
      const r = joinCircle(s.circle, { pubkey: b.pubkey, email: b.email || "", referrer: b.referrer });
      if (r.ok) {
        let u = s.users.find((x) => x.pubkey === b.pubkey);
        if (!u) {
          u = {
            pubkey: b.pubkey,
            createdAt: Date.now(),
            lastSeen: Date.now(),
            alertsEnabled: true,
          };
          s.users.push(u);
        }
        u.email = r.member.email;
        u.lastSeen = Date.now();
      }
      return r;
    }, true);
    if (!out.ok) {
      const message =
        out.error === "banned"
            ? "This wallet is banned from Founders Circle."
            : "Could not join.";
      return NextResponse.json({ error: out.error, message }, { status: 400 });
    }
    return NextResponse.json({
      ok: true,
      created: out.created,
      access: hasAccess(out.member) ? "ready" : "pending",
      link: inviteUrl(SITE_URL, b.pubkey),
    });
  }

  if (b.action === "media") {
    const dataUrl = b.media || "";
    if (!dataUrl.startsWith("data:image/")) return NextResponse.json({ error: "bad_media" }, { status: 400 });
    const pinned = await pinDataUrl(dataUrl, "circle");
    const url = pinned?.url || (dataUrl.length < 180_000 ? dataUrl : "");
    if (!url) return NextResponse.json({ error: "media_failed", message: "Image too large. Pinata is off or the file is over 4 MB." }, { status: 400 });
    const posted = await mutateState((s) => {
      s.circle = ensureCircle(s.circle);
      return postMessage(s.circle, { owner: b.pubkey, kind: "media", media: url, text: sanitizeText(b.text || "", 280), replyTo: b.replyTo });
    });
    if (!posted.ok) return NextResponse.json({ error: posted.error }, { status: 400 });
    return NextResponse.json({ ok: true, message: posted.message });
  }

  const posted = await mutateState((s) => {
    s.circle = ensureCircle(s.circle);
    const book = s.circle;
    const me = book.members[b.pubkey];
    if (!me || me.status === "banned") return { ok: false as const, error: "not_member" };
    if (b.action === "read") {
      me.lastReadAt = Date.now();
      return { ok: true as const };
    }
    if (b.action === "delete") {
      if (!canModerate(me) && b.pubkey !== book.messages.find((x) => x.id === b.id)?.owner) {
        return { ok: false as const, error: "forbidden" };
      }
      return deleteMessage(book, b.id || "") ? { ok: true as const } : { ok: false as const, error: "missing" };
    }
    if (b.action === "react") {
      const ok = reactMessage(book, { owner: b.pubkey, id: b.id || "", emoji: b.emoji || "" });
      return ok ? { ok: true as const } : { ok: false as const, error: "missing" };
    }
    if (b.action === "chat") {
      return postMessage(book, {
        owner: b.pubkey,
        text: sanitizeText(b.text || "", 2000),
        sticker: b.sticker,
        replyTo: b.replyTo,
        kind: b.sticker ? "sticker" : "text",
      });
    }
    if (b.action === "claim") {
      return { ok: true as const, claim: true as const, amount: claimAmount(book, b.pubkey) };
    }
    return { ok: false as const, error: "bad_action" };
  });

  if (b.action === "claim") {
    const amount = posted.ok && "amount" in posted ? Number(posted.amount) || 0 : 0;
    if (!(amount > 0)) return NextResponse.json({ error: "empty", message: "Nothing to withdraw yet." }, { status: 400 });
    const pay = await sendCircleDrop(b.pubkey, amount);
    if (!pay.ok) return NextResponse.json({ error: pay.error, message: pay.message }, { status: 400 });
    await mutateState((s) => {
      s.circle = ensureCircle(s.circle);
      markClaimed(s.circle, b.pubkey, amount);
    });
    return NextResponse.json({ ok: true, signature: pay.signature, amount });
  }

  if (!posted.ok) return NextResponse.json({ error: posted.error }, { status: 400 });
  return NextResponse.json({ ok: true, message: "message" in posted ? posted.message : undefined });
}
