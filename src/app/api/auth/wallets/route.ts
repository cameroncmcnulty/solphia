import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { attachWallet, findAccount, publicAccount } from "@/lib/auth/accounts";
import { readAccountId } from "@/lib/auth/session";
import { assertNoSecretLeak, clientIp, isSolanaAddress, rateLimit } from "@/lib/security";
import { mutateState } from "@/lib/store";

export const dynamic = "force-dynamic";

const Body = z.object({ pubkey: z.string() });

export async function POST(req: NextRequest) {
  if (!rateLimit(clientIp(req) + ":acct-wallet", 30, 60_000)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  const id = readAccountId(req);
  if (!id) return NextResponse.json({ error: "auth", message: "Sign in first." }, { status: 401 });
  const raw = await req.json().catch(() => null);
  try {
    assertNoSecretLeak(raw);
  } catch {
    return NextResponse.json({ error: "refused", message: "Keys never sit on Solphia servers." }, { status: 400 });
  }
  const parsed = Body.safeParse(raw);
  if (!parsed.success || !isSolanaAddress(parsed.data.pubkey)) {
    return NextResponse.json({ error: "bad_request", message: "Bad wallet." }, { status: 400 });
  }
  const out = await mutateState((s) => {
    const row = findAccount(s, id);
    if (!row) return { ok: false as const, error: "missing" };
    const linked = attachWallet(row, parsed.data.pubkey);
    if (!linked.ok) return linked;
    let user = s.users.find((u) => u.pubkey === parsed.data.pubkey);
    const now = Date.now();
    if (!user) {
      user = {
        pubkey: parsed.data.pubkey,
        email: row.email,
        createdAt: now,
        lastSeen: now,
        alertsEnabled: Boolean(row.email),
        accountId: row.id,
        tosAcceptedAt: row.tosAcceptedAt,
        privacyAcceptedAt: row.privacyAcceptedAt,
      };
      s.users.push(user);
    } else {
      user.accountId = row.id;
      user.lastSeen = now;
      if (row.email && !user.email) user.email = row.email;
      if (row.tosAcceptedAt && !user.tosAcceptedAt) user.tosAcceptedAt = row.tosAcceptedAt;
      if (row.privacyAcceptedAt && !user.privacyAcceptedAt) user.privacyAcceptedAt = row.privacyAcceptedAt;
    }
    return { ok: true as const, account: publicAccount(row) };
  });
  if (!out.ok) {
    return NextResponse.json({ error: out.error, message: "Could not save that wallet on the account." }, { status: 400 });
  }
  return NextResponse.json({ ok: true, account: out.account });
}
