import type { Strategy, TokenSnapshot, PaperBook, EngineSettings } from "../types";
import { LIVE_TRADING } from "../config";
import { dayPnlUsd } from "../paper/exits";
import { venueAllowed } from "./programs";
import { slippageBps } from "../risk/engine";

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

function postBonded(token: TokenSnapshot): boolean {
  return token.graduated || token.venue === "pumpswap" || token.venue === "raydium";
}

export function policyCheck(intent: Intent, ctx: PolicyCtx): { ok: boolean; reason: string } {
  if (ctx.now > intent.expiresAt) return { ok: false, reason: "Intent expired. No chase." };
  if ((ctx.book.haltedUntil || 0) > ctx.now) return { ok: false, reason: ctx.book.haltReason || "Halted." };
  if (!venueAllowed(ctx.token.venue)) return { ok: false, reason: "Venue is not on the allow-list." };
  if (ctx.token.banned || ctx.token.nsfw) return { ok: false, reason: "Banned or NSFW. No." };

  if (ctx.token.freezeAuthorityRevoked === false) return { ok: false, reason: "Freeze authority is live." };
  if (postBonded(ctx.token) && ctx.token.mintAuthorityRevoked === false) {
    return { ok: false, reason: "Mint authority is live." };
  }
  if (postBonded(ctx.token) && ctx.token.mintAuthorityRevoked !== true) {
    return { ok: false, reason: "Mint authority is unknown after graduation." };
  }

  const slipCap = slippageBps(intent.strategy, ctx.settings) + 50;
  if (intent.maxSlipBps > slipCap) return { ok: false, reason: "Slippage over policy." };

  if (intent.kind === "buy") {
    if (ctx.book.positions.length >= ctx.settings.maxPositions) return { ok: false, reason: "Max names." };
    if (ctx.book.positions.some((p) => p.mint === intent.mint)) return { ok: false, reason: "Already in this mint." };
    const posCap = ctx.book.equityUsd * (ctx.settings.maxPositionPct || 0.08);
    const coinCap = ctx.book.equityUsd * (ctx.settings.maxCoinPct || 0.1);
    if (intent.sizeUsd > Math.min(posCap, coinCap) + 0.01) return { ok: false, reason: "Size over book cap." };
    const lost = dayPnlUsd(ctx.book.fills, ctx.book.positions, ctx.now);
    if (lost <= -(ctx.settings.dailyLossPct || 0.12) * ctx.book.startingUsd) {
      return { ok: false, reason: "Daily loss cap." };
    }
  }

  if (ctx.live && !LIVE_TRADING) return { ok: false, reason: "Live trading is off. Paper only." };
  return { ok: true, reason: "Policy clear." };
}
