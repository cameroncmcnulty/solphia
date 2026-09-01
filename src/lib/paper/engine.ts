import type {
  AlertEvent,
  AppState,
  AutoSettings,
  CreatorStat,
  EngineSettings,
  PaperBook,
  PaperFill,
  PaperPosition,
  Strategy,
  TokenSnapshot,
} from "../types";
import { applyFee, positionSizeUsd, scoreToken, slippageBps } from "../risk/engine";
import { copyBlockReason } from "../risk/copy";
import { pushBounded } from "../store";
import { tokenPriceUsd } from "./price";
import { dayPnlUsd, exitPlan } from "./exits";
import type { LeaderBook } from "../copy/flow";

export type DeskFlags = Pick<AutoSettings, "copy" | "launch" | "migrate" | "scalp">;

export const DEMO_DESKS: DeskFlags = { copy: true, launch: false, migrate: false, scalp: false };

function deskAllows(desks: DeskFlags | undefined, strategy: Strategy): boolean {
  if (!desks) return true;
  if (strategy === "copy_trade") return desks.copy !== false;
  if (strategy === "launch_snipe") return Boolean(desks.launch);
  if (strategy === "migration_snipe") return Boolean(desks.migrate);
  if (strategy === "scalp") return Boolean(desks.scalp);
  return false;
}

