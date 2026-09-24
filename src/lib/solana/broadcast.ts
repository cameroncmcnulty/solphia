import { rpcUrl } from "../config";

export async function broadcastB64(b64: string): Promise<string> {
  const r = await fetch(rpcUrl(), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "sendTransaction",
      params: [b64, { encoding: "base64", skipPreflight: true, preflightCommitment: "confirmed", maxRetries: 3 }],
    }),
    signal: AbortSignal.timeout(8_000),
  });
  const j = (await r.json()) as { result?: string; error?: { message?: string } };
  if (!r.ok || j.error || typeof j.result !== "string") {
    throw new Error(j.error?.message || "send failed");
  }
  return j.result;
}
