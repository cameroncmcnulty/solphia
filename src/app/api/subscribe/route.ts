import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { SystemProgram, Transaction, PublicKey } from "@solana/web3.js";
import { clientIp, isEmail, isSolanaAddress, rateLimit, sanitizeText } from "@/lib/security";
import { LIVE_TRADING, SUBSCRIPTION_SOL, TREASURY } from "@/lib/config";
import { connection, confirmedSolTransfer, subscriptionLamports } from "@/lib/solana/connection";
import { mutateState } from "@/lib/store";
import { queueEmail } from "@/lib/email/send";
import { welcomeEmailHtml } from "@/lib/email/templates";

export const dynamic = "force-dynamic";

const Body = z.object({
  pubkey: z.string(),
  email: z.string().optional(),
  signature: z.string().optional(),
  paper: z.boolean().optional(),
});

export async function GET() {
  return NextResponse.json({
    priceSol: SUBSCRIPTION_SOL,
    treasury: TREASURY || null,
    liveTrading: LIVE_TRADING,
    paperSubscribeAllowed: true,
  });
}

export async function POST(req: NextRequest) {
  if (!rateLimit(clientIp(req) + ":sub", 8, 60_000)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success || !isSolanaAddress(parsed.data.pubkey)) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const email = parsed.data.email && isEmail(parsed.data.email) ? sanitizeText(parsed.data.email, 120) : undefined;
  const until = Date.now() + 30 * 24 * 60 * 60 * 1000;

  if (parsed.data.paper || !TREASURY) {
    await mutateState(async (s) => {
      let user = s.users.find((u) => u.pubkey === parsed.data.pubkey);
      if (!user) {
        user = {
          pubkey: parsed.data.pubkey,
          email,
          createdAt: Date.now(),
          lastSeen: Date.now(),
          alertsEnabled: Boolean(email),
        };
        s.users.push(user);
      }
      user.subscribedUntil = until;
      if (email) {
        user.email = email;
        user.alertsEnabled = true;
        await queueEmail(s, email, "Solphia is watching with you", welcomeEmailHtml(parsed.data.pubkey, new Date(until).toISOString()));
      }
    });
    return NextResponse.json({ ok: true, mode: "paper", subscribedUntil: until });
  }

  if (!parsed.data.signature) {
    const tx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: new PublicKey(parsed.data.pubkey),
        toPubkey: new PublicKey(TREASURY),
        lamports: subscriptionLamports(),
      }),
    );
    tx.feePayer = new PublicKey(parsed.data.pubkey);
    const { blockhash } = await connection().getLatestBlockhash();
    tx.recentBlockhash = blockhash;
    const serialized = tx.serialize({ requireAllSignatures: false }).toString("base64");
    return NextResponse.json({ needsSignature: true, transaction: serialized, treasury: TREASURY, lamports: subscriptionLamports() });
  }

  const check = await confirmedSolTransfer({
    signature: parsed.data.signature,
    from: parsed.data.pubkey,
    to: TREASURY,
    lamports: subscriptionLamports(),
  });
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: 400 });

  await mutateState(async (s) => {
    let user = s.users.find((u) => u.pubkey === parsed.data.pubkey);
    if (!user) {
      user = {
        pubkey: parsed.data.pubkey,
        email,
        createdAt: Date.now(),
        lastSeen: Date.now(),
        alertsEnabled: Boolean(email),
      };
      s.users.push(user);
    }
    user.subscribedUntil = until;
    if (email) {
      user.email = email;
      await queueEmail(s, email, "Solphia is watching with you", welcomeEmailHtml(parsed.data.pubkey, new Date(until).toISOString()));
    }
  });
  return NextResponse.json({ ok: true, mode: "onchain", subscribedUntil: until });
}
