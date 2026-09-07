"use client";

import { SOL_MINT, USDC_MINT, XSTOCKS, xstockBySymbol, xstockMint } from "@/lib/pair/mints";
import { signAndSendSwap, skimProtocolFee, tradingPubkey } from "./trading";
import type { PairIntent } from "@/lib/types";

function mintFor(label: string): string {
  if (label === "SOL") return SOL_MINT;
  if (label === "USDC") return USDC_MINT;
  const row = xstockBySymbol(label);
  return row ? xstockMint(row.id) : xstockMint("spyx");
}

function qtyKey(id: string): "spyxQty" | "qqqxQty" | "gldxQty" {
  if (id === "qqqx") return "qqqxQty";
  if (id === "gldx") return "gldxQty";
  return "spyxQty";
}

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
  function pxOf(label: string) {
    if (label === "USDC") return 1;
    if (label === "SOL") return opts.solUsd;
    if (label === "QQQx") return opts.qqqxUsd;
    if (label === "GLDx") return opts.gldxUsd;
    return opts.spyxUsd;
  }
  let sig = "";
  if (intent.action === "flatten") {
    const h = opts.holdings;
    for (const x of XSTOCKS) {
      const qty = Number(h?.[qtyKey(x.id)] || 0);
      if (qty > 0.0001) sig = await swap(xstockMint(x.id), SOL_MINT, qty);
    }
    const usdc = Number(h?.usdcQty || 0);
    if (usdc > 1) sig = await swap(USDC_MINT, SOL_MINT, usdc);
  } else if (intent.action === "deploy") {
    if (intent.to && intent.to !== "SOL") {
      const amt = intent.clipUsd / opts.solUsd;
      if (amt > 0.002) sig = await swap(SOL_MINT, mintFor(intent.to), amt);
    } else {
      const slice = (intent.clipUsd * 0.2) / opts.solUsd;
      if (slice > 0.002) sig = await swap(SOL_MINT, USDC_MINT, slice);
      for (const x of XSTOCKS) {
        if (slice > 0.002) sig = await swap(SOL_MINT, xstockMint(x.id), slice);
      }
    }
  } else if (intent.from && intent.to && intent.from !== "none" && intent.to !== "none") {
    const p = pxOf(intent.from);
    const amt = p > 0 ? intent.clipUsd / p : 0;
    if (amt > 0) sig = await swap(mintFor(intent.from), mintFor(intent.to), amt);
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
