import { SOL_MINT, USDC_MINT, XSTOCKS, xstockBySymbol, xstockMint } from "../pair/mints";
import type { PairIntent } from "../types";

export type SwapLeg = { inputMint: string; outputMint: string; amount: number };

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

export function planIntentSwaps(opts: {
  intent: PairIntent;
  solUsd: number;
  spyxUsd: number;
  qqqxUsd: number;
  gldxUsd: number;
  holdings?: { spyxQty?: number; qqqxQty?: number; gldxQty?: number; usdcQty?: number };
}): SwapLeg[] {
  const { intent } = opts;
  const legs: SwapLeg[] = [];
  const minSol = 0.002;
  function pxOf(label: string) {
    if (label === "USDC") return 1;
    if (label === "SOL") return opts.solUsd;
    if (label === "QQQx") return opts.qqqxUsd;
    if (label === "GLDx") return opts.gldxUsd;
    return opts.spyxUsd;
  }
  if (intent.action === "flatten") {
    const h = opts.holdings;
    for (const x of XSTOCKS) {
      const qty = Number(h?.[qtyKey(x.id)] || 0);
      if (qty > 0.0001) legs.push({ inputMint: xstockMint(x.id), outputMint: SOL_MINT, amount: qty });
    }
    const usdc = Number(h?.usdcQty || 0);
    if (usdc > 1) legs.push({ inputMint: USDC_MINT, outputMint: SOL_MINT, amount: usdc });
  } else if (intent.action === "deploy") {
    if (intent.to && intent.to !== "SOL") {
      const amt = opts.solUsd > 0 ? intent.clipUsd / opts.solUsd : 0;
      if (amt > minSol) legs.push({ inputMint: SOL_MINT, outputMint: mintFor(intent.to), amount: amt });
    } else {
      const slice = opts.solUsd > 0 ? (intent.clipUsd * 0.2) / opts.solUsd : 0;
      if (slice > minSol) legs.push({ inputMint: SOL_MINT, outputMint: USDC_MINT, amount: slice });
      for (const x of XSTOCKS) {
        if (slice > minSol) legs.push({ inputMint: SOL_MINT, outputMint: xstockMint(x.id), amount: slice });
      }
    }
  } else if (intent.from && intent.to && intent.from !== "none" && intent.to !== "none") {
    const p = pxOf(intent.from);
    const amt = p > 0 ? intent.clipUsd / p : 0;
    if (amt > 0) legs.push({ inputMint: mintFor(intent.from), outputMint: mintFor(intent.to), amount: amt });
  }
  return legs;
}
