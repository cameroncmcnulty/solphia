import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { clientIp, isSolanaAddress, rateLimit, sanitizeText } from "@/lib/security";
import { withLaunch } from "@/lib/store";
import { emptyLaunchBook } from "@/lib/launch/engine";
import {
  bindReferrer,
  emptyAccount,
  publicCoin,
  referredBy,
  setAccountPfp,
  withdrawReferral,
} from "@/lib/launch/engine";
import { setUsername } from "@/lib/launch/username";
import { launchError } from "@/lib/launch/errors";
import { IMAGE_DATA_MAX } from "@/lib/launch/validate";
import { lastPairPrices } from "@/lib/tick";
import { enrollPaperBot } from "@/lib/store";

export const dynamic = "force-dynamic";

const Body = z.object({
  action: z.enum(["hello", "pfp", "withdraw_referral", "username"]),
  pubkey: z.string(),
  referrer: z.string().optional(),
  pfp: z.string().max(IMAGE_DATA_MAX).optional(),
  username: z.string().max(32).optional(),
});

function bookOf(s: { launch?: ReturnType<typeof emptyLaunchBook>; ownerWallet?: string }) {
  if (!s.launch) s.launch = emptyLaunchBook();
  if (!s.launch.accounts) s.launch.accounts = {};
  return s.launch;
}

function fail(code: string, status = 400) {
  return NextResponse.json({ error: code, message: launchError(code) }, { status });
}

function pack(book: ReturnType<typeof emptyLaunchBook>, pubkey: string, solUsd: number) {
  const acc = book.accounts?.[pubkey] || emptyAccount(pubkey);
  const invited = referredBy(book, pubkey);
  const launched = book.coins.filter((c) => c.creator === pubkey).slice(0, 40);
  return {
    pubkey,
    username: acc.username || "",
    pfp: acc.pfp || "",
    referrer: acc.referrer || null,
    referredAt: acc.referredAt || null,
    referralRewardsSol: acc.referralRewardsSol || 0,
    referredCount: invited.length,
    invited: invited.map((pk) => ({
      pubkey: pk,
      launched: book.coins.filter((c) => c.creator === pk).length,
    })),
    launched: launched.map((c) => publicCoin(c, solUsd, pubkey, book)),
    link: `/r/${pubkey}`,
  };
}

export async function GET(req: NextRequest) {
  const pubkey = req.nextUrl.searchParams.get("pubkey") || "";
  if (!isSolanaAddress(pubkey)) return fail("bad_wallet");
  const solUsd = lastPairPrices().solUsd || 0;
  const s = await withLaunch((st) => st, false);
  const book = bookOf(s);
  return NextResponse.json(pack(book, pubkey, solUsd));
}

export async function POST(req: NextRequest) {
  if (!rateLimit(clientIp(req) + ":account", 30, 60_000)) return fail("rate_limited", 429);
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("bad_request");
  const b = parsed.data;
  if (!isSolanaAddress(b.pubkey)) return fail("bad_wallet");
  const solUsd = lastPairPrices().solUsd || 0;

  const out = await withLaunch((s) => {
    const book = bookOf(s);
    if (b.action === "hello") {
      const r = bindReferrer(book, b.pubkey, sanitizeText(b.referrer || "", 48));
      return r;
    }
    if (b.action === "pfp") {
      return setAccountPfp(book, b.pubkey, b.pfp || "");
    }
    if (b.action === "username") {
      const r = setUsername(book, b.pubkey, b.username || "");
      if (r.ok) {
        let user = s.users.find((u) => u.pubkey === b.pubkey);
        if (!user) {
          user = {
            pubkey: b.pubkey,
            createdAt: Date.now(),
            lastSeen: Date.now(),
            alertsEnabled: true,
          };
          s.users.push(user);
        }
        user.username = r.username || undefined;
        user.lastSeen = Date.now();
      }
      return r;
    }
    if (b.action === "withdraw_referral") {
      return withdrawReferral(book, { owner: b.pubkey });
    }
    return { ok: false as const, error: "bad_action" };
  }, true);

  if (!out || !("ok" in out) || !out.ok) {
    return fail((out as { error?: string })?.error || "failed");
  }

  if (b.action === "hello") {
    try {
      await enrollPaperBot(b.pubkey);
    } catch {
      /* launch bind still counts */
    }
  }

  const s = await withLaunch((st) => st, false);
  const desk = pack(bookOf(s), b.pubkey, solUsd);
  if ("sol" in out) return NextResponse.json({ ...desk, withdrawn: out.sol });
  return NextResponse.json({ ...desk, bound: "bound" in out ? out.bound : undefined });
}
