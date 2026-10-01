import { Connection, PublicKey, LAMPORTS_PER_SOL, type AccountInfo, type Commitment, type GetAccountInfoConfig } from "@solana/web3.js";
import { rpcUrl, HELIUS_API_KEY, SUBSCRIPTION_SOL } from "../config";

const WSOL = "So11111111111111111111111111111111111111112";
const STABLE = new Set([
  WSOL,
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
  "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb",
  "11111111111111111111111111111111",
  "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s",
  "dbcij3LWUppWqq96dh6gJWwBifmcGfLSB5D4DuSMaqN",
  "ComputeBudget111111111111111111111111111111",
  "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL",
]);

const accountCache = new Map<string, { at: number; info: AccountInfo<Buffer> | null }>();

function isRateLimit(e: unknown) {
  const m = e instanceof Error ? e.message : String(e);
  return /429|Too Many Requests|rate.?limit|busy/i.test(m);
}

async function rpcFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  let wait = 400;
  let last: Response | null = null;
  for (let i = 0; i < 3; i++) {
    const res = await fetch(input, init);
    last = res;
    if (res.status !== 429) return res;
    if (i === 2) return res;
    const retryAfter = Number(res.headers.get("retry-after"));
    const delay = Number.isFinite(retryAfter) && retryAfter > 0 ? Math.min(retryAfter * 1000, 2_000) : wait;
    await new Promise((r) => setTimeout(r, delay));
    wait = Math.min(2_000, wait * 2);
  }
  return last!;
}

class SolphiaConnection extends Connection {
  async getAccountInfo(
    publicKey: PublicKey,
    commitmentOrConfig?: Commitment | GetAccountInfoConfig,
  ): Promise<AccountInfo<Buffer> | null> {
    const key = publicKey.toBase58();
    const ttl = STABLE.has(key) ? 15 * 60_000 : 0;
    const hit = accountCache.get(key);
    if (ttl && hit && Date.now() - hit.at < ttl) return hit.info;
    let last: unknown;
    for (let i = 0; i < 3; i++) {
      try {
        const info = await super.getAccountInfo(publicKey, commitmentOrConfig);
        if (ttl) accountCache.set(key, { at: Date.now(), info });
        return info;
      } catch (e) {
        last = e;
        if (!isRateLimit(e) || i === 2) throw e;
        await new Promise((r) => setTimeout(r, 400 * 2 ** i));
      }
    }
    throw last instanceof Error ? last : new Error("rpc");
  }
}

let conn: Connection | null = null;

export function connection(): Connection {
  const url = rpcUrl();
  if (!conn || conn.rpcEndpoint !== url) {
    conn = new SolphiaConnection(url, {
      commitment: "confirmed",
      fetch: rpcFetch as typeof fetch,
      disableRetryOnRateLimit: true,
    });
    void conn.getAccountInfo(new PublicKey(WSOL)).catch(() => undefined);
  }
  return conn;
}

export function rpcBusyMessage(e: unknown): string | null {
  const m = e instanceof Error ? e.message : String(e);
  if (/429|Too Many Requests|rate.?limit/i.test(m)) {
    return "Solana is busy right now. Wait a few seconds and tap Launch again.";
  }
  return null;
}

export function heliusEnabled(): boolean {
  return Boolean(HELIUS_API_KEY);
}

export async function waitForSignature(sig: string, tries = 40): Promise<{ ok: boolean; err?: string }> {
  if (!sig) return { ok: false, err: "missing" };
  for (let i = 0; i < tries; i++) {
    try {
      const st = await connection().getSignatureStatuses([sig], { searchTransactionHistory: true });
      const v = st.value[0];
      if (v?.err) return { ok: false, err: typeof v.err === "string" ? v.err : "failed" };
      if (v?.confirmationStatus === "confirmed" || v?.confirmationStatus === "finalized") return { ok: true };
    } catch {
      /* rpc blip */
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  return { ok: false, err: "timeout" };
}

export function subscriptionLamports(): number {
  return Math.round(SUBSCRIPTION_SOL * LAMPORTS_PER_SOL);
}

export async function confirmedHouseTransfers(opts: {
  signature: string;
  from: string;
  legs: { to: string; lamports: number }[];
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const tx = await connection().getParsedTransaction(opts.signature, {
      maxSupportedTransactionVersion: 0,
      commitment: "confirmed",
    });
    if (!tx) return { ok: false, error: "Transaction not found yet." };
    if (tx.meta?.err) return { ok: false, error: "Transaction failed on-chain." };
    const paid = new Map<string, number>();
    for (const ix of tx.transaction.message.instructions) {
      if (!("parsed" in ix)) continue;
      const parsed = ix.parsed as { type?: string; info?: { source?: string; destination?: string; lamports?: number } };
      if (parsed.type !== "transfer" || parsed.info?.source !== opts.from) continue;
      const dest = parsed.info?.destination || "";
      paid.set(dest, (paid.get(dest) || 0) + Number(parsed.info?.lamports || 0));
    }
    for (const leg of opts.legs) {
      if ((paid.get(leg.to) || 0) < leg.lamports) {
        return { ok: false, error: "No matching SOL transfer instruction." };
      }
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "rpc error" };
  }
}

export async function confirmedSolTransfer(opts: {
  signature: string;
  from: string;
  to: string;
  lamports: number;
}): Promise<{ ok: boolean; error?: string }> {
  return confirmedHouseTransfers({
    signature: opts.signature,
    from: opts.from,
    legs: [{ to: opts.to, lamports: opts.lamports }],
  });
}

export function isPubkey(value: string): boolean {
  try {
    new PublicKey(value);
    return true;
  } catch {
    return false;
  }
}
