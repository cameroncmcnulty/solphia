import { SOL_MINT, USDC_MINT, spyxMint, isAllowedMint, routeMintsOk, SPYX_DECIMALS, SOL_DECIMALS, USDC_DECIMALS } from "./mints";

const QUOTE_URLS = ["https://lite-api.jup.ag/swap/v1/quote", "https://api.jup.ag/swap/v1/quote"];
const SWAP_URLS = ["https://lite-api.jup.ag/swap/v1/swap", "https://api.jup.ag/swap/v1/swap"];

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
  | { ok: true; quote: JupiterQuote; impactPct: number; outAmount: number; usd?: number; viaUsdc?: boolean; midAmount?: number }
  | { ok: false; reason: string };

function jupHeaders(): Record<string, string> {
  const key = (process.env.JUPITER_API_KEY || "").trim();
  const h: Record<string, string> = {
    accept: "application/json",
    "user-agent": "Mozilla/5.0 (compatible; Solphia/2.0; +https://solphia.io)",
  };
  if (key) h["x-api-key"] = key;
  return h;
}

async function jupFetch(url: string, init?: RequestInit, timeoutMs = 12_000): Promise<{ ok: boolean; status: number; data?: any; error?: string }> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      ...init,
      signal: ctrl.signal,
      cache: "no-store",
      headers: { ...jupHeaders(), ...(init?.headers || {}) },
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      const msg = data && (data.error || data.message) ? String(data.error || data.message) : `HTTP ${res.status}`;
      return { ok: false, status: res.status, data, error: msg };
    }
    return { ok: true, status: res.status, data };
  } catch (err) {
    return { ok: false, status: 0, error: err instanceof Error ? err.message : "fetch failed" };
  } finally {
    clearTimeout(timer);
  }
}

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
  if (raw.error) return null;
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

async function quoteOnce(opts: {
  inputMint: string;
  outputMint: string;
  amount: number;
  slippageBps: number;
  extra?: string;
}): Promise<QuoteResult> {
  if (!isAllowedMint(opts.inputMint) || !isAllowedMint(opts.outputMint)) {
    return { ok: false, reason: "Mint not on the SOL / USDC / official SPYx allowlist." };
  }
  if (opts.outputMint !== spyxMint() && opts.outputMint !== SOL_MINT && opts.outputMint !== USDC_MINT) {
    return { ok: false, reason: "Refusing lookalike ticker. Official SPYx mint only." };
  }
  const amount = toUnits(opts.amount, decimals(opts.inputMint));
  const qs =
    `inputMint=${opts.inputMint}&outputMint=${opts.outputMint}&amount=${amount}` +
    `&slippageBps=${opts.slippageBps}&restrictIntermediateTokens=true` +
    (opts.extra ? `&${opts.extra}` : "");
  let last = "Jupiter quote failed.";
  for (const base of QUOTE_URLS) {
    const r = await jupFetch(`${base}?${qs}`);
    if (!r.ok || !r.data) {
      last = r.error || last;
      continue;
    }
    const quote = parseQuote(r.data as Record<string, unknown>);
    if (!quote) {
      last = String((r.data as any).error || (r.data as any).message || "Jupiter returned no route.");
      continue;
    }
    if (quote.outputMint !== opts.outputMint) {
      last = "Jupiter returned a different output mint. Skip.";
      continue;
    }
    const hops = routeMints(quote);
    if (!routeMintsOk(hops)) {
      last = `Jupiter route hops a non-allowlisted mint (${hops.filter((m) => !isAllowedMint(m)).join(",") || "unknown"}).`;
      continue;
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
  return { ok: false, reason: last };
}

export async function quoteSwap(opts: {
  inputMint: string;
  outputMint: string;
  amount: number;
  slippageBps: number;
}): Promise<QuoteResult> {
  const first = await quoteOnce(opts);
  if (first.ok) return first;
  const direct = await quoteOnce({ ...opts, extra: "onlyDirectRoutes=true" });
  if (direct.ok) return direct;
  if (opts.inputMint !== USDC_MINT && opts.outputMint !== USDC_MINT) {
    const toUsdc = await quoteOnce({
      inputMint: opts.inputMint,
      outputMint: USDC_MINT,
      amount: opts.amount,
      slippageBps: opts.slippageBps,
    });
    if (toUsdc.ok) {
      const fromUsdc = await quoteOnce({
        inputMint: USDC_MINT,
        outputMint: opts.outputMint,
        amount: toUsdc.outAmount,
        slippageBps: opts.slippageBps,
      });
      if (fromUsdc.ok) {
        return {
          ...fromUsdc,
          impactPct: toUsdc.impactPct + fromUsdc.impactPct,
          viaUsdc: true,
          midAmount: toUsdc.outAmount,
        };
      }
    }
  }
  return first;
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
  for (const url of SWAP_URLS) {
    const r = await jupFetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        quoteResponse: quote,
        userPublicKey,
        wrapAndUnwrapSol: true,
        dynamicComputeUnitLimit: true,
        prioritizationFeeLamports: "auto",
      }),
    });
    if (r.ok && r.data?.swapTransaction) return { ok: true, transaction: r.data.swapTransaction };
    if (r.error) {
      /* try next */
    }
  }
  return { ok: false, reason: "Jupiter swap build failed." };
}
