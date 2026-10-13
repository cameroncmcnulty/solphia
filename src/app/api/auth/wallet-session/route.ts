import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { openWalletAccount, publicAccount } from "@/lib/auth/accounts";
import { setAccountCookie } from "@/lib/auth/session";
import { assertNoSecretLeak, clientIp, isSolanaAddress, rateLimit } from "@/lib/security";
import { mutateState } from "@/lib/store";

export const dynamic = "force-dynamic";

const Body = z.object({
  pubkey: z.string(),
  tos: z.boolean(),
  privacy: z.boolean(),
});

export async function POST(req: NextRequest) {
  if (!rateLimit(clientIp(req) + ":wallet-session", 20, 60_000)) {
    return NextResponse.json({ error: "rate_limited", message: "Too many tries. Wait a bit." }, { status: 429 });
  }
  const raw = await req.json().catch(() => null);
  try {
    assertNoSecretLeak(raw);
  } catch {
    return NextResponse.json({ error: "refused", message: "Keys never sit on Solphia servers." }, { status: 400 });
  }
  const parsed = Body.safeParse(raw);
  if (!parsed.success || !isSolanaAddress(parsed.data.pubkey)) {
    return NextResponse.json({ error: "bad_request", message: "Create or import a Solphia wallet first." }, { status: 400 });
  }
  const out = await mutateState((s) =>
    openWalletAccount(s, { pubkey: parsed.data.pubkey, tos: parsed.data.tos, privacy: parsed.data.privacy }),
  );
  if (!out.ok) {
    return NextResponse.json({ error: out.error, message: out.error }, { status: 400 });
  }
  const now = Date.now();
  await mutateState((s) => {
    let user = s.users.find((u) => u.pubkey === parsed.data.pubkey);
    if (!user) {
      user = {
        pubkey: parsed.data.pubkey,
        createdAt: now,
        lastSeen: now,
        alertsEnabled: false,
        accountId: out.account.id,
        tosAcceptedAt: out.account.tosAcceptedAt,
        privacyAcceptedAt: out.account.privacyAcceptedAt,
      };
      s.users.push(user);
    } else {
      user.accountId = out.account.id;
      user.lastSeen = now;
      if (out.account.tosAcceptedAt && !user.tosAcceptedAt) user.tosAcceptedAt = out.account.tosAcceptedAt;
      if (out.account.privacyAcceptedAt && !user.privacyAcceptedAt) user.privacyAcceptedAt = out.account.privacyAcceptedAt;
    }
    return true;
  });
  const res = NextResponse.json({ ok: true, account: publicAccount(out.account), created: out.created });
  setAccountCookie(res, out.account.id);
  return res;
}
