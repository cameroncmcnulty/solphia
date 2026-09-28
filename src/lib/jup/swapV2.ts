/** Jupiter Swap V2 /order + /execute. https://developers.jup.ag/docs/swap/order-and-execute#fees */

import { PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { connection } from "@/lib/solana/connection";

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

/** lite-api.jup.ag/swap/v2 is 404. Paid path is api.jup.ag/swap/v2. Keyless fallback is Ultra v1. */
export function orderUrls() {
  const paid = "https://api.jup.ag/swap/v2/order";
  const lite = "https://lite-api.jup.ag/ultra/v1/order";
  return apiKey() ? [paid] : [paid, lite];
}

export function executeUrls() {
  const paid = "https://api.jup.ag/swap/v2/execute";
  const lite = "https://lite-api.jup.ag/ultra/v1/execute";
  return apiKey() ? [paid] : [paid, lite];
}

export function jupFeeStatus() {
  const ref = referralAccount();
  return {
    hasApiKey: Boolean(apiKey()),
    referralAccount: ref || null,
    referralFeeBps: JUP_FEE_BPS,
    note: ref
      ? "1% integrator fee (Jupiter keeps 20% of that). SOL and USDC referral token accounts must exist."
      : "Swaps work, but Solphia does not collect the 1% until JUPITER_REFERRAL_ACCOUNT is set.",
  };
}

function referralAta(mint: string, owner: string) {
  return getAssociatedTokenAddressSync(new PublicKey(mint), new PublicKey(owner), true, TOKEN_PROGRAM_ID);
}

let feeAccountsCache: { at: number; data: { sol: boolean; usdc: boolean; collecting: boolean } } | null = null;

export async function jupFeeAccounts() {
  const ref = referralAccount();
  if (!ref) return { sol: false, usdc: false, collecting: false };
  if (feeAccountsCache && Date.now() - feeAccountsCache.at < 60_000) return feeAccountsCache.data;
  const conn = connection();
  const [sol, usdc] = await Promise.all([
    conn.getAccountInfo(referralAta(SOL, ref), "confirmed").then((a) => Boolean(a)),
    conn.getAccountInfo(referralAta(USDC, ref), "confirmed").then((a) => Boolean(a)),
  ]);
  const data = { sol, usdc, collecting: sol || usdc };
  feeAccountsCache = { at: Date.now(), data };
  return data;
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
  let last = "Jupiter order failed";
  for (const base of orderUrls()) {
    const r = await fetch(`${base}?${params.toString()}`, {
      headers: headers(),
      cache: "no-store",
      signal: AbortSignal.timeout(12_000),
    });
    const raw = await r.text();
    let j = {} as JupOrder & { error?: string; message?: string };
    try {
      j = JSON.parse(raw) as JupOrder & { error?: string; message?: string };
    } catch {
      last = raw.slice(0, 120) || `Jupiter order failed (${r.status})`;
      if (r.status === 404 || r.status === 401 || r.status === 403) continue;
      throw new Error(last);
    }
    if (!r.ok) {
      last = j.error || j.message || j.errorMessage || `Jupiter order failed (${r.status})`;
      if (r.status === 404 || r.status === 401 || r.status === 403) continue;
      throw new Error(last);
    }
    if (!j.transaction) throw new Error(j.errorMessage || j.error || "Jupiter quoted but could not build a swap.");
    return j;
  }
  throw new Error(last);
}

export async function jupExecute(opts: { signedTransaction: string; requestId: string }) {
  let last = "Jupiter execute failed";
  for (const url of executeUrls()) {
    const r = await fetch(url, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({
        signedTransaction: opts.signedTransaction,
        requestId: opts.requestId,
      }),
      signal: AbortSignal.timeout(30_000),
    });
    const raw = await r.text();
    let j: {
      status?: string;
      signature?: string;
      code?: number;
      error?: string;
      errorMessage?: string;
      totalOutputAmount?: string;
    } = {};
    try {
      j = JSON.parse(raw) as typeof j;
    } catch {
      last = raw.slice(0, 120) || `Jupiter execute failed (${r.status})`;
      if (r.status === 404 || r.status === 401 || r.status === 403) continue;
      throw new Error(last);
    }
    if (!r.ok) {
      last = j.error || j.errorMessage || `Jupiter execute failed (${r.status})`;
      if (r.status === 404 || r.status === 401 || r.status === 403) continue;
      throw new Error(last);
    }
    if (j.status && j.status !== "Success") throw new Error(j.error || j.errorMessage || "Jupiter swap failed.");
    if (!j.signature) throw new Error("Jupiter did not return a signature.");
    return j;
  }
  throw new Error(last);
}

export { SOL as JUP_SOL, USDC as JUP_USDC };
