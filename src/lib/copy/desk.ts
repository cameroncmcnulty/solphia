import { fromCopyWallet, gradeWallets, type WalletQuality } from "./quality";
import { parseTradeMints, scrapeKol } from "./scrape";

export interface CopyWallet {
  handle: string;
  slug: string;
  address: string;
  style: string;
  pnl7d: number;
  pnl30d: number;
  winRate: number;
  copied: boolean;
}

const SNAPSHOT: CopyWallet[] = [
  { handle: "Cented", slug: "cented", address: "CyaE1VxvBrahnPWkqm5VsdCvyS2QmNht2UFrKJHga54o", style: "Nano-cap radar", pnl7d: 190700, pnl30d: 880661, winRate: 57.4, copied: true },
  { handle: "Decu", slug: "decu", address: "4vw54BmAogeRV3vPKWyFet5yf8DTLcREzdSzx4rw9Ud9", style: "High accuracy", pnl7d: 99600, pnl30d: 389966, winRate: 61.0, copied: true },
  { handle: "Cupsey", slug: "cupsey", address: "2fg5QD1eD7rzNNCsvnhmXFm5hqNgwTTG8p7kQ6f3rx6f", style: "Early flow", pnl7d: 79000, pnl30d: 383089, winRate: 49.1, copied: true },
  { handle: "Theo", slug: "theo", address: "Bi4rd5FH5bYEN8scZ7wevxNZyNmKHdaBcvewdPFxYdLt", style: "High velocity", pnl7d: 15100, pnl30d: 359079, winRate: 50.5, copied: true },
  { handle: "Trunoest", slug: "trunoest", address: "ardinRsN1mNYVeoJWTBsWeYeXvuR9UUDGMsCDKpb6AT", style: "Win-rate first", pnl7d: 114700, pnl30d: 258131, winRate: 58.0, copied: true },
  { handle: "Kadenox", slug: "kadenox", address: "B32QbbdDAyhvUQzjcaM5j6ZVKwjCxAwGH5Xgvb9SJqnC", style: "Fast scalps", pnl7d: 44200, pnl30d: 257532, winRate: 59.9, copied: true },
  { handle: "Pain", slug: "pain", address: "J6TDXvarvpBdPXTaTU8eJbtso1PUCYKGkVtMKUUY8iEa", style: "Size hunter", pnl7d: 21000, pnl30d: 147009, winRate: 37.1, copied: false },
  { handle: "Clukz", slug: "clukz", address: "G6fUXjMKPJzCY1rveAE6Qm7wy5U3vZgKDJmN1VPAdiZC", style: "Measured", pnl7d: 3000, pnl30d: 136527, winRate: 57.9, copied: true },
];

let cache: { at: number; rows: WalletQuality[] } | null = null;

export function seedRoster(): CopyWallet[] {
  return SNAPSHOT.map((w) => ({ ...w }));
}

export async function gradeDesk(force = false): Promise<{ rows: WalletQuality[]; source: string; updatedAt: number }> {
  if (!force && cache && Date.now() - cache.at < 10 * 60 * 1000) {
    return { rows: cache.rows, source: "KOL Explorer (cached)", updatedAt: cache.at };
  }
  const stats = await Promise.all(
    SNAPSHOT.map(async (w) => {
      const live = await scrapeKol(w.slug);
      const pnl7d = live?.pnl7d && live.pnl7d >= 50 ? live.pnl7d : w.pnl7d;
      const pnl30d = live?.pnl30d && live.pnl30d >= 500 ? live.pnl30d : w.pnl30d;
      const winRate = live?.winRate && live.winRate > 5 && live.winRate < 95 ? live.winRate : w.winRate;
      return fromCopyWallet(
        { ...w, pnl7d, pnl30d, winRate },
        {
          winRate1d: live?.winRate1d,
          trades7d: live?.trades7d,
          tokens7d: live?.tokens7d,
          avgTradeUsd: live?.avgTradeUsd,
          worstTradeUsd: live?.worstTradeUsd,
          holdings: live?.holdings || [],
          tradeMints: live?.html ? parseTradeMints(live.html) : [],
        },
      );
    }),
  );
  const rows = gradeWallets(stats);
  cache = { at: Date.now(), rows };
  return { rows, source: "KOL Explorer", updatedAt: cache.at };
}

export async function copyDesk(): Promise<{ rows: WalletQuality[]; source: string; updatedAt: number }> {
  return gradeDesk();
}

export function copiedRoster(): CopyWallet[] {
  if (cache?.rows) {
    return cache.rows
      .filter((w) => w.copied)
      .map((w) => ({
        handle: w.handle,
        slug: w.slug,
        address: w.address,
        style: w.styleLabel,
        pnl7d: w.pnl7d,
        pnl30d: w.pnl30d,
        winRate: w.winRate,
        copied: true,
      }));
  }
  return SNAPSHOT.filter((w) => w.copied);
}

export function activeCopyHandles(): string[] {
  return copiedRoster().map((w) => w.handle);
}

export function walletQuality(handle: string): WalletQuality | undefined {
  return cache?.rows.find((w) => w.handle === handle);
}
