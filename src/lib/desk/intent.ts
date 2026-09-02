import type { Strategy, TokenSnapshot, PaperBook, EngineSettings } from "../types";
import { LIVE_TRADING } from "../config";
import { dayPnlUsd } from "../paper/exits";

export type IntentKind = "buy" | "sell" | "partial_sell";

export type Intent = {
  kind: IntentKind;
  mint: string;
  symbol: string;
  strategy: Strategy;
  sizeUsd: number;
  maxSlipBps: number;
  expiresAt: number;
  reason: string;
  scout: "scout";
  risk?: "allow" | "deny";
  deny?: string;
};

export type PolicyCtx = {
  book: PaperBook;
  settings: EngineSettings;
  token: TokenSnapshot;
  now: number;
  live?: boolean;
};

const ALLOWED: TokenSnapshot["venue"][] = ["pumpfun", "pumpswap", "launchlab", "raydium"];

export function policyCheck(intent: Intent, ctx: PolicyCtx): { ok: boolean; reason: string } {
  if (ctx.now > intent.expiresAt) return { ok: false, reason: "Intent expired. No chase." };
  if ((ctx.book.haltedUntil || 0) > ctx.now) return { ok: false, reason: ctx.book.haltReason || "Halted." };
  if (!ALLOWED.includes(ctx.token.venue)) return { ok: false, reason: "Venue is not on the allow-list." };
  if (ctx.token.mintAuthorityRevoked === false) return { ok: false, reason: "Mint authority is live." };
  if (ctx.token.freezeAuthorityRevoked === false) return { ok: false, reason: "Freeze authority is live." };
  if (intent.kind === "buy") {
    if (ctx.book.positions.length >= ctx.settings.maxPositions) return { ok: false, reason: "Max names." };
    if (ctx.book.positions.some((p) => p.mint === intent.mint)) return { ok: false, reason: "Already in this mint." };
    const cap = ctx.book.equityUsd * (ctx.settings.maxPositionPct || 0.08);
    if (intent.sizeUsd > cap + 0.01) return { ok: false, reason: "Size over book cap." };
    const lost = dayPnlUsd(ctx.book.fills, ctx.book.positions, ctx.now);
    if (lost <= -(ctx.settings.dailyLossPct || 0.12) * ctx.book.startingUsd) {
      return { ok: false, reason: "Daily loss cap." };
    }
  }
  if (intent.maxSlipBps > (ctx.settings.slippageBpsLaunch || 150) + 50 && intent.strategy === "launch_snipe") {
    return { ok: false, reason: "Slippage over policy." };
  }
  if (ctx.live && !LIVE_TRADING) return { ok: false, reason: "Live trading is off. Paper only." };
  return { ok: true, reason: "Policy clear." };
}
