import type { LaunchFill } from "../launch/engine";
import type { EnhancedTx } from "../desk/fundingGraph";

/** Meteora DBC token vault authority. Buys are mint out of this, sells are mint in. */
export const DBC_POOL_AUTHORITY = "FhVo3mqL8PW5pH5U2CN4XE33DokiyZnUwuGpH2hmHLuM";
const WSOL = "So11111111111111111111111111111111111111112";

export type SniperStats = {
  buys: number;
  sells: number;
  volumeSol: number;
  buySol: number;
  snipers: number;
  curveSol: number;
  at?: number;
};

export function emptySnipers(): SniperStats {
  return { buys: 0, sells: 0, volumeSol: 0, buySol: 0, snipers: 0, curveSol: 0 };
}

function roundSol(n: number): number {
  return Math.round(n * 1e9) / 1e9;
}

function asSol(raw: number): number {
  if (!(raw > 0) || !Number.isFinite(raw)) return 0;
  return raw >= 1_000_000 ? raw / 1e9 : raw;
}

function paidSol(tx: EnhancedTx, who: string, dir: "from" | "to"): number {
  let lamports = 0;
  for (const n of tx.nativeTransfers || []) {
    const a = dir === "from" ? n.fromUserAccount : n.toUserAccount;
    if (a === who) lamports += Number(n.amount) || 0;
  }
  let wsol = 0;
  for (const t of tx.tokenTransfers || []) {
    if (t.mint !== WSOL) continue;
    const a = dir === "from" ? t.fromUserAccount : t.toUserAccount;
    if (a === who) wsol += asSol(Number(t.tokenAmount) || 0);
  }
  return Math.max(lamports / 1e9, wsol);
}

/** Unique buyers/sellers from Helius-enhanced DBC tape. Skip launch + holdings. */
export function chainSniperStats(opts: {
  mint: string;
  txs: EnhancedTx[];
  skip?: Iterable<string>;
  curveSol?: number;
}): SniperStats {
  const mint = opts.mint;
  const skip = new Set([...(opts.skip || [])].filter(Boolean));
  skip.add(DBC_POOL_AUTHORITY);
  const buyWallets = new Set<string>();
  let buys = 0;
  let sells = 0;
  let buySol = 0;
  let volumeSol = 0;
  for (const tx of opts.txs || []) {
    const moves = (tx.tokenTransfers || []).filter((t) => t.mint === mint);
    if (!moves.length) continue;
    const buyers = new Set<string>();
    const sellers = new Set<string>();
    for (const t of moves) {
      const from = t.fromUserAccount || "";
      const to = t.toUserAccount || "";
      if (!from || !to || from === to) continue;
      if (!skip.has(to) && paidSol(tx, to, "from") > 0.001) buyers.add(to);
      if (!skip.has(from) && paidSol(tx, from, "to") > 0.001) sellers.add(from);
      if (from === DBC_POOL_AUTHORITY && !skip.has(to)) buyers.add(to);
      if (to === DBC_POOL_AUTHORITY && !skip.has(from)) sellers.add(from);
    }
    for (const w of buyers) {
      if (sellers.has(w)) continue;
      buys += 1;
      buyWallets.add(w);
      const sol = paidSol(tx, w, "from");
      buySol += sol;
      volumeSol += sol;
    }
    for (const w of sellers) {
      if (buyers.has(w)) continue;
      sells += 1;
      const sol = paidSol(tx, w, "to");
      volumeSol += sol;
    }
  }
  return {
    buys,
    sells,
    volumeSol: roundSol(volumeSol),
    buySol: roundSol(buySol),
    snipers: buyWallets.size,
    curveSol: Number(opts.curveSol) || 0,
  };
}

export function sniperStats(
  coin: { creator?: string; fills?: LaunchFill[] } | null | undefined,
  curveSol = 0,
): SniperStats {
  const creator = (coin?.creator || "").trim();
  const fills = Array.isArray(coin?.fills) ? coin!.fills! : [];
  const snipes = fills.filter((f) => f.owner && f.owner !== creator);
  const wallets = new Set(snipes.map((f) => f.owner));
  const buys = snipes.filter((f) => f.side === "buy");
  const round = (n: number) => Math.round(n * 1e9) / 1e9;
  return {
    buys: buys.length,
    sells: snipes.filter((f) => f.side === "sell").length,
    volumeSol: round(snipes.reduce((s, f) => s + (Number(f.sol) || 0), 0)),
    buySol: round(buys.reduce((s, f) => s + (Number(f.sol) || 0), 0)),
    snipers: wallets.size,
    curveSol: Number(curveSol) || 0,
  };
}
