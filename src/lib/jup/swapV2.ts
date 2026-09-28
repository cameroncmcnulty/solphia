/** Jupiter Swap V2 /order + /execute. https://developers.jup.ag/docs/swap/order-and-execute#fees */

export const JUP_FEE_BPS = 100;
const SOL = "So11111111111111111111111111111111111111112";
const USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
/** Public Jupiter referral account (not a secret). Override with JUPITER_REFERRAL_ACCOUNT. */
const JUP_REFERRAL_DEFAULT = "rT14BqLLxVXiyK3ZeoeK8kCuU9sCQHVYUCXuBjeG8cV";

function apiKey() {
  return (process.env.JUPITER_API_KEY || "").trim();
}

function referralAccount() {
  return (process.env.JUPITER_REFERRAL_ACCOUNT || process.env.NEXT_PUBLIC_JUPITER_REFERRAL_ACCOUNT || JUP_REFERRAL_DEFAULT).trim();
}

function headers(): Record<string, string> {
  const h: Record<string, string> = { accept: "application/json", "content-type": "application/json" };
  const key = apiKey();
  if (key) h["x-api-key"] = key;
  return h;
}

function orderUrl() {
  return apiKey() ? "https://api.jup.ag/swap/v2/order" : "https://lite-api.jup.ag/swap/v2/order";
}

function executeUrl() {
  return apiKey() ? "https://api.jup.ag/swap/v2/execute" : "https://lite-api.jup.ag/swap/v2/execute";
}

export function jupFeeStatus() {
  return {
    hasApiKey: Boolean(apiKey()),
    referralAccount: referralAccount() || null,
    referralFeeBps: JUP_FEE_BPS,
    note: referralAccount()
      ? "1% integrator fee (Jupiter keeps 20% of that). Needs a referral token account for the fee mint (SOL first)."
      : "Swaps work, but Solphia does not collect the 1% until JUPITER_REFERRAL_ACCOUNT is set (create at referral.jup.ag, Ultra project).",
  };
}

export type JupOrder = {
  transaction: string;
  requestId: string;
  outAmount: string;
  inAmount?: string;
  feeBps?: number;
  feeMint?: string;
  router?: string;
  mode?: string;
  errorCode?: number;
  errorMessage?: string;
  referralAccount?: string;
  platformFee?: { amount?: string; feeBps?: number; feeMint?: string };
};

export async function jupOrder(opts: {
  inputMint: string;
  outputMint: string;
  amount: string;
  taker: string;
}): Promise<JupOrder> {
  const params = new URLSearchParams({
    inputMint: opts.inputMint,
    outputMint: opts.outputMint,
    amount: opts.amount,
    taker: opts.taker,
  });
  const ref = referralAccount();
  if (ref) {
    params.set("referralAccount", ref);
    params.set("referralFee", String(JUP_FEE_BPS));
  }
  const r = await fetch(`${orderUrl()}?${params.toString()}`, {
    headers: headers(),
    cache: "no-store",
    signal: AbortSignal.timeout(12_000),
  });
  const j = (await r.json().catch(() => ({}))) as JupOrder & { error?: string; message?: string };
  if (!r.ok) throw new Error(j.error || j.message || j.errorMessage || `Jupiter order failed (${r.status})`);
  if (!j.transaction) throw new Error(j.errorMessage || "Jupiter quoted but could not build a swap.");
  return j;
}

export async function jupExecute(opts: { signedTransaction: string; requestId: string }) {
  const r = await fetch(executeUrl(), {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      signedTransaction: opts.signedTransaction,
      requestId: opts.requestId,
    }),
    signal: AbortSignal.timeout(30_000),
  });
  const j = (await r.json().catch(() => ({}))) as {
    status?: string;
    signature?: string;
    code?: number;
    error?: string;
    errorMessage?: string;
    totalOutputAmount?: string;
  };
  if (!r.ok) throw new Error(j.error || j.errorMessage || `Jupiter execute failed (${r.status})`);
  if (j.status && j.status !== "Success") throw new Error(j.error || j.errorMessage || "Jupiter swap failed.");
  if (!j.signature) throw new Error("Jupiter did not return a signature.");
  return j;
}

export { SOL as JUP_SOL, USDC as JUP_USDC };
