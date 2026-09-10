"use client";

import { SOL_MINT, USDC_MINT, XSTOCKS, xstockMint } from "@/lib/pair/mints";
import { planIntentSwaps } from "@/lib/live/intent";
import { signAndSendSwap, skimProtocolFee, tradingPubkey } from "./trading";
import type { PairIntent } from "@/lib/types";

function xstockLabel(mint: string): string {
  const row = XSTOCKS.find((x) => xstockMint(x.id) === mint);
  return row?.symbol || "SPYx";
}

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
  const slip = 50;
  async function swapOne(inputMint: string, outputMint: string, amount: number) {
    const r = await fetch("/api/pair/swap", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ owner, tradingPubkey: tpk, inputMint, outputMint, amount, slippageBps: slip }),
    });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error || "swap build failed");
    return signAndSendSwap(j.transaction);
  }
  async function swap(inputMint: string, outputMint: string, amount: number) {
    const from = inputMint === SOL_MINT ? "SOL" : inputMint === USDC_MINT ? "USDC" : xstockLabel(inputMint);
    const to = outputMint === SOL_MINT ? "SOL" : outputMint === USDC_MINT ? "USDC" : xstockLabel(outputMint);
    const q = await fetch(`/api/pair/quote?from=${from}&to=${to}&amount=${amount}&slippageBps=${slip}`).then((r) => r.json());
    if (!q.ok) throw new Error(q.reason || "quote failed");
    if (q.viaUsdc && q.midAmount > 0) {
      await swapOne(inputMint, USDC_MINT, amount);
      return swapOne(USDC_MINT, outputMint, q.midAmount);
    }
    return swapOne(inputMint, outputMint, amount);
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
  for (const leg of legs) {
    sig = await swap(leg.inputMint, leg.outputMint, leg.amount);
  }
  if (!sig) throw new Error("no live swap built");
  await fetch("/api/auto", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ owner, liveFill: { signature: sig } }),
  });
  if (opts.treasury && opts.solUsd > 0 && intent.clipUsd > 0) {
    try {
      await skimProtocolFee(opts.treasury, intent.clipUsd, opts.solUsd);
    } catch {
      /* fee skim is best-effort */
    }
  }
  return sig;
}
