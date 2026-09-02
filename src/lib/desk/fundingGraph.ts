/** Pure funding-graph parse. Network I/O lives in helius/client + tagFundingDumps. */

export type NativeTransfer = {
  fromUserAccount?: string;
  toUserAccount?: string;
  amount?: number;
};

export type TokenTransfer = {
  fromUserAccount?: string;
  toUserAccount?: string;
  mint?: string;
  tokenAmount?: number | string;
};

export type EnhancedTx = {
  signature?: string;
  slot: number;
  timestamp?: number;
  feePayer?: string;
  nativeTransfers?: NativeTransfer[];
  tokenTransfers?: TokenTransfer[];
};

/** ~1 minute on Solana (~400ms slots). */
export const MINUTE_SLOTS = 150;

export type DumpRead = {
  flatten: boolean;
  reason: string;
  fundedSellers: number;
};

export function mergeTxs(a: EnhancedTx[], b: EnhancedTx[]): EnhancedTx[] {
  const bySig = new Map<string, EnhancedTx>();
  for (const tx of [...a, ...b]) {
    const key = tx.signature || `slot:${tx.slot}:${tx.feePayer || ""}`;
    if (!bySig.has(key)) bySig.set(key, tx);
  }
  return [...bySig.values()].sort((x, y) => x.slot - y.slot);
}

/**
 * Deployer (or a hop) funds a wallet, that wallet sells the mint
 * in the same slot or in the minute before the dump.
 * SOL received as *sale proceeds* in the sell tx is not funding.
 */
export function dumpSignal(opts: { mint: string; creator?: string; txs: EnhancedTx[] }): DumpRead {
  const mint = opts.mint;
  const creator = opts.creator;
  const fundings: { from: string; to: string; slot: number }[] = [];
  const sells: { seller: string; slot: number }[] = [];

  for (const tx of opts.txs) {
    const sellers = new Set<string>();
    for (const t of tx.tokenTransfers || []) {
      if (t.mint !== mint) continue;
      if (t.fromUserAccount && t.toUserAccount && t.fromUserAccount !== t.toUserAccount) {
        sellers.add(t.fromUserAccount);
        sells.push({ seller: t.fromUserAccount, slot: tx.slot });
      }
    }
    for (const n of tx.nativeTransfers || []) {
      const from = n.fromUserAccount;
      const to = n.toUserAccount;
      if (!from || !to || from === to || !(n.amount || 0)) continue;
      const proceeds = sellers.has(to) && from !== creator;
      if (proceeds) continue;
      fundings.push({ from, to, slot: tx.slot });
    }
  }

  if (creator) {
    for (const sell of sells) {
      if (sell.seller === creator) {
        return { flatten: true, reason: "creator-sold-onchain", fundedSellers: 1 };
      }
    }
  }

  for (const sell of sells) {
    const same = fundings.find((f) => f.to === sell.seller && f.slot === sell.slot);
    if (same) return { flatten: true, reason: "same-block-dump", fundedSellers: 1 };
  }

  if (creator) {
    const fromCreator = fundings.filter((f) => f.from === creator);
    for (const sell of sells) {
      const direct = fromCreator.find(
        (f) => f.to === sell.seller && f.slot <= sell.slot && sell.slot - f.slot <= MINUTE_SLOTS,
      );
      if (direct) return { flatten: true, reason: "deployer-funded-dump", fundedSellers: 1 };
      const mids = fromCreator
        .filter((f) => f.slot <= sell.slot && sell.slot - f.slot <= MINUTE_SLOTS)
        .map((f) => f.to);
      const hop = fundings.find(
        (f) =>
          mids.includes(f.from) &&
          f.to === sell.seller &&
          f.slot <= sell.slot &&
          sell.slot - f.slot <= MINUTE_SLOTS,
      );
      if (hop) return { flatten: true, reason: "deployer-funded-dump", fundedSellers: 1 };
    }
  }

  return { flatten: false, reason: "", fundedSellers: 0 };
}
