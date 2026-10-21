import { NextRequest, NextResponse, after } from "next/server";
import { z } from "zod";
import { clientIp, isSolanaAddress, rateLimit, sanitizeText } from "@/lib/security";
import { mutateState, withLaunch } from "@/lib/store";
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
import { IMAGE_DATA_MAX, PFP_SENTINEL } from "@/lib/launch/validate";
import { putPfp, delPfp } from "@/lib/pfpStore";
import { lastPairPrices } from "@/lib/tick";
import { airdropMultiplier, referralBoostPct } from "@/lib/circle/types";
import { payReferralXp, profilePhotoUrl, publicRank } from "@/lib/rank/engine";
import { pinDataUrl, pinDisplayUrl } from "@/lib/pinata";
import { acceptLegal, findAccount } from "@/lib/auth/accounts";
import { readAccountId } from "@/lib/auth/session";


export const dynamic = "force-dynamic";
export const maxDuration = 30;

const Body = z.object({
  action: z.enum(["hello", "pfp", "withdraw_referral", "username", "tos"]),
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
    pfp: profilePhotoUrl(acc.pfp, pubkey, "pfp", acc.pfpAt),
    referrer: acc.referrer || null,
    referredAt: acc.referredAt || null,
    referralRewardsSol: acc.referralRewardsSol || 0,
    referredCount: invited.length,
    airdropBoostPct: referralBoostPct(invited.length),
    airdropMultiplier: airdropMultiplier(invited.length),
    invited: invited.map((pk) => ({
      pubkey: pk,
      launched: book.coins.filter((c) => c.creator === pk).length,
    })),
    launched: launched.map((c) => publicCoin(c, solUsd, pubkey, book)),
    tosAcceptedAt: 0,
    link: `/r/${pubkey}`,
    intro: acc.intro || "",
    favMint: acc.favMint || "",
    favSymbol: acc.favSymbol || "",
    favName: acc.favName || "",
    ...publicRank(acc),
  };
}

export async function GET(req: NextRequest) {
  const pubkey = req.nextUrl.searchParams.get("pubkey") || "";
  if (!isSolanaAddress(pubkey)) return fail("bad_wallet");
  const solUsd = lastPairPrices().solUsd || 0;
  const s = await withLaunch((st) => st, false);
  const book = bookOf(s);
  const user = s.users.find((u) => u.pubkey === pubkey);
  return NextResponse.json({ ...pack(book, pubkey, solUsd), tosAcceptedAt: user?.tosAcceptedAt || 0 });
}

export async function POST(req: NextRequest) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("bad_request");
  const b = parsed.data;
  const bucket = b.action === "pfp" ? "account-pfp" : "account";
  const n = b.action === "pfp" ? 20 : 30;
  if (!rateLimit(clientIp(req) + ":" + bucket, n, 60_000)) {
    if (b.action === "pfp") {
      return NextResponse.json({ error: "rate_limited", message: "Too many photo uploads. Wait a minute." }, { status: 429 });
    }
    return fail("rate_limited", 429);
  }
  if (!isSolanaAddress(b.pubkey)) return fail("bad_wallet");
  const solUsd = lastPairPrices().solUsd || 0;

  let pfpUrl = (b.pfp || "").trim();
  const rawPfp = pfpUrl;
  if (b.action === "pfp") {
    if (!rawPfp) {
      await delPfp(b.pubkey);
    } else if (rawPfp.startsWith("data:image/")) {
      const stored = await putPfp(b.pubkey, rawPfp);
      if (stored) pfpUrl = PFP_SENTINEL;
    }
  }
  const out = await withLaunch((s) => {
    const book = bookOf(s);
    if (b.action === "hello") {
      const r = bindReferrer(book, b.pubkey, sanitizeText(b.referrer || "", 48));
      if (r.ok) payReferralXp(book, b.pubkey);
      return r;
    }
    if (b.action === "pfp") {
      return setAccountPfp(book, b.pubkey, pfpUrl);
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
    if (b.action === "tos") {
      const now = Date.now();
      let user = s.users.find((u) => u.pubkey === b.pubkey);
      if (!user) {
        user = {
          pubkey: b.pubkey,
          createdAt: now,
          lastSeen: now,
          alertsEnabled: false,
        };
        s.users.push(user);
      }
      user.tosAcceptedAt = now;
      user.privacyAcceptedAt = now;
      user.lastSeen = now;
      return { ok: true as const, tosAt: now };
    }
    return { ok: false as const, error: "bad_action" };
  }, true);

  if (b.action === "tos") {
    const accountId = readAccountId(req);
    if (accountId) {
      await mutateState((s) => {
        const row = findAccount(s, accountId);
        if (row) acceptLegal(row, Date.now());
        return true;
      });
    }
  }

  if (!out || !("ok" in out) || !out.ok) {
    if (b.action === "pfp") {
      return NextResponse.json(
        { error: "bad_image", message: "Could not save that photo. Try a smaller JPEG or PNG." },
        { status: 400 },
      );
    }
    return fail((out as { error?: string })?.error || "failed");
  }

  if (b.action === "pfp" && rawPfp.startsWith("data:image/")) {
    const data = rawPfp;
    const name = `pfp-${b.pubkey.slice(0, 8)}`;
    after(async () => {
      try {
        const pinned = await pinDataUrl(data, name, { budgetMs: 8_000 });
        const url = pinned?.url ? pinDisplayUrl(pinned.url) : "";
        if (!url || !/^https?:\/\//i.test(url)) return;
        await withLaunch((s) => {
          const book = bookOf(s);
          const cur = (book.accounts?.[b.pubkey]?.pfp || "").trim();
          if (cur && cur !== PFP_SENTINEL && !/^https?:\/\//i.test(cur)) return;
          setAccountPfp(book, b.pubkey, url);
        }, true);
      } catch {
        /* dedicated key is the photo — Pinata is backup only, never overwrite KEYS.pfp */
      }
    });
  }

  const s = await withLaunch((st) => st, false);
  const user = s.users.find((u) => u.pubkey === b.pubkey);
  const desk = { ...pack(bookOf(s), b.pubkey, solUsd), tosAcceptedAt: user?.tosAcceptedAt || 0 };
  if ("sol" in out) return NextResponse.json({ ...desk, withdrawn: out.sol });
  return NextResponse.json({ ...desk, bound: "bound" in out ? out.bound : undefined });
}
