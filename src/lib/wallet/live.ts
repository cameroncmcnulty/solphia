"use client";

import { USDC_MINT } from "@/lib/pair/mints";
import { planIntentSwaps } from "@/lib/live/intent";
import { BOT_SLIPPAGE_BPS } from "@/lib/config";
import { signAndSendSwap, tradingPubkey } from "./trading";
import type { PairIntent } from "@/lib/types";

export async function executePendingIntent(opts: {
  owner: string;
  intent: PairIntent;
  solUsd: number;
  spyxUsd: number;
  qqqxUsd: number;
  gldxUsd: number;
  holdings?: { spyxQty?: number; qqqxQty?: number; gldxQty?: number; usdcQty?: number };
  treasury?: string;
}): Promise<string> {
  const { owner, intent } = opts;
  const tpk = tradingPubkey();
  const slip = BOT_SLIPPAGE_BPS;
  async function swapOne(inputMint: string, outputMint: string, amount: number, fee = false) {
    const r = await fetch("/api/pair/swap", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        owner,
        tradingPubkey: tpk,
        inputMint,
        outputMint,
        amount,
        slippageBps: slip,
        clipUsd: fee ? intent.clipUsd : 0,
        solUsd: fee ? opts.solUsd : 0,
      }),
    });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error || "swap build failed");
    if (j.viaUsdc && j.midAmount > 0) {
      await swapOne(inputMint, USDC_MINT, amount, fee);
      return swapOne(USDC_MINT, outputMint, j.midAmount, false);
    }
    if (!j.transaction) throw new Error("swap build failed");
    return signAndSendSwap(j.transaction);
  }
  let sig = "";
  const legs = planIntentSwaps({
    intent,
    solUsd: opts.solUsd,
    spyxUsd: opts.spyxUsd,
    qqqxUsd: opts.qqqxUsd,
    gldxUsd: opts.gldxUsd,
    holdings: opts.holdings,
  });
  for (let i = 0; i < legs.length; i++) {
    const leg = legs[i];
    sig = await swapOne(leg.inputMint, leg.outputMint, leg.amount, i === 0);
  }
  if (!sig) throw new Error("no live swap built");
  await fetch("/api/auto", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ owner, liveFill: { signature: sig } }),
  });
  return sig;
}
