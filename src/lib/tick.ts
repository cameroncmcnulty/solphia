import { DEFAULT_AUTO, bankrollUsd, maybeResizeBook } from "./auto";
import { LIVE_TRADING } from "./config";
import { publicMind } from "./mind/engine";
import { tickPairBook } from "./pair/paper";
import { loadPairHistory, pushLiveSample } from "./pair/history";
import { loadPairPrices } from "./pair/prices";
import { publicPair, type PairDeskPublic } from "./pair/public";
import { quoteSolSpyx } from "./pair/jupiter";
import { DEFAULT_STUDY } from "./pair/knowledge";
import { loadState, saveState } from "./store";
import type { FeedHealth, PaperBook } from "./types";

let lock: Promise<unknown> = Promise.resolve();
let lastPairPublic: PairDeskPublic | null = null;
let lastPrices: { solUsd: number; spyxUsd: number } = { solUsd: 0, spyxUsd: 0 };

export function lastPairDesk() {
  return lastPairPublic;
}

export function lastPairPrices() {
  return lastPrices;
}

export function publicBook(book: PaperBook) {
  return {
    startingUsd: book.startingUsd,
    startedAt: book.startedAt,
    cashUsd: round2(book.cashUsd),
    equityUsd: round2(book.equityUsd),
    realizedPnlUsd: round2(book.realizedPnlUsd),
    unrealizedUsd: round2(book.positions.reduce((s, p) => s + p.unrealizedUsd, 0)),
    pnlPct: book.startingUsd ? (book.equityUsd - book.startingUsd) / book.startingUsd : 0,
    haltedUntil: book.haltedUntil,
    haltReason: book.haltReason,
    feesPaidUsd: round2(book.feesPaidUsd),
    slippagePaidUsd: round2(book.slippagePaidUsd),
    winCount: book.winCount,
    lossCount: book.lossCount,
    open: book.positions.length,
    trades: book.fills.filter((f) => f.side === "sell").length,
    positions: book.positions,
    fills: book.fills.slice(-80).reverse(),
    curve: book.curve.slice(-400),
    skipped: book.skipped || 0,
    lastAction: book.lastAction,
    lastSkipReason: book.lastSkipReason,
    killed: Boolean(book.killed),
    pair: book.pair,
    tape: (book.tape || []).slice(-80).reverse(),
    pendingIntent: book.pendingIntent || null,
  };
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export async function runMarketTick(): Promise<{
  paper: ReturnType<typeof publicBook>;
  health: FeedHealth[];
  solUsd: number;
  spyxUsd: number;
  entries: number;
  exits: number;
  mind: ReturnType<typeof publicMind>;
  pair: PairDeskPublic | null;
  liveTrading: boolean;
}> {
  const run = lock.then(async () => {
    const state = loadState();
    const now = Date.now();
    const health: FeedHealth[] = [];
    const t0 = Date.now();
    let prices;
    let history;
    try {
      prices = await loadPairPrices();
      health.push({
        source: `oracle:${prices.sol.source}+${prices.spyx.source}`,
        ok: !prices.stale,
        ms: Date.now() - t0,
        count: 2,
        error: prices.reason,
        at: now,
      });
    } catch (e) {
      health.push({
        source: "oracle",
        ok: false,
        ms: Date.now() - t0,
        count: 0,
        error: e instanceof Error ? e.message : "oracle failed",
        at: now,
      });
    }
    try {
      history = await loadPairHistory();
    } catch {
      history = { samples: state.pairSamples || [], study: DEFAULT_STUDY };
    }

    if (!prices || prices.sol.usd <= 0) {
      state.feedHealth = health;
      state.lastTickAt = now;
      await saveState(state);
      return {
        paper: publicBook(state.paper),
        health,
        solUsd: 0,
        spyxUsd: 0,
        entries: 0,
        exits: 0,
        mind: publicMind(state.mind),
        pair: null,
        liveTrading: LIVE_TRADING,
      };
    }

    let samples = history.samples;
    if (samples.length < 12 && (state.pairSamples || []).length >= 12) samples = state.pairSamples || samples;
    samples = pushLiveSample(samples, prices.sol.usd, prices.spyx.usd, now);
    state.pairSamples = samples;

    let impactPct = 0;
    let quoteOk: boolean | undefined;
    try {
      const q = await quoteSolSpyx(0.1, 50);
      quoteOk = q.ok;
      if (q.ok) impactPct = q.impactPct;
      health.push({
        source: "jupiter",
        ok: q.ok,
        ms: 0,
        count: q.ok ? 1 : 0,
        error: q.ok ? undefined : q.reason,
        at: now,
      });
    } catch (e) {
      quoteOk = false;
      health.push({
        source: "jupiter",
        ok: false,
        ms: 0,
        count: 0,
        error: e instanceof Error ? e.message : "quote failed",
        at: now,
      });
    }

    const demoAuto = { ...DEFAULT_AUTO, armed: true, mode: "paper" as const };
    const demo = tickPairBook({
      book: state.paper,
      auto: demoAuto,
      prices,
      samples,
      study: history.study,
      now,
      mind: state.mind,
      quoteOk,
      impactPct,
    });

    let entries = demo.fills.filter((f) => f.side === "buy").length;
    let exits = demo.fills.filter((f) => f.side === "sell").length;

    for (const trader of Object.values(state.traders || {})) {
      trader.auto = { ...DEFAULT_AUTO, ...trader.auto, leverage: 1 };
      if (trader.auto.mode === "live" && !LIVE_TRADING) trader.auto.mode = "paper";
      const target = bankrollUsd(trader.depositedSol, prices.sol.usd);
      trader.book = maybeResizeBook(trader.book, target);
      if (!trader.book.pair) {
        trader.book.pair = { solQty: 0, spyxQty: 0, usdcQty: trader.book.cashUsd };
      }
      if (!trader.auto.armed && !trader.book.killed) {
        trader.updatedAt = now;
        continue;
      }
      const t = tickPairBook({
        book: trader.book,
        auto: trader.auto,
        prices,
        samples,
        study: history.study,
        now,
        mind: state.mind,
        depositedSol: trader.depositedSol,
        quoteOk,
        impactPct,
      });
      entries += t.fills.filter((f) => f.side === "buy").length;
      exits += t.fills.filter((f) => f.side === "sell").length;
      trader.updatedAt = now;
    }

    state.feedHealth = health;
    state.lastTickAt = now;
    lastPairPublic = publicPair(state.paper, prices, demo.decision, history.study);
    lastPrices = { solUsd: prices.sol.usd, spyxUsd: prices.spyx.usd };
    state.lastPair = lastPairPublic;
    await saveState(state);

    return {
      paper: publicBook(state.paper),
      health,
      solUsd: prices.sol.usd,
      spyxUsd: prices.spyx.usd,
      entries,
      exits,
      mind: publicMind(state.mind),
      pair: lastPairPublic,
      liveTrading: LIVE_TRADING,
    };
  });
  lock = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}
