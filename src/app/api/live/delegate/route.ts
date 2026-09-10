import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { clientIp, isSolanaAddress, rateLimit } from "@/lib/security";
import { mutateTrader } from "@/lib/store";
import { lockedAuto } from "@/lib/auto";
import {
  delegatedStatus,
  revokeDelegatedSigner,
  saveDelegatedSigner,
  signerConfigured,
} from "@/lib/live/signer";

export const dynamic = "force-dynamic";

const Body = z.object({
  owner: z.string(),
  secret: z.string().min(80).max(200).optional(),
});

export async function GET(req: NextRequest) {
  const owner = req.nextUrl.searchParams.get("owner") || "";
  if (!isSolanaAddress(owner)) return NextResponse.json({ error: "bad_owner" }, { status: 400 });
  const st = await delegatedStatus(owner);
  return NextResponse.json({
    ok: true,
    signerReady: signerConfigured(),
    ...st,
  });
}

export async function POST(req: NextRequest) {
  if (!rateLimit(clientIp(req) + ":delegate", 4, 60_000)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  if (!signerConfigured()) {
    return NextResponse.json({ error: "signer_secret_missing" }, { status: 503 });
  }
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success || !isSolanaAddress(parsed.data.owner) || !parsed.data.secret) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  try {
    const saved = await saveDelegatedSigner(parsed.data.owner, parsed.data.secret);
    await mutateTrader(parsed.data.owner, (t) => {
      t.tradingPubkey = saved.pubkey;
      t.auto = lockedAuto({
        ...t.auto,
        tradingPubkey: saved.pubkey,
        liveDelegate: true,
      });
      return t;
    });
    return NextResponse.json({ ok: true, delegated: true, pubkey: saved.pubkey });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "delegate failed" }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!rateLimit(clientIp(req) + ":delegate-del", 8, 60_000)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success || !isSolanaAddress(parsed.data.owner)) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  await revokeDelegatedSigner(parsed.data.owner);
  await mutateTrader(parsed.data.owner, (t) => {
    t.auto = lockedAuto({ ...t.auto, liveDelegate: false });
    return t;
  });
  return NextResponse.json({ ok: true, delegated: false });
}
