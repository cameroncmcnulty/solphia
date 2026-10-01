import { Connection, PublicKey } from "@solana/web3.js";

export const TOKEN_PROGRAM = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
export const TOKEN_2022_PROGRAM = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";

export type TokenBalanceRow = {
  pubkey: string;
  mint?: string;
  uiAmount: number;
  decimals: number;
};

/** One token account, once. Passing the same ATA from Token + Token-2022 queries used to 2x USDC. */
export function sumTokenUiAmount(rows: TokenBalanceRow[], mint?: string): { amount: number; decimals: number } {
  const seen = new Set<string>();
  let amount = 0;
  let decimals = 6;
  for (const row of rows) {
    const id = (row.pubkey || "").trim();
    if (!id || seen.has(id)) continue;
    if (mint && row.mint && row.mint !== mint) continue;
    seen.add(id);
    const ui = Number(row.uiAmount);
    if (!Number.isFinite(ui) || ui <= 0) continue;
    amount += ui;
    const d = Number(row.decimals);
    if (Number.isFinite(d) && d >= 0 && d <= 18) decimals = d;
  }
  return { amount, decimals };
}

function parsedRows(values: { pubkey: PublicKey; account: { data: unknown } }[]): TokenBalanceRow[] {
  const out: TokenBalanceRow[] = [];
  for (const row of values) {
    const data = row.account.data as { parsed?: { info?: { mint?: string; tokenAmount?: { uiAmount?: number; decimals?: number } } } };
    const info = data?.parsed?.info;
    out.push({
      pubkey: row.pubkey.toBase58(),
      mint: info?.mint,
      uiAmount: Number(info?.tokenAmount?.uiAmount) || 0,
      decimals: Number(info?.tokenAmount?.decimals) || 6,
    });
  }
  return out;
}

export async function tokenUiAmount(
  conn: Connection,
  owner: string,
  mint: string,
): Promise<{ amount: number; decimals: number }> {
  const ownerPk = new PublicKey(owner);
  const mintPk = new PublicKey(mint);
  const t22 = new PublicKey(TOKEN_2022_PROGRAM);
  const [legacy, extra] = await Promise.all([
    conn.getParsedTokenAccountsByOwner(ownerPk, { mint: mintPk }),
    conn.getParsedTokenAccountsByOwner(ownerPk, { programId: t22 }),
  ]);
  const rows = [...parsedRows(legacy.value), ...parsedRows(extra.value)];
  return sumTokenUiAmount(rows, mint);
}
