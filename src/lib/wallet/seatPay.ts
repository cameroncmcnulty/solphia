"use client";

import { paySeatFromPhantom, paySeatFromTrading, tradingPubkey } from "./trading";

async function confirmPay(body: Record<string, unknown>) {
  const r = await fetch("/api/subscribe", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return r.json();
}

export async function subscribeWithPhantom(opts: {
  owner: string;
  email?: string;
  plan?: "live" | "lev";
}): Promise<{ subscribedUntil: number; autoRenew: boolean }> {
  const plan = opts.plan || "live";
  const start = await confirmPay({
    pubkey: opts.owner,
    email: opts.email,
    plan,
    tos: true,
    autoRenew: true,
    action: "subscribe",
    payer: opts.owner,
  });
  if (start.ok && start.mode === "founder") {
    return { subscribedUntil: Number(start.subscribedUntil), autoRenew: false };
  }
  if (!start.needsSignature || !start.treasury) {
    if (start.ok) return { subscribedUntil: Number(start.subscribedUntil), autoRenew: Boolean(start.autoRenew) };
    throw new Error(start.error || "Could not start the live seat.");
  }
  const sig = await paySeatFromPhantom(opts.owner, start.treasury, Number(start.sol || (plan === "lev" ? 0.15 : 0.1)));
  if (!sig) throw new Error("Phantom did not return a signature.");
  const done = await confirmPayRetry({
    pubkey: opts.owner,
    email: opts.email,
    plan,
    tos: true,
    autoRenew: true,
    action: "subscribe",
    payer: opts.owner,
    signature: sig,
  });
  if (!done.ok) throw new Error(done.error || "Payment landed but the seat did not confirm.");
  return { subscribedUntil: Number(done.subscribedUntil), autoRenew: Boolean(done.autoRenew) };
}

async function confirmPayRetry(body: Record<string, unknown>) {
  let last: { ok?: boolean; error?: string; subscribedUntil?: number; autoRenew?: boolean } = {};
  for (let i = 0; i < 6; i++) {
    last = await confirmPay(body);
    if (last.ok) return last;
    const err = String(last.error || "");
    if (/not found/i.test(err)) {
      await new Promise((r) => setTimeout(r, 1500));
      continue;
    }
    throw new Error(err || "seat confirm failed");
  }
  throw new Error(last.error || "Payment is on-chain but the seat did not confirm yet. Retry in a few seconds.");
}

export async function unsubscribeSeat(owner: string) {
  const j = await confirmPay({ pubkey: owner, action: "unsubscribe" });
  if (!j.ok) throw new Error(j.error || "unsubscribe failed");
  return j;
}

/** Pays the live (0.1) or lev (0.15) seat from the trading wallet when due. Returns need_phantom if that wallet is short. */
export async function tryAutoRenew(owner: string): Promise<"paid" | "skipped" | "need_phantom"> {
  const a = await fetch(`/api/access?pubkey=${owner}`).then((r) => r.json());
  if (a.founder || !a.autoRenew || !a.due || !a.treasury) return "skipped";
  const plan = a.plan === "lev" ? "lev" : "live";
  const tpk = tradingPubkey();
  try {
    const sig = await paySeatFromTrading(a.treasury, Number(a.seatSol || (plan === "lev" ? 0.15 : 0.1)));
    const done = await confirmPayRetry({
      pubkey: owner,
      payer: tpk,
      signature: sig,
      plan,
      tos: true,
      autoRenew: true,
      action: "renew",
    });
    if (!done.ok) throw new Error(done.error || "renew confirm failed");
    return "paid";
  } catch {
    return "need_phantom";
  }
}
