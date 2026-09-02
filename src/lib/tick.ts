import { ingestMarket } from "./feeds";
import { DEMO_DESKS, tickBook, tickPaper } from "./paper/engine";
import { scoreToken } from "./risk/engine";
import { loadState, saveState } from "./store";
import { bankrollUsd, maybeResizeBook } from "./auto";
import { tagFundingDumps } from "./helius/watch";
import { publicMind } from "./mind/engine";
import { tickSolBook, readSolDesk } from "./sol/paper";
import type { SolDeskPublic } from "./sol/engine";
import type { FeedHealth, PaperBook, RiskReport, TokenSnapshot } from "./types";

let lock: Promise<unknown> = Promise.resolve();

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
  };
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export async function runMarketTick(): Promise<{
  paper: ReturnType<typeof publicBook>;
  tokens: { token: TokenSnapshot; report: RiskReport }[];
  health: FeedHealth[];
  solUsd: number;
  entries: number;
  exits: number;
  mind: ReturnType<typeof publicMind>;
  sol: SolDeskPublic | null;
}> {
  const run = lock.then(async () => {
    const state = loadState();
    const openMints = [
      ...state.paper.positions.map((p) => p.mint),
      ...Object.values(state.traders || {}).flatMap((t) => t.book.positions.map((p) => p.mint)),
    ];
    const { tokens, health, solUsd, copyBook } = await ingestMarket(state.creators, openMints);
    const copyMints = tokens.filter((t) => t.smartMoneyInflow).slice(0, 4).map((t) => t.mint);
    await tagFundingDumps(tokens, [...openMints, ...copyMints]);
    const result = tickPaper(state, tokens, Date.now(), DEMO_DESKS, copyBook);
    for (const trader of Object.values(state.traders || {})) {
      if (!trader.auto?.armed) continue;
      const target = bankrollUsd(trader.depositedSol, solUsd);
      trader.book = maybeResizeBook(trader.book, target);
      const min = trader.auto.minScore;
      const prev = { ...state.settings };
      state.settings.minScoreCopy = Math.max(prev.minScoreCopy, min);
      state.settings.minScoreLaunch = Math.max(prev.minScoreLaunch, min);
      state.settings.minScoreMigration = Math.max(prev.minScoreMigration, min);
      state.settings.minScoreScalp = Math.max(prev.minScoreScalp, min);
      if (trader.auto.takeProfitPct) state.settings.takeProfitPct = trader.auto.takeProfitPct;
      if (trader.auto.stopLossPct) state.settings.stopLossPct = trader.auto.stopLossPct;
      if (trader.auto.maxDevHoldPct) state.settings.leaderSupplyVeto = trader.auto.maxDevHoldPct / 100;
      if (trader.book.equityUsd > 0) {
        const cap = (trader.auto.maxSolPerTrade * solUsd) / trader.book.equityUsd;
        if (Number.isFinite(cap) && cap > 0) state.settings.maxPositionPct = Math.min(prev.maxPositionPct, cap);
      }
      tickBook(
        state,
        tokens,
        trader.book,
        Date.now(),
        {
          copy: trader.auto.copy,
          launch: trader.auto.launch,
          migrate: trader.auto.migrate,
          scalp: trader.auto.scalp,
          picks: trader.auto.picks,
        },
        copyBook,
      );
      if (trader.auto.solUsd || trader.book.positions.some((p) => p.strategy === "sol_usd")) {
        await tickSolBook(trader.book, Date.now());
      }
      state.settings = prev;
      trader.updatedAt = Date.now();
    }
    state.feedHealth = health;
    const solBook = Object.values(state.traders || {}).find((t) => t.auto?.solUsd)?.book || state.paper;
    let sol: SolDeskPublic | null = null;
    try {
      sol = await readSolDesk(solBook, Date.now());
    } catch {
      sol = null;
    }
    await saveState(state);
    const scored = tokens
      .map((token) => ({ token, report: scoreToken(token, Date.now(), state.settings) }))
      .sort((a, b) => b.report.score - a.report.score);
    return {
      paper: publicBook(state.paper),
      tokens: scored.slice(0, 80),
      health,
      solUsd,
      entries: result.entries.length,
      exits: result.exits.length,
      mind: publicMind(state.mind),
      sol,
    };
  });
  lock = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}
