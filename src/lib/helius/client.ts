import { HELIUS_API_KEY, rpcUrl } from "../config";
import { isSolanaAddress } from "../security";
import type { EnhancedTx } from "../desk/fundingGraph";

const ENHANCED = "https://api.helius.xyz/v0";

export function heliusConfigured(): boolean {
  return Boolean(HELIUS_API_KEY);
}

export async function heliusHealth(): Promise<boolean> {
  if (!HELIUS_API_KEY) return false;
  try {
    const res = await fetch(rpcUrl(), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getHealth" }),
      signal: AbortSignal.timeout(6000),
    });
    const json = (await res.json()) as { result?: string };
    return json.result === "ok";
  } catch {
    return false;
  }
}

export async function fetchAddressTxs(address: string, limit = 40): Promise<EnhancedTx[]> {
  if (!HELIUS_API_KEY || !isSolanaAddress(address)) return [];
  const url = `${ENHANCED}/addresses/${encodeURIComponent(address)}/transactions?api-key=${HELIUS_API_KEY}&limit=${limit}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000), cache: "no-store" });
    if (!res.ok) return [];
    const json = (await res.json()) as unknown;
    return Array.isArray(json) ? (json as EnhancedTx[]) : [];
  } catch {
    return [];
  }
}
