import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { SystemProgram, Transaction, PublicKey } from "@solana/web3.js";
import { clientIp, isEmail, isSolanaAddress, rateLimit, sanitizeText } from "@/lib/security";
import { liveTradingEnabled } from "@/lib/liveFlag";
import { treasuryAddress } from "@/lib/treasury";
import { PLANS, planById, lamportsForPlan, type PlanId } from "@/lib/plans";
import { connection, confirmedSolTransfer } from "@/lib/solana/connection";
import { loadState, mutateState } from "@/lib/store";
import { isFounder, liveSeatOk } from "@/lib/access";
import { queueEmail } from "@/lib/email/send";
import { welcomeEmailHtml } from "@/lib/email/templates";
import {
  acceptTos,
  extendSeat,
  payerAllowed,
  publicSeat,
  seatLamports,
  seatSol,
  unsubscribeSeat,
  upsertUser,
  SEAT_PERIOD_DAYS,
} from "@/lib/seat";

export const dynamic = "force-dynamic";

const Body = z.object({
  pubkey: z.string(),
  email: z.string().optional(),
  signature: z.string().optional(),
  paper: z.boolean().optional(),
  plan: z.enum(["paper", "live", "pulse", "copy", "snipers", "full"]).optional(),
  tos: z.boolean().optional(),
  autoRenew: z.boolean().optional(),
  payer: z.string().optional(),
  action: z.enum(["subscribe", "renew", "unsubscribe"]).optional(),
});

function seatPayload(extra: Record<string, unknown> = {}) {
  const treasury = treasuryAddress();
  return {
    plans: PLANS,
    treasury: treasury || null,
    liveTrading: liveTradingEnabled(),
    paperSubscribeAllowed: true,
    seatSol: seatSol(),
    periodDays: SEAT_PERIOD_DAYS,
    lamports: seatLamports(),
    ...extra,
  };
}

export async function GET(req: NextRequest) {
  const pubkey = req.nextUrl.searchParams.get("pubkey") || "";
  const s = loadState();
  const user = isSolanaAddress(pubkey) ? s.users.find((u) => u.pubkey === pubkey) : undefined;
  return NextResponse.json(
    seatPayload({
      ...publicSeat(user),
      founder: isSolanaAddress(pubkey) ? isFounder(s, pubkey) : false,
      liveSeat: isSolanaAddress(pubkey) ? liveSeatOk(s, pubkey) : false,
    }),
  );
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
  const action = parsed.data.action || "subscribe";
  const planId = (parsed.data.plan === "paper" ? "paper" : "live") as PlanId;
  const plan = planById(planId) || PLANS[0];
  const autoRenew = parsed.data.autoRenew !== false;
  const payer = parsed.data.payer && isSolanaAddress(parsed.data.payer) ? parsed.data.payer : parsed.data.pubkey;

  if (isFounder(loadState(), parsed.data.pubkey)) {
    const until = Date.now() + 10 * 365 * 24 * 60 * 60 * 1000;
    await mutateState((s) => {
      const user = upsertUser(s, parsed.data.pubkey);
      user.plan = "live";
      user.subscribedUntil = until;
      user.autoRenew = false;
      if (parsed.data.tos) acceptTos(user);
      if (email) {
        user.email = email;
        user.alertsEnabled = Boolean(email);
      }
    });
    return NextResponse.json(
      seatPayload({
        ok: true,
        mode: "founder",
        plan: "live",
        sol: 0,
        subscribedUntil: until,
        autoRenew: false,
      }),
    );
  }

  if (action === "unsubscribe") {
    const out = await mutateState((s) => {
      const user = upsertUser(s, parsed.data.pubkey);
      unsubscribeSeat(user);
      return publicSeat(user);
    });
    return NextResponse.json(seatPayload({ ok: true, mode: "unsubscribed", ...out }));
  }

  if (parsed.data.paper || planId === "paper") {
    const out = await mutateState(async (s) => {
      const user = upsertUser(s, parsed.data.pubkey);
      user.plan = "paper";
      user.autoRenew = false;
      if (email) {
        user.email = email;
        user.alertsEnabled = Boolean(email);
      }
      return publicSeat(user);
    });
    return NextResponse.json(seatPayload({ ok: true, mode: "paper", sol: 0, ...out }));
  }

  if (!parsed.data.tos) {
    return NextResponse.json({ error: "tos_required" }, { status: 400 });
  }

  const treasury = treasuryAddress();
  if (!treasury) {
    return NextResponse.json({ error: "treasury_required" }, { status: 400 });
  }

  const state = loadState();
  if (!payerAllowed(state, parsed.data.pubkey, payer)) {
    return NextResponse.json({ error: "payer_not_linked" }, { status: 400 });
  }

  const lamports = lamportsForPlan("live");

  if (!parsed.data.signature) {
    const tx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: new PublicKey(payer),
        toPubkey: new PublicKey(treasury),
        lamports,
      }),
    );
    tx.feePayer = new PublicKey(payer);
    const { blockhash } = await connection().getLatestBlockhash();
    tx.recentBlockhash = blockhash;
    const serialized = tx.serialize({ requireAllSignatures: false }).toString("base64");
    return NextResponse.json(
      seatPayload({
        needsSignature: true,
        transaction: serialized,
        treasury,
        lamports,
        sol: seatSol(),
        plan: "live",
        payer,
        fromPhantom: payer === parsed.data.pubkey,
      }),
    );
  }

  const existing = state.users.find((u) => u.pubkey === parsed.data.pubkey);
  if (existing?.lastPaySig === parsed.data.signature) {
    return NextResponse.json(
      seatPayload({
        ok: true,
        mode: "onchain",
        reused: true,
        sol: seatSol(),
        ...publicSeat(existing),
      }),
    );
  }

  const check = await confirmedSolTransfer({
    signature: parsed.data.signature,
    from: payer,
    to: treasury,
    lamports,
  });
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: 400 });

  const until = await mutateState(async (s) => {
    const user = upsertUser(s, parsed.data.pubkey);
    acceptTos(user);
    user.lastPaySig = parsed.data.signature;
    extendSeat(user, Date.now(), autoRenew);
    if (email) {
      user.email = email;
      user.alertsEnabled = Boolean(email);
      await queueEmail(s, email, `${plan.name} is live`, welcomeEmailHtml(parsed.data.pubkey, new Date(user.subscribedUntil || Date.now()).toISOString()));
    }
    return user.subscribedUntil;
  });

  return NextResponse.json(
    seatPayload({
      ok: true,
      mode: "onchain",
      plan: "live",
      sol: seatSol(),
      subscribedUntil: until,
      autoRenew,
    }),
  );
}
