import { DEFAULT_AUTO, lockedAuto, bankrollUsd, maybeResizeBook } from "./auto";
import { liveTradingEnabled } from "./liveFlag";
import { publicMind } from "./mind/engine";
import { tickPairBook } from "./pair/paper";
import { BOOK_CURVE_MAX, BOOK_FILLS_MAX, BOOK_TAPE_MAX, compactTape } from "./pair/bookLog";
import { loadPairHistory, pushLiveSample } from "./pair/history";
import { loadPairPrices } from "./pair/prices";
import { publicPair, type PairDeskPublic } from "./pair/public";
import { quoteSolSpyx } from "./pair/jupiter";
import { DEFAULT_STUDY } from "./pair/knowledge";
import { loadShortTape } from "./pair/shortTape";
import { loadScalpFrames } from "./pair/frames";
import { readyState, saveOps, saveTrader, loadHotTraders } from "./store";
import { fillLiveIntent, MAX_LIVE_FILLS_PER_TICK } from "./live/execute";
import { liveSeatOk, levSeatOk } from "./access";
import { leverageUnlocked } from "./leverage";
import { treasuryAddress } from "./treasury";
import type { FeedHealth, PaperBook } from "./types";
import { estimateStoreBytes, recordHealthSample } from "./health/probe";

let lock: Promise<unknown> = Promise.resolve();
let lastPairPublic: PairDeskPublic | null = null;
let lastPrices: { solUsd: number; spyxUsd: number; qqqxUsd: number; gldxUsd: number } = {
  solUsd: 0,
  spyxUsd: 0,
  qqqxUsd: 0,
  gldxUsd: 0,
};

export function lastPairDesk() {
  return lastPairPublic;
}

export function lastPairPrices() {
  return lastPrices;
}

export function publicBook(book: PaperBook | null | undefined) {
  const b = book || emptyFallback();
  const positions = Array.isArray(b.positions) ? b.positions : [];
  const fills = Array.isArray(b.fills) ? b.fills : [];
  const start = Number(b.startingUsd) || 1000;
  const equity = Number.isFinite(b.equityUsd) ? b.equityUsd : start;
  return {
    startingUsd: start,
    startedAt: b.startedAt || (Array.isArray(b.fills) && b.fills[0]?.at) || (Array.isArray(b.curve) && b.curve[0]?.t) || 0,
    cashUsd: round2(Number(b.cashUsd) || 0),
    equityUsd: round2(equity),
    realizedPnlUsd: round2(Number(b.realizedPnlUsd) || 0),
    unrealizedUsd: round2(positions.reduce((s, p) => s + (Number(p.unrealizedUsd) || 0), 0)),
    pnlPct: start ? (equity - start) / start : 0,
    haltedUntil: b.haltedUntil,
    haltReason: b.haltReason,
    feesPaidUsd: round2(Number(b.feesPaidUsd) || 0),
    slippagePaidUsd: round2(Number(b.slippagePaidUsd) || 0),
    winCount: b.winCount || 0,
    lossCount: b.lossCount || 0,
    open: positions.length,
    trades: fills.filter((f) => f.side === "sell").length,
    positions,
    fills: fills.slice(-BOOK_FILLS_MAX).reverse(),
    curve: Array.isArray(b.curve) ? b.curve.slice(-BOOK_CURVE_MAX) : [],
    skipped: b.skipped || 0,
    lastAction: b.lastAction,
    lastSkipReason: b.lastSkipReason,
    killed: Boolean(b.killed),
    pair: b.pair || { solQty: 0, spyxQty: 0, qqqxQty: 0, gldxQty: 0, usdcQty: start },
    tape: compactTape(b.tape).slice(-BOOK_TAPE_MAX).reverse(),
    pendingIntent: b.pendingIntent || null,
  };
}

