import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { SystemProgram, Transaction, PublicKey } from "@solana/web3.js";
import { clientIp, isEmail, isSolanaAddress, rateLimit, sanitizeText } from "@/lib/security";
import { LIVE_TRADING, TREASURY } from "@/lib/config";
import { PLANS, planById, lamportsForPlan, type PlanId } from "@/lib/plans";
import { connection, confirmedSolTransfer } from "@/lib/solana/connection";
import { loadState, mutateState } from "@/lib/store";
import { isFounder } from "@/lib/access";
import { queueEmail } from "@/lib/email/send";
import { welcomeEmailHtml } from "@/lib/email/templates";

export const dynamic = "force-dynamic";

const Body = z.object({
  pubkey: z.string(),
  email: z.string().optional(),
  signature: z.string().optional(),
  paper: z.boolean().optional(),
  plan: z.enum(["pulse", "copy", "snipers", "full"]).optional(),
});

export async function GET() {
  return NextResponse.json({
    plans: PLANS,
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
  const planId = (parsed.data.plan || "full") as PlanId;
  const plan = planById(planId) || PLANS[3];
  const until = Date.now() + 30 * 24 * 60 * 60 * 1000;
  const lamports = lamportsForPlan(plan.id);
  if (isFounder(loadState(), parsed.data.pubkey)) {
    return NextResponse.json({
      ok: true,
      mode: "founder",
      plan: "full",
      sol: 0,
      subscribedUntil: Date.now() + 10 * 365 * 24 * 60 * 60 * 1000,
    });
  }

  if (parsed.data.paper || !TREASURY) {
    await mutateState(async (s) => {
      let user = s.users.find((u) => u.pubkey === parsed.data.pubkey);
      if (!user) {
        user = {
          pubkey: parsed.data.pubkey,
          email,
          plan: plan.id,
          createdAt: Date.now(),
          lastSeen: Date.now(),
          alertsEnabled: Boolean(email),
        };
        s.users.push(user);
      }
      user.subscribedUntil = until;
      user.plan = plan.id;
      if (email) {
        user.email = email;
        user.alertsEnabled = plan.id === "pulse" || plan.id === "full";
        await queueEmail(s, email, `${plan.name} is live`, welcomeEmailHtml(parsed.data.pubkey, new Date(until).toISOString()));
      }
    });
    return NextResponse.json({ ok: true, mode: "paper", plan: plan.id, sol: plan.sol, subscribedUntil: until });
  }

  if (!parsed.data.signature) {
    const tx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: new PublicKey(parsed.data.pubkey),
        toPubkey: new PublicKey(TREASURY),
        lamports,
      }),
    );
    tx.feePayer = new PublicKey(parsed.data.pubkey);
    const { blockhash } = await connection().getLatestBlockhash();
    tx.recentBlockhash = blockhash;
    const serialized = tx.serialize({ requireAllSignatures: false }).toString("base64");
    return NextResponse.json({ needsSignature: true, transaction: serialized, treasury: TREASURY, lamports, plan: plan.id });
  }

  const check = await confirmedSolTransfer({
    signature: parsed.data.signature,
    from: parsed.data.pubkey,
    to: TREASURY,
    lamports,
  });
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: 400 });

  await mutateState(async (s) => {
    let user = s.users.find((u) => u.pubkey === parsed.data.pubkey);
    if (!user) {
      user = {
        pubkey: parsed.data.pubkey,
        email,
        plan: plan.id,
        createdAt: Date.now(),
        lastSeen: Date.now(),
        alertsEnabled: Boolean(email),
      };
      s.users.push(user);
    }
    user.subscribedUntil = until;
    user.plan = plan.id;
    if (email) {
      user.email = email;
      await queueEmail(s, email, `${plan.name} is live`, welcomeEmailHtml(parsed.data.pubkey, new Date(until).toISOString()));
    }
  });
  return NextResponse.json({ ok: true, mode: "onchain", plan: plan.id, sol: plan.sol, subscribedUntil: until });
}
