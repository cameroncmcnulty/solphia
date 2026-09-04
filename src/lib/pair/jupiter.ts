import { getJson } from "../feeds/http";
import { SOL_MINT, USDC_MINT, spyxMint, isAllowedMint, routeMintsOk, SPYX_DECIMALS, SOL_DECIMALS, USDC_DECIMALS } from "./mints";

const QUOTE_URLS = [
  "https://lite-api.jup.ag/swap/v1/quote",
  "https://api.jup.ag/swap/v1/quote",
  "https://quote-api.jup.ag/v6/quote",
];

export type JupiterQuote = {
  inputMint: string;
  outputMint: string;
  inAmount: string;
  outAmount: string;
  otherAmountThreshold?: string;
  priceImpactPct: number;
  slippageBps: number;
  routePlan?: { swapInfo?: { inputMint?: string; outputMint?: string; label?: string } }[];
  swapUsdValue?: number;
};

export type QuoteResult =
  | { ok: true; quote: JupiterQuote; impactPct: number; outAmount: number; usd?: number }
  | { ok: false; reason: string };

function toUnits(amount: number, decimals: number): string {
  const n = Math.round(amount * 10 ** decimals);
  return String(Math.max(1, n));
}

function fromUnits(raw: string, decimals: number): number {
  return Number(raw) / 10 ** decimals;
}

function decimals(mint: string): number {
  if (mint === SOL_MINT) return SOL_DECIMALS;
  if (mint === USDC_MINT) return USDC_DECIMALS;
  if (mint === spyxMint()) return SPYX_DECIMALS;
  return 9;
}

function parseQuote(raw: Record<string, unknown>): JupiterQuote | null {
  const inputMint = String(raw.inputMint || "");
  const outputMint = String(raw.outputMint || "");
  const inAmount = String(raw.inAmount || "");
  const outAmount = String(raw.outAmount || "");
  if (!inputMint || !outputMint || !inAmount || !outAmount) return null;
  const impact = Number(raw.priceImpactPct);
  return {
    inputMint,
    outputMint,
    inAmount,
    outAmount,
    otherAmountThreshold: raw.otherAmountThreshold ? String(raw.otherAmountThreshold) : undefined,
    priceImpactPct: Number.isFinite(impact) ? impact : 0,
    slippageBps: Number(raw.slippageBps) || 50,
    routePlan: Array.isArray(raw.routePlan) ? (raw.routePlan as JupiterQuote["routePlan"]) : [],
    swapUsdValue: Number(raw.swapUsdValue) || undefined,
  };
}

function routeMints(quote: JupiterQuote): string[] {
  const mints = new Set<string>([quote.inputMint, quote.outputMint]);
  for (const hop of quote.routePlan || []) {
    if (hop.swapInfo?.inputMint) mints.add(hop.swapInfo.inputMint);
    if (hop.swapInfo?.outputMint) mints.add(hop.swapInfo.outputMint);
  }
  return [...mints];
}

export async function quoteSwap(opts: {
  inputMint: string;
  outputMint: string;
  amount: number;
  slippageBps: number;
}): Promise<QuoteResult> {
  if (!isAllowedMint(opts.inputMint) || !isAllowedMint(opts.outputMint)) {
    return { ok: false, reason: "Mint not on the SOL / USDC / official SPYx allowlist." };
  }
  if (opts.outputMint !== spyxMint() && opts.outputMint !== SOL_MINT && opts.outputMint !== USDC_MINT) {
    return { ok: false, reason: "Refusing lookalike ticker. Official SPYx mint only." };
  }
  const amount = toUnits(opts.amount, decimals(opts.inputMint));
  const q =
    `inputMint=${opts.inputMint}&outputMint=${opts.outputMint}&amount=${amount}` +
    `&slippageBps=${opts.slippageBps}&restrictIntermediateTokens=true`;
  for (const base of QUOTE_URLS) {
    const r = await getJson<Record<string, unknown>>(`${base}?${q}`, 8000);
    if (!r.ok || !r.data) continue;
    const quote = parseQuote(r.data);
    if (!quote) continue;
    if (quote.outputMint !== opts.outputMint) {
      return { ok: false, reason: "Jupiter returned a different output mint. Skip." };
    }
    if (!routeMintsOk(routeMints(quote))) {
      return { ok: false, reason: "Jupiter route hops a junk intermediate. Skip." };
    }
    const impactPct = Math.abs(quote.priceImpactPct) > 1 ? Math.abs(quote.priceImpactPct) / 100 : Math.abs(quote.priceImpactPct);
    return {
      ok: true,
      quote,
      impactPct,
      outAmount: fromUnits(quote.outAmount, decimals(quote.outputMint)),
      usd: quote.swapUsdValue,
    };
  }
  return { ok: false, reason: "Jupiter quote failed." };
}

export async function quoteSolSpyx(solAmount: number, slippageBps: number): Promise<QuoteResult> {
  return quoteSwap({ inputMint: SOL_MINT, outputMint: spyxMint(), amount: solAmount, slippageBps });
}

export async function quoteSpyxSol(spyxAmount: number, slippageBps: number): Promise<QuoteResult> {
  return quoteSwap({ inputMint: spyxMint(), outputMint: SOL_MINT, amount: spyxAmount, slippageBps });
}

export async function quoteToUsdc(inputMint: string, amount: number, slippageBps: number): Promise<QuoteResult> {
  return quoteSwap({ inputMint, outputMint: USDC_MINT, amount, slippageBps });
}

export async function quoteFromUsdc(outputMint: string, usdcAmount: number, slippageBps: number): Promise<QuoteResult> {
  return quoteSwap({ inputMint: USDC_MINT, outputMint, amount: usdcAmount, slippageBps });
}

export type SwapTxResult = { ok: true; transaction: string } | { ok: false; reason: string };

export async function buildSwapTx(quote: JupiterQuote, userPublicKey: string): Promise<SwapTxResult> {
  const urls = ["https://lite-api.jup.ag/swap/v1/swap", "https://api.jup.ag/swap/v1/swap"];
  for (const url of urls) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({
          quoteResponse: quote,
          userPublicKey,
          wrapAndUnwrapSol: true,
          dynamicComputeUnitLimit: true,
          prioritizationFeeLamports: "auto",
        }),
      });
      if (!res.ok) continue;
      const j = (await res.json()) as { swapTransaction?: string };
      if (j.swapTransaction) return { ok: true, transaction: j.swapTransaction };
    } catch {
      // try next
    }
  }
  return { ok: false, reason: "Jupiter swap build failed." };
}