function id(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function markPosition(pos: PaperPosition, price: number, settings: EngineSettings): PaperPosition {
  const mark = price > 0 ? price : pos.markUsd;
  const scaled = pos.scaledOut || 0;
  return {
    ...pos,
    originalQty: pos.originalQty || pos.qty,
    originalSizeUsd: pos.originalSizeUsd || pos.sizeUsd,
    scaledOut: scaled,
    markUsd: mark,
    unrealizedUsd: (mark - pos.entryUsd) * pos.qty,
    trailPeakUsd: Math.max(pos.trailPeakUsd, mark),
    trailArmed: pos.trailArmed || scaled >= settings.partialTp1Sell || mark >= pos.entryUsd * (1 + settings.trailingArmPct),
  };
}

export function updateCreators(state: AppState, tokens: TokenSnapshot[], now: number): void {
  for (const t of tokens) {
    if (!t.creator) continue;
    const prev = state.creators[t.creator] || {
      creator: t.creator,
      tokens: 0,
      dead: 0,
      survivors: 0,
      lastSeen: now,
    };
    const known = prev.lastSeen && prev.tokens > 0;
    // Count unique mints approximately by bumping on first sight in this process via lastSeen window.
    if (!known || now - prev.lastSeen > 30_000) {
      prev.tokens += 1;
    }
    const ageMin = (now - t.createdAt) / 60000;
    if (t.marketCapUsd < 1000 && ageMin > 90) prev.dead += 1;
    if (t.graduated && t.marketCapUsd > 50_000) prev.survivors += 1;
    prev.lastSeen = now;
    state.creators[t.creator] = prev;
  }
}

export function enrichWithCreators(tokens: TokenSnapshot[], creators: Record<string, CreatorStat>): TokenSnapshot[] {
  return tokens.map((t) => {
    if (!t.creator || !creators[t.creator]) return t;
    const s = creators[t.creator];
    return {
      ...t,
      deployerTokenCount: s.tokens,
      deployerDeathRate: s.tokens ? s.dead / Math.max(s.tokens, 1) : 0,
    };
  });
}

function pickStrategy(allowed: Strategy[]): Strategy | null {
  const order: Strategy[] = ["copy_trade", "migration_snipe", "scalp", "launch_snipe"];
  return order.find((s) => allowed.includes(s)) || allowed[0] || null;
}

export function openPaperBuy(opts: {
  state: AppState;
  token: TokenSnapshot;
  strategy: Strategy;
  score: number;
  reason: string;
  now?: number;
}): PaperFill | null {
  const { state, token, strategy, score, reason } = opts;
  const now = opts.now ?? Date.now();
  const book = state.paper;
  const settings = state.settings;
  if (book.positions.some((p) => p.mint === token.mint)) return null;
  if (book.positions.length >= settings.maxPositions) return null;
  const price = tokenPriceUsd(token);
  if (price <= 0) return null;

  const size = Math.min(positionSizeUsd(book.equityUsd, score, settings), book.cashUsd * 0.95);
  if (size < 8) return null;

  const slipBps = slippageBps(strategy, settings);
  const slip = applyFee(size, slipBps);
  const fee = applyFee(size, settings.feeBps);
  const spend = size;
  const qty = (size - fee - slip) / (price * (1 + slipBps / 10_000));
  if (qty <= 0) return null;

  const fill: PaperFill = {
    id: id("fill"),
    mint: token.mint,
    symbol: token.symbol,
    name: token.name,
    strategy,
    side: "buy",
    at: now,
    priceUsd: price,
    qty,
    sizeUsd: size,
    feeUsd: fee,
    slippageUsd: slip,
    reason,
    riskScore: score,
    venue: token.venue,
  };

  const pos: PaperPosition = {
    id: id("pos"),
    mint: token.mint,
    symbol: token.symbol,
    name: token.name,
    strategy,
    openedAt: now,
    entryUsd: price * (1 + slipBps / 10_000),
    qty,
    originalQty: qty,
    sizeUsd: size,
    originalSizeUsd: size,
    feeUsd: fee,
    slippageUsd: slip,
    tpUsd: price * (1 + settings.takeProfitPct),
    slUsd: price * (1 - settings.stopLossPct),
    trailArmed: false,
    trailPeakUsd: price,
    markUsd: price,
    unrealizedUsd: 0,
    riskScore: score,
    venue: token.venue,
    copiedFrom: token.copiedBy?.[0],
    scaledOut: 0,
  };

  book.cashUsd -= spend;
  book.feesPaidUsd += fee;
  book.slippagePaidUsd += slip;
  book.positions.push(pos);
  pushBounded(book.fills, fill, 400);
  return fill;
}

export function closePosition(opts: {
  state: AppState;
  pos: PaperPosition;
  price: number;
  reason: string;
  now?: number;
}): PaperFill {
  const { state, pos, reason } = opts;
  const now = opts.now ?? Date.now();
  const price = opts.price >= 0 ? opts.price : pos.markUsd;
  const settings = state.settings;
  const slipBps = slippageBps(pos.strategy, settings);
  const notional = price * pos.qty;
  const slip = applyFee(notional, slipBps);
  const fee = applyFee(notional, settings.feeBps);
  const proceeds = Math.max(0, notional - fee - slip);
  const cost = pos.sizeUsd;
  const pnl = proceeds - cost;
  const fill: PaperFill = {
    id: id("fill"),
    mint: pos.mint,
    symbol: pos.symbol,
    name: pos.name,
    strategy: pos.strategy,
    side: "sell",
    at: now,
    priceUsd: price,
    qty: pos.qty,
    sizeUsd: notional,
    feeUsd: fee,
    slippageUsd: slip,
    pnlUsd: pnl,
    pnlPct: cost ? pnl / cost : 0,
    reason,
    riskScore: pos.riskScore,
    venue: pos.venue,
  };
  state.paper.cashUsd += proceeds;
  state.paper.feesPaidUsd += fee;
  state.paper.slippagePaidUsd += slip;
  state.paper.realizedPnlUsd += pnl;
  if (pnl >= 0) state.paper.winCount += 1;
  else state.paper.lossCount += 1;
  state.paper.positions = state.paper.positions.filter((p) => p.id !== pos.id);
  pushBounded(state.paper.fills, fill, 400);
  return fill;
}

export function closePartial(opts: {
  state: AppState;
  pos: PaperPosition;
  price: number;
  fraction: number;
  reason: string;
  now?: number;
}): PaperFill {
  const frac = Math.min(1, Math.max(0, opts.fraction));
  if (frac >= 0.99) return closePosition(opts);
  const { state, pos, reason } = opts;
  const now = opts.now ?? Date.now();
  const price = opts.price >= 0 ? opts.price : pos.markUsd;
  const settings = state.settings;
  const sellQty = pos.qty * frac;
  const cost = pos.sizeUsd * frac;
  const slipBps = slippageBps(pos.strategy, settings);
  const notional = price * sellQty;
  const slip = applyFee(notional, slipBps);
  const fee = applyFee(notional, settings.feeBps);
  const proceeds = Math.max(0, notional - fee - slip);
  const pnl = proceeds - cost;
  const originalQty = pos.originalQty || pos.qty;
  const fill: PaperFill = {
    id: id("fill"),
    mint: pos.mint,
    symbol: pos.symbol,
    name: pos.name,
    strategy: pos.strategy,
    side: "sell",
    at: now,
    priceUsd: price,
    qty: sellQty,
    sizeUsd: notional,
    feeUsd: fee,
    slippageUsd: slip,
    pnlUsd: pnl,
    pnlPct: cost ? pnl / cost : 0,
    reason,
    riskScore: pos.riskScore,
    venue: pos.venue,
  };
  state.paper.cashUsd += proceeds;
  state.paper.feesPaidUsd += fee;
  state.paper.slippagePaidUsd += slip;
  state.paper.realizedPnlUsd += pnl;
  const live = state.paper.positions.find((p) => p.id === pos.id);
  if (live) {
    live.qty = pos.qty - sellQty;
    live.sizeUsd = pos.sizeUsd - cost;
    live.scaledOut = (pos.scaledOut || 0) + (originalQty ? sellQty / originalQty : frac);
    live.trailArmed = true;
  }
  pushBounded(state.paper.fills, fill, 400);
  return fill;
}

export function tickBook(
  state: AppState,
  tokens: TokenSnapshot[],
  book: PaperBook,
  now = Date.now(),
  desks?: DeskFlags,
  copyBook?: LeaderBook,
) {
  const prev = state.paper;
  state.paper = book;
  try {
    return tickPaper(state, tokens, now, desks, copyBook);
  } finally {
    state.paper = prev;
  }
}

function pushExit(
  state: AppState,
  pos: PaperPosition,
  price: number,
  reason: string,
  now: number,
  exits: PaperFill[],
  alerts: AlertEvent[],
  fraction = 1,
) {
  const fill =
    fraction < 0.99
      ? closePartial({ state, pos, price, fraction, reason, now })
      : closePosition({ state, pos, price, reason, now });
  exits.push(fill);
  alerts.push({
    id: id("al"),
    at: now,
    kind: "exit",
    title: `EXIT ${pos.symbol}`,
    body: `${reason} · ${fill.pnlUsd && fill.pnlUsd >= 0 ? "+" : ""}${(fill.pnlUsd || 0).toFixed(2)}`,
    mint: pos.mint,
    score: pos.riskScore,
    strategy: pos.strategy,
  });
}

export function tickPaper(
  state: AppState,
  tokens: TokenSnapshot[],
  now = Date.now(),
  desks?: DeskFlags,
  copyBook?: LeaderBook,
): {
  entries: PaperFill[];
  exits: PaperFill[];
  alerts: AlertEvent[];
} {
  const byMint = new Map(tokens.map((t) => [t.mint, t]));
  const settings = state.settings;
  const entries: PaperFill[] = [];
  const exits: PaperFill[] = [];
  const alerts: AlertEvent[] = [];

  updateCreators(state, tokens, now);
  const scored = enrichWithCreators(tokens, state.creators).map((t) => ({
    token: t,
    report: scoreToken(t, now, settings),
  }));

  state.paper.positions = state.paper.positions.map((pos) => {
    const live = tokenPriceUsd(byMint.get(pos.mint));
    return live > 0 ? markPosition(pos, live, settings) : markPosition(pos, pos.markUsd, settings);
  });

  for (const pos of [...state.paper.positions]) {
    const t = byMint.get(pos.mint);
    const live = tokenPriceUsd(t);
    if (live <= 0 && now - pos.openedAt > 90_000) {
      pushExit(state, pos, 0, "illiquid", now, exits, alerts);
      continue;
    }
    const report = scored.find((s) => s.token.mint === pos.mint)?.report;
    const plan = exitPlan(pos, t, report?.score, settings, now, copyBook);
    if (plan) pushExit(state, pos, pos.markUsd, plan.reason, now, exits, alerts, plan.fraction);
  }

  state.paper.equityUsd =
    Math.round((state.paper.cashUsd + state.paper.positions.reduce((s, p) => s + p.markUsd * p.qty, 0)) * 100) / 100;

  const lostToday = dayPnlUsd(state.paper.fills, state.paper.positions, now);
  if (lostToday <= -settings.dailyLossPct * state.paper.startingUsd && (state.paper.haltedUntil || 0) < now) {
    state.paper.haltedUntil = now + 24 * 60 * 60 * 1000;
    state.paper.haltReason = `Daily loss cap (${Math.round(settings.dailyLossPct * 100)}%). She is off until tomorrow.`;
    alerts.push({
      id: id("al"),
      at: now,
      kind: "halt",
      title: "DAILY LOSS CAP",
      body: state.paper.haltReason,
    });
  }

  const halted = (state.paper.haltedUntil || 0) > now;
  let opened = 0;
  const ranked = scored
    .map((s) => ({
      ...s,
      allowed: s.report.allowedStrategies.filter((st) => deskAllows(desks, st)),
    }))
    .filter((s) => !s.report.vetoed && s.allowed.length > 0)
    .sort((a, b) => b.report.score - a.report.score);

  for (const s of ranked) {
    if (halted) break;
    if (opened >= settings.maxNewEntriesPerTick) break;
    if (state.paper.positions.length >= settings.maxPositions) break;
    const strategy = pickStrategy(s.allowed);
    if (!strategy) continue;
    if (state.paper.positions.some((p) => p.mint === s.token.mint)) continue;
    const who = s.token.copiedBy?.[0];
    const fill = openPaperBuy({
      state,
      token: s.token,
      strategy,
      score: s.report.score,
      reason: who ? `copy ${who} · safety ${s.report.score}` : `auto:${strategy} score ${s.report.score}`,
      now,
    });
    if (fill) {
      opened += 1;
      entries.push(fill);
      alerts.push({
        id: id("al"),
        at: now,
        kind: "entry",
        title: `ENTRY ${s.token.symbol}`,
        body: `${strategy.replace("_", " ")} · safety ${s.report.score} · $${fill.sizeUsd.toFixed(2)}`,
        mint: s.token.mint,
        score: s.report.score,
        strategy,
      });
    }
  }

  for (const s of scored) {
    const blocked = s.token.smartMoneyInflow ? copyBlockReason(s.token, settings) : null;
    if (blocked && /bundled/i.test(blocked)) {
      alerts.push({
        id: id("al"),
        at: now,
        kind: "bundle",
        title: `SKIP ${s.token.symbol}`,
        body: blocked,
        mint: s.token.mint,
        score: s.report.score,
        strategy: "copy_trade",
      });
    } else if (s.report.score >= 80 && s.token.smartMoneyInflow) {
      alerts.push({
        id: id("al"),
        at: now,
        kind: "smart_money",
        title: `SMART MONEY ${s.token.symbol}`,
        body: `Safety ${s.report.score}. ${s.report.summary}`,
        mint: s.token.mint,
        score: s.report.score,
        strategy: "copy_trade",
      });
    } else if (s.report.allowedStrategies.includes("launch_snipe")) {
      alerts.push({
        id: id("al"),
        at: now,
        kind: "launch",
        title: `LAUNCH CLEAR ${s.token.symbol}`,
        body: s.report.summary,
        mint: s.token.mint,
        score: s.report.score,
        strategy: "launch_snipe",
      });
    } else if (s.report.allowedStrategies.includes("migration_snipe")) {
      alerts.push({
        id: id("al"),
        at: now,
        kind: "migration",
        title: `MIGRATION ${s.token.symbol}`,
        body: `${(s.token.bondingProgress * 100).toFixed(0)}% bonded · ${s.report.summary}`,
        mint: s.token.mint,
        score: s.report.score,
        strategy: "migration_snipe",
      });
    }
  }

  pushBounded(state.paper.curve, { t: now, equity: state.paper.equityUsd }, 2000);
  for (const a of alerts) pushBounded(state.alerts, a, 300);
  state.lastTickAt = now;
  state.lastSnapshots = scored
    .sort((a, b) => b.report.score - a.report.score)
    .slice(0, 80)
    .map((s) => s.token);

  return { entries, exits, alerts };
}