function emptyFallback(): PaperBook {
  const now = Date.now();
  return {
    startingUsd: 1000,
    startedAt: now,
    cashUsd: 1000,
    equityUsd: 1000,
    realizedPnlUsd: 0,
    feesPaidUsd: 0,
    slippagePaidUsd: 0,
    winCount: 0,
    lossCount: 0,
    positions: [],
    fills: [],
    curve: [{ t: now, equity: 1000 }],
    skipped: 0,
    killed: false,
    pair: { solQty: 0, spyxQty: 0, qqqxQty: 0, gldxQty: 0, usdcQty: 1000 },
    tape: [],
  };
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

let paperLoop = false;
export function ensurePaperLoop() {
  if (paperLoop) return;
  paperLoop = true;
  setInterval(() => {
    runMarketTick().catch(() => undefined);
  }, 20_000);
}

export async function runMarketTick(): Promise<{
  paper: ReturnType<typeof publicBook>;
  health: FeedHealth[];
  solUsd: number;
  spyxUsd: number;
  qqqxUsd: number;
  gldxUsd: number;
  entries: number;
  exits: number;
  mind: ReturnType<typeof publicMind>;
  pair: PairDeskPublic | null;
  liveTrading: boolean;
  liveFills: number;
}> {
  ensurePaperLoop();
  const run = lock.then(async () => {
    const state = await readyState();
    const now = Date.now();
    const health: FeedHealth[] = [];
    const t0 = Date.now();
    let prices;
    let history;
    try {
      prices = await loadPairPrices();
      health.push({
        source: `prices:${prices.sol.source}`,
        ok: !prices.stale,
        ms: Date.now() - t0,
        count: [prices.spyx, prices.qqqx, prices.gldx].filter((p) => p.usd > 0).length + 1,
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
      await saveOps(state);
      return {
        paper: publicBook(state.paper),
        health,
        solUsd: 0,
        spyxUsd: 0,
        qqqxUsd: 0,
        gldxUsd: 0,
        entries: 0,
        exits: 0,
        mind: publicMind(state.mind),
        pair: null,
        liveTrading: liveTradingEnabled(),
        liveFills: 0,
      };
    }

    let samples = history.samples;
    if (samples.length < 12 && (state.pairSamples || []).length >= 12) samples = state.pairSamples || samples;
    samples = pushLiveSample(
      samples,
      prices.sol.usd,
      { spyx: prices.spyx.usd, qqqx: prices.qqqx.usd, gldx: prices.gldx.usd },
      now,
    );
    state.pairSamples = samples;

    let impactPct = 0;
    let quoteOk: boolean | undefined;
    let shortTape;
    let frames;
    try {
      const [q, tape, scalp] = await Promise.all([
        Promise.race([
          quoteSolSpyx(0.1, 50),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 2500)),
        ]),
        loadShortTape().catch(() => null),
        loadScalpFrames().catch(() => null),
      ]);
      shortTape = tape || undefined;
      frames = scalp || undefined;
      if (q && "ok" in q) {
        quoteOk = q.ok ? true : undefined;
        if (q.ok) impactPct = q.impactPct;
        health.push({
          source: "jupiter",
          ok: q.ok,
          ms: 0,
          count: q.ok ? 1 : 0,
          error: q.ok ? undefined : q.reason,
          at: now,
        });
      }
    } catch (e) {
      quoteOk = undefined;
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
      impactPct,
      shortTape,
      frames,
    });

    let entries = demo.fills.filter((f) => f.side === "buy").length;
    let exits = demo.fills.filter((f) => f.side === "sell").length;
    let liveFills = 0;

    const hot = await loadHotTraders(state);
    for (const trader of hot) {
      // Armed paper books keep clipping even if the owner closed the browser.
      const owner = trader.owner;
      const seatOk = !treasuryAddress() || liveSeatOk(state, owner);
      const liveWanted = trader.auto?.mode === "live" && liveTradingEnabled() && seatOk;
      trader.auto = lockedAuto({
        ...trader.auto,
        mode: liveWanted ? "live" : "paper",
        armed: !trader.book.killed,
        tradingPubkey: trader.auto?.tradingPubkey,
        liveDelegate: trader.auto?.liveDelegate,
        armedAt: trader.auto?.armedAt,
        leverage: leverageUnlocked({
          mode: liveWanted ? "live" : "paper",
          levSeat: levSeatOk(state, owner),
        })
          ? trader.auto?.leverage
          : 1,
      });
      if (trader.auto.mode === "live" && (!liveTradingEnabled() || !seatOk)) trader.auto.mode = "paper";
      const target = bankrollUsd(trader.depositedSol, prices.sol.usd);
      trader.book = maybeResizeBook(trader.book, target);
      if (!trader.book.pair) {
        trader.book.pair = { solQty: 0, spyxQty: 0, qqqxQty: 0, gldxQty: 0, usdcQty: trader.book.cashUsd };
      }
      if (trader.book.killed) {
        trader.updatedAt = now;
        await saveTrader(trader);
        continue;
      }
      const live = trader.auto.mode === "live" && Boolean(trader.auto.armed);
      const t = tickPairBook({
        book: trader.book,
        auto: { ...trader.auto, armed: true, mode: live ? "live" : "paper" },
        prices,
        samples,
        study: history.study,
        now,
        mind: state.mind,
        depositedSol: trader.depositedSol,
        quoteOk: live ? quoteOk : undefined,
        impactPct,
        live,
        shortTape,
        frames,
      });
      entries += t.fills.filter((f) => f.side === "buy").length;
      exits += t.fills.filter((f) => f.side === "sell").length;
      if (
        live &&
        trader.auto.liveDelegate &&
        trader.book.pendingIntent &&
        liveFills < MAX_LIVE_FILLS_PER_TICK
      ) {
        const sent = await fillLiveIntent(trader, prices, now, state.mind);
        if (sent.ok) liveFills += 1;
      }
      trader.updatedAt = now;
      await saveTrader(trader);
    }

    state.feedHealth = health;
    state.lastTickAt = now;
    lastPairPublic = publicPair(state.paper, prices, demo.decision, history.study);
    lastPrices = {
      solUsd: prices.sol.usd,
      spyxUsd: prices.spyx.usd,
      qqqxUsd: prices.qqqx.usd,
      gldxUsd: prices.gldx.usd,
    };
    state.lastPair = lastPairPublic;
    recordHealthSample(state, {
      t: now,
      tickAgeMs: 0,
      storeBytes: estimateStoreBytes(state),
      rpcMs: null,
      jupMs: null,
      pinataMs: null,
      pinataBytes: null,
      pinataFiles: null,
      source: "tick",
    });
    await saveOps(state);

    return {
      paper: publicBook(state.paper),
      health,
      solUsd: prices.sol.usd,
      spyxUsd: prices.spyx.usd,
      qqqxUsd: prices.qqqx.usd,
      gldxUsd: prices.gldx.usd,
      entries,
      exits,
      mind: publicMind(state.mind),
      pair: lastPairPublic,
      liveTrading: liveTradingEnabled(),
      liveFills,
    };
  });
  lock = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}
