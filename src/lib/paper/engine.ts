import type {
  AlertEvent,
  AppState,
  CreatorStat,
  EngineSettings,
  PaperFill,
  PaperPosition,
  Strategy,
  TokenSnapshot,
} from "../types";
import { applyFee, positionSizeUsd, scoreToken, slippageBps } from "../risk/engine";
import { pushBounded } from "../store";

function id(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function timeStop(strategy: Strategy, settings: EngineSettings): number {
  switch (strategy) {
    case "launch_snipe":
      return settings.timeStopLaunchMs;
    case "migration_snipe":
      return settings.timeStopMigrationMs;
    case "copy_trade":
      return settings.timeStopCopyMs;
    default:
      return settings.timeStopScalpMs;
  }
}

function markPosition(pos: PaperPosition, price: number): PaperPosition {
  const mark = price > 0 ? price : pos.markUsd;
  return {
    ...pos,
    markUsd: mark,
    unrealizedUsd: (mark - pos.entryUsd) * pos.qty,
    trailPeakUsd: Math.max(pos.trailPeakUsd, mark),
    trailArmed: pos.trailArmed || mark >= pos.entryUsd * (1 + 0.18),
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
  const order: Strategy[] = ["migration_snipe", "copy_trade", "scalp", "launch_snipe"];
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
  if (token.priceUsd <= 0 && token.marketCapUsd <= 0) return null;

  const price = token.priceUsd > 0 ? token.priceUsd : token.marketCapUsd / 1_000_000_000;
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
    sizeUsd: size,
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
  const price = opts.price > 0 ? opts.price : pos.markUsd;
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

function shouldExit(pos: PaperPosition, token: TokenSnapshot | undefined, reportScore: number | undefined, settings: EngineSettings, now: number): string | null {
  if (pos.markUsd >= pos.tpUsd) return "take-profit";
  if (pos.markUsd <= pos.slUsd) return "stop-loss";
  if (pos.trailArmed && pos.markUsd <= pos.trailPeakUsd * (1 - settings.trailingGivebackPct)) return "trailing-stop";
  if (now - pos.openedAt >= timeStop(pos.strategy, settings)) return "time-stop";
  if (reportScore != null && reportScore < 28) return "risk-collapse";
  if (token?.banned) return "banned";
  return null;
}

export function tickPaper(state: AppState, tokens: TokenSnapshot[], now = Date.now()): {
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
    const t = byMint.get(pos.mint);
    const price = t?.priceUsd || (t ? t.marketCapUsd / 1_000_000_000 : pos.markUsd);
    return markPosition(pos, price);
  });

  for (const pos of [...state.paper.positions]) {
    const t = byMint.get(pos.mint);
    const report = scored.find((s) => s.token.mint === pos.mint)?.report;
    const reason = shouldExit(pos, t, report?.score, settings, now);
    if (reason) {
      const fill = closePosition({ state, pos, price: pos.markUsd, reason, now });
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
  }

  const unreal = state.paper.positions.reduce((s, p) => s + p.unrealizedUsd, 0);
  state.paper.equityUsd = Math.round((state.paper.cashUsd + state.paper.positions.reduce((s, p) => s + p.markUsd * p.qty, 0)) * 100) / 100;
  void unreal;

  let opened = 0;
  const ranked = scored
    .filter((s) => !s.report.vetoed && s.report.allowedStrategies.length > 0)
    .sort((a, b) => b.report.score - a.report.score);

  for (const s of ranked) {
    if (opened >= settings.maxNewEntriesPerTick) break;
    if (state.paper.positions.length >= settings.maxPositions) break;
    const strategy = pickStrategy(s.report.allowedStrategies);
    if (!strategy) continue;
    if (state.paper.positions.some((p) => p.mint === s.token.mint)) continue;
    const fill = openPaperBuy({
      state,
      token: s.token,
      strategy,
      score: s.report.score,
      reason: `auto:${strategy} score ${s.report.score}`,
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
    if (s.report.score >= 80 && s.token.smartMoneyInflow) {
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
