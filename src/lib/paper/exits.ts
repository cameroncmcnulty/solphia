import type { CurveTick, EngineSettings, PaperPosition, TokenSnapshot } from "../types";
import type { LeaderBook } from "../copy/flow";
import { leaderDumped } from "../copy/flow";
import { curveStalled, flattenNow } from "../desk/rugClock";

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
  watch?: CurveTick,
): { reason: string; fraction: number } | null {
  const m = multiple(pos);
  const scaled = pos.scaledOut || 0;

  if (leaderDumped(pos.mint, pos.copiedFrom, book)) {
    return { reason: "leader-sold", fraction: 1 };
  }
  if (token?.banned) return { reason: "banned", fraction: 1 };
  if (reportScore != null && reportScore < 28) return { reason: "risk-collapse", fraction: 1 };
  if (token) {
    const rug = flattenNow(token, watch, now);
    if (rug.flatten) return { reason: rug.reason, fraction: 1 };
  }
  if ((token?.bundleRatio ?? 0) >= (settings.bundleVeto ?? 0.38) && pos.strategy !== "copy_trade") {
    return { reason: "bundle-woke", fraction: 1 };
  }
  if ((pos.strategy === "launch_snipe" || pos.strategy === "migration_snipe") && token && !token.graduated) {
    if (curveStalled(token, watch, pos.openedAt, pos.entryBonding, now)) {
      return { reason: "curve-stall", fraction: 1 };
    }
  }
  if (pos.trailPeakUsd > 0 && pos.markUsd <= pos.trailPeakUsd * 0.75 && m < 1) {
    return { reason: "kill-from-high", fraction: 1 };
  }
  if (pos.markUsd <= pos.slUsd) return { reason: "stop-loss", fraction: 1 };

  const ladder: { multiple: number; sold: number; reason: string }[] = [
    { multiple: 1.5, sold: 0.25, reason: "take-profit-1.5x" },
    { multiple: 2, sold: 0.5, reason: "take-profit-2x" },
    { multiple: 3, sold: 0.7, reason: "take-profit-3x" },
    { multiple: 5, sold: 0.85, reason: "take-profit-5x" },
  ];
  for (let i = ladder.length - 1; i >= 0; i--) {
    const step = ladder[i];
    if (m >= step.multiple && scaled < step.sold - 0.01) {
      const left = 1 - scaled;
      return { reason: step.reason, fraction: Math.min(1, (step.sold - scaled) / left) };
    }
  }

  const trailArmed = pos.trailArmed || scaled >= 0.25 || m >= 1 + (settings.trailingArmPct ?? 0.18);
  const give = scaled >= 0.25 ? Math.min(settings.trailingGivebackPct ?? 0.09, 0.12) : settings.trailingGivebackPct ?? 0.09;
  if (trailArmed && pos.markUsd <= pos.trailPeakUsd * (1 - give)) {
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
