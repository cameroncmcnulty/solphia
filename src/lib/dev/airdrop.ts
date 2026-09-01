import { isSolanaAddress } from "../security";

export type Recipient = { address: string; weight: number };

export function parseRecipients(text: string): Recipient[] {
  const rows: Recipient[] = [];
  const seen = new Set<string>();
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const parts = line.split(/[,;\s]+/).filter(Boolean);
    const address = parts[0];
    if (!isSolanaAddress(address) || seen.has(address)) continue;
    seen.add(address);
    const weight = parts[1] != null && Number.isFinite(Number(parts[1])) ? Math.max(0, Number(parts[1])) : 1;
    if (weight <= 0) continue;
    rows.push({ address, weight });
  }
  return rows;
}

export function allocate(recipients: Recipient[], totalRaw: bigint): { address: string; amount: bigint }[] {
  if (!recipients.length || totalRaw <= 0n) return [];
  const sum = recipients.reduce((s, r) => s + r.weight, 0);
  if (sum <= 0) return [];
  const out: { address: string; amount: bigint }[] = [];
  let used = 0n;
  for (let i = 0; i < recipients.length; i++) {
    const r = recipients[i];
    const amount =
      i === recipients.length - 1
        ? totalRaw - used
        : (totalRaw * BigInt(Math.round((r.weight / sum) * 1_000_000))) / 1_000_000n;
    if (amount <= 0n) continue;
    used += amount;
    out.push({ address: r.address, amount });
  }
  return out;
}

export function batches<T>(items: T[], size = 6): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

export function toRawAmount(tokens: number, decimals: number): bigint {
  if (!Number.isFinite(tokens) || tokens <= 0) return 0n;
  const d = Math.max(0, Math.min(9, Math.floor(decimals)));
  const [w, f = ""] = String(tokens).split(".");
  const frac = (f + "0".repeat(d)).slice(0, d);
  return BigInt(w + frac);
}
