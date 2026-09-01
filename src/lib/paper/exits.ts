import type { EngineSettings, PaperPosition, TokenSnapshot } from "../types";
import type { LeaderBook } from "../copy/flow";
import { leaderDumped } from "../copy/flow";

export function multiple(pos: PaperPosition): number {
  return pos.entryUsd > 0 ? pos.markUsd / pos.entryUsd : 1;
}

export function exitPlan(
  pos: PaperPosition,
  token: TokenSnapshot | undefined,
  reportScore: number | undefined,
  settings: EngineSettings,
  now: number,
  book?: LeaderBook,
): { reason: string; fraction: number } | null {
  const m = multiple(pos);
  const scaled = pos.scaledOut || 0;

  if (leaderDumped(pos.mint, pos.copiedFrom, book)) {
    return { reason: "leader-sold", fraction: 1 };
  }
  if (pos.markUsd <= pos.slUsd) return { reason: "stop-loss", fraction: 1 };
  if (token?.banned) return { reason: "banned", fraction: 1 };
  if (reportScore != null && reportScore < 28) return { reason: "risk-collapse", fraction: 1 };

  const tp1 = settings.partialTp1 ?? 1;
  const tp1Sell = settings.partialTp1Sell ?? 0.5;
  const tp2 = settings.partialTp2 ?? 4;
  const tp2Sell = settings.partialTp2Sell ?? 0.25;
  if (m >= 1 + tp2 && scaled < tp1Sell + tp2Sell - 0.01) {
    const left = 1 - scaled;
    return { reason: "take-profit-5x", fraction: Math.min(1, tp2Sell / left) };
  }
  if (m >= 1 + tp1 && scaled < tp1Sell - 0.01) {
    const left = 1 - scaled;
    return { reason: "take-profit-2x", fraction: Math.min(1, tp1Sell / left) };
  }

  const trailArmed = pos.trailArmed || scaled >= settings.partialTp1Sell || m >= 1 + settings.trailingArmPct;
  if (trailArmed && pos.markUsd <= pos.trailPeakUsd * (1 - settings.trailingGivebackPct)) {
    return { reason: "trailing-stop", fraction: 1 };
  }

  const timeStop =
    pos.strategy === "launch_snipe"
      ? settings.timeStopLaunchMs
      : pos.strategy === "migration_snipe"
        ? settings.timeStopMigrationMs
        : pos.strategy === "copy_trade"
          ? settings.timeStopCopyMs
          : settings.timeStopScalpMs;
  if (now - pos.openedAt >= timeStop) return { reason: "time-stop", fraction: 1 };
  return null;
}

export function dayPnlUsd(
  fills: { side: string; at: number; pnlUsd?: number }[],
  positions: { unrealizedUsd: number }[],
  now: number,
): number {
  const from = now - 24 * 60 * 60 * 1000;
  const realized = fills.filter((f) => f.side === "sell" && f.at >= from).reduce((s, f) => s + (f.pnlUsd || 0), 0);
  const unreal = positions.reduce((s, p) => s + p.unrealizedUsd, 0);
  return realized + unreal;
}
