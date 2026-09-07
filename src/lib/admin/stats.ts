import type { PaperBook, PaperFill, TraderAccount } from "../types";

export type Prices = { solUsd: number; spyxUsd: number; qqqxUsd: number; gldxUsd: number };

export type WindowStats = {
  volumeUsd: number;
  trades: number;
  feesUsd: number;
  pnlUsd: number;
};

export function bookHoldingUsd(book: PaperBook | null | undefined, px: Prices): number {
  if (!book) return 0;
  const h = book.pair;
  if (!h) return Number(book.equityUsd) || 0;
  const sol = (h.solQty || 0) * (px.solUsd || 0);
  const spy = (h.spyxQty || 0) * (px.spyxUsd || 0);
  const qqq = (h.qqqxQty || 0) * (px.qqqxUsd || 0);
  const gld = (h.gldxQty || 0) * (px.gldxUsd || 0);
  const usdc = h.usdcQty || 0;
  const sum = usdc + sol + spy + qqq + gld;
  return sum > 0 ? sum : Number(book.equityUsd) || 0;
}

export function windowClip(book: PaperBook | null | undefined, since: number): WindowStats {
  const empty: WindowStats = { volumeUsd: 0, trades: 0, feesUsd: 0, pnlUsd: 0 };
  if (!book) return empty;
  const fills = Array.isArray(book.fills) ? book.fills : [];
  if (fills.length) {
    return fills.reduce((acc, f) => addFill(acc, f, since), { ...empty });
  }
  const tape = Array.isArray(book.tape) ? book.tape : [];
  for (const t of tape) {
    if ((t.at || 0) < since) continue;
    if (t.action === "trade" || t.action === "deploy" || t.action === "flatten") {
      empty.volumeUsd += Number(t.sizeUsd) || 0;
      empty.trades += 1;
    }
  }
  return empty;
}

function addFill(acc: WindowStats, f: PaperFill, since: number): WindowStats {
  if ((f.at || 0) < since) return acc;
  acc.volumeUsd += Number(f.sizeUsd) || 0;
  acc.feesUsd += Number(f.feeUsd) || 0;
  if (f.side === "sell") {
    acc.trades += 1;
    acc.pnlUsd += Number(f.pnlUsd) || 0;
  } else if (f.side === "buy") {
    acc.trades += 1;
  }
  return acc;
}

export function sumWindows(books: PaperBook[], now = Date.now()): { h24: WindowStats; d7: WindowStats } {
  const acc = (since: number) =>
    books.reduce(
      (a, b) => {
        const w = windowClip(b, since);
        return {
          volumeUsd: a.volumeUsd + w.volumeUsd,
          trades: a.trades + w.trades,
          feesUsd: a.feesUsd + w.feesUsd,
          pnlUsd: a.pnlUsd + w.pnlUsd,
        };
      },
      { volumeUsd: 0, trades: 0, feesUsd: 0, pnlUsd: 0 },
    );
  return { h24: acc(now - 86_400_000), d7: acc(now - 7 * 86_400_000) };
}

export function uniqueWallets(users: { pubkey: string }[], traders: Record<string, TraderAccount>): string[] {
  const set = new Set<string>();
  for (const u of users || []) if (u.pubkey) set.add(u.pubkey);
  for (const t of Object.values(traders || {})) if (t.owner) set.add(t.owner);
  return [...set];
}

export function tradingNow(traders: Record<string, TraderAccount>, publicKilled: boolean, now = Date.now()): number {
  let n = publicKilled ? 0 : 1;
  for (const t of Object.values(traders || {})) {
    if (t.book?.killed) continue;
    if (t.auto?.armed === false && t.auto?.mode === "live") continue;
    const fresh = now - (t.updatedAt || 0) < 24 * 60 * 60 * 1000;
    const live = t.auto?.mode === "live" && (t.depositedSol || 0) > 0.001;
    const paper = t.auto?.mode !== "live";
    if (fresh && (live || paper)) n += 1;
  }
  return n;
}
