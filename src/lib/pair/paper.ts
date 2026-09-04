import type { AutoSettings, Mind, PaperBook, PaperFill, PairTape } from "../types";
import { learnFromFill, noteOpen } from "../mind/engine";
import { pushBounded } from "../store";
import { applyFee } from "../risk/engine";
import {
  PAIR_FEE_BPS,
  PAIR_SLIP_BPS,
  decidePair,
  fillOf,
  id,
  markPair,
  pairOf,
  type PairDecision,
} from "./engine";
import { LIVE_TRADING } from "../config";
import type { HistoryStudy } from "./knowledge";
import { SOL_MINT, spyxMint } from "./mints";
import type { PairPrices } from "./prices";
import type { RatioSample } from "./ratio";
import type { PairIntent } from "../types";

export function tapeOf(
  now: number,
  action: PairTape["action"],
  reason: string,
  extra?: Partial<PairTape>,
): PairTape {
  return {
    id: id("tape"),
    at: now,
    action,
    reason,
    ...extra,
  };
}

function costs(sizeUsd: number, impactPct = 0) {
  const fee = applyFee(sizeUsd, PAIR_FEE_BPS);
  const slip = applyFee(sizeUsd, PAIR_SLIP_BPS) + sizeUsd * Math.max(0, impactPct);
  return { fee, slip, drag: fee + slip };
}

function pushFill(book: PaperBook, fill: PaperFill) {
  pushBounded(book.fills, fill, 400);
  book.feesPaidUsd += fill.feeUsd;
  book.slippagePaidUsd += fill.slippageUsd;
  if (fill.pnlUsd != null && Math.abs(fill.pnlUsd) >= 0.01) {
    book.realizedPnlUsd += fill.pnlUsd;
    if (fill.pnlUsd >= 0) book.winCount += 1;
    else book.lossCount += 1;
  } else if (fill.pnlUsd != null) {
    book.realizedPnlUsd += fill.pnlUsd;
  }
}

function pushTape(book: PaperBook, row: PairTape) {
  if (!book.tape) book.tape = [];
  const last = book.tape[book.tape.length - 1];
  const quiet = row.action === "hold" || row.action === "skip";
  if (last && quiet && last.action === row.action && last.reason === row.reason) {
    last.at = row.at;
    book.lastAction = `${row.action} · ${row.reason}`;
    if (row.action === "skip") book.lastSkipReason = row.reason;
    return;
  }
  pushBounded(book.tape, row, 200);
  book.lastAction = `${row.action} · ${row.reason}`;
  if (row.action === "skip") {
    book.skipped = (book.skipped || 0) + 1;
    book.lastSkipReason = row.reason;
  }
}

function bumpCurve(book: PaperBook, now: number) {
  const last = book.curve[book.curve.length - 1];
  if (last && now - last.t < 60_000 && Math.abs(last.equity - book.equityUsd) < 0.05) return;
  pushBounded(book.curve, { t: now, equity: book.equityUsd }, 800);
}

export function flattenToUsdc(book: PaperBook, prices: PairPrices, now: number, reason: string, mind?: Mind): PaperFill[] {
  const h = pairOf(book);
  const fills: PaperFill[] = [];
  const impact = 0;
  if (h.solQty > 0) {
    const size = h.solQty * prices.sol.usd;
    const { fee, slip, drag } = costs(size, impact);
    const net = Math.max(0, size - drag);
    const fill = fillOf(now, "sell", "SOL", SOL_MINT, prices.sol.usd, h.solQty, size, fee, slip, reason);
    fill.pnlUsd = net - (h.solCostUsd || size);
    fills.push(fill);
    pushFill(book, fill);
    h.usdcQty += net;
    h.solQty = 0;
    h.solCostUsd = 0;
  }
  if (h.spyxQty > 0) {
    const size = h.spyxQty * prices.spyx.usd;
    const { fee, slip, drag } = costs(size, impact);
    const net = Math.max(0, size - drag);
    const fill = fillOf(now, "sell", "SPYx", spyxMint(), prices.spyx.usd, h.spyxQty, size, fee, slip, reason);
    fill.pnlUsd = net - (h.spyxCostUsd || size);
    fills.push(fill);
    pushFill(book, fill);
    h.usdcQty += net;
    h.spyxQty = 0;
    h.spyxCostUsd = 0;
    if (mind) learnFromFill(mind, spyxMint(), 0, "sol_spyx", undefined, true);
  }
  book.pair = h;
  book.lastTradeAt = now;
  book.pendingIntent = null;
  markPair(book, prices);
  bumpCurve(book, now);
  return fills;
}

function swapSleeves(
  book: PaperBook,
  prices: PairPrices,
  now: number,
  from: "SOL" | "SPYx",
  to: "SOL" | "SPYx",
  clipUsd: number,
  reason: string,
  impactPct: number,
  mind?: Mind,
): PaperFill[] {
  const h = pairOf(book);
  const fromPx = from === "SOL" ? prices.sol.usd : prices.spyx.usd;
  const toPx = to === "SOL" ? prices.sol.usd : prices.spyx.usd;
  const fromQtyAvail = from === "SOL" ? h.solQty : h.spyxQty;
  const maxUsd = fromQtyAvail * fromPx;
  const size = Math.min(clipUsd, maxUsd);
  if (size < 8 || fromPx <= 0 || toPx <= 0) return [];
  const { fee, slip, drag } = costs(size, impactPct);
  const sellQty = size / fromPx;
  const buyQty = Math.max(0, size - drag) / toPx;
  const fromMint = from === "SOL" ? SOL_MINT : spyxMint();
  const toMint = to === "SOL" ? SOL_MINT : spyxMint();
  const fromCost = from === "SOL" ? h.solCostUsd || 0 : h.spyxCostUsd || 0;
  const fromQtyBefore = fromQtyAvail;
  const costSold = fromQtyBefore > 0 ? fromCost * (sellQty / fromQtyBefore) : size;
  const sell = fillOf(now, "sell", from, fromMint, fromPx, sellQty, size, fee / 2, slip / 2, reason);
  sell.pnlUsd = size - drag - costSold;
  const buy = fillOf(now, "buy", to, toMint, toPx, buyQty, size - drag, fee / 2, slip / 2, reason);
  if (from === "SOL") {
    h.solQty = Math.max(0, h.solQty - sellQty);
    h.solCostUsd = Math.max(0, fromCost - costSold);
  } else {
    h.spyxQty = Math.max(0, h.spyxQty - sellQty);
    h.spyxCostUsd = Math.max(0, fromCost - costSold);
  }
  if (to === "SOL") {
    h.solQty += buyQty;
    h.solCostUsd = (h.solCostUsd || 0) + (size - drag);
  } else {
    h.spyxQty += buyQty;
    h.spyxCostUsd = (h.spyxCostUsd || 0) + (size - drag);
  }
  pushFill(book, sell);
  pushFill(book, buy);
  book.pair = h;
  book.lastTradeAt = now;
  if (mind) {
    noteOpen(mind, toMint, [Math.min(1, Math.abs(size / Math.max(1, book.equityUsd))), 0.5, from === "SOL" ? 1 : 0, 0.5, 0.5], "sol_spyx");
  }
  return [sell, buy];
}

function deployMix(
  book: PaperBook,
  prices: PairPrices,
  now: number,
  usd: number,
  solPct: number,
  reason: string,
  mind?: Mind,
): PaperFill[] {
  const h = pairOf(book);
  const spend = Math.min(usd, h.usdcQty);
  if (spend < 20) return [];
  const solUsd = spend * solPct;
  const spyxUsd = spend - solUsd;
  const fills: PaperFill[] = [];
  if (solUsd > 8 && prices.sol.usd > 0) {
    const { fee, slip, drag } = costs(solUsd);
    const qty = (solUsd - drag) / prices.sol.usd;
    const fill = fillOf(now, "buy", "SOL", SOL_MINT, prices.sol.usd, qty, solUsd, fee, slip, reason);
    pushFill(book, fill);
    fills.push(fill);
    h.solQty += qty;
    h.solCostUsd = (h.solCostUsd || 0) + solUsd;
    h.usdcQty -= solUsd;
  }
  if (spyxUsd > 8 && prices.spyx.usd > 0) {
    const { fee, slip, drag } = costs(spyxUsd);
    const qty = (spyxUsd - drag) / prices.spyx.usd;
    const fill = fillOf(now, "buy", "SPYx", spyxMint(), prices.spyx.usd, qty, spyxUsd, fee, slip, reason);
    pushFill(book, fill);
    fills.push(fill);
    h.spyxQty += qty;
    h.spyxCostUsd = (h.spyxCostUsd || 0) + spyxUsd;
    h.usdcQty -= spyxUsd;
    if (mind) noteOpen(mind, spyxMint(), [0.5, 0.5, 0, 0.5, 0.5], "sol_spyx");
  }
  book.pair = h;
  book.lastTradeAt = now;
  return fills;
}

export function applyPairDecision(
  book: PaperBook,
  decision: PairDecision,
  prices: PairPrices,
  now: number,
  mind?: Mind,
  impactPct = 0,
): { fills: PaperFill[]; skipped: boolean } {
  markPair(book, prices);
  const tapeAction =
    decision.action === "sell_sol" || decision.action === "sell_spyx" || decision.action === "rebalance"
      ? "trade"
      : decision.action === "deploy"
        ? "deploy"
        : decision.action === "flatten"
          ? "flatten"
          : decision.action === "skip"
            ? "skip"
            : "hold";
  pushTape(
    book,
    tapeOf(now, tapeAction, decision.reason, {
      z: decision.z7,
      ratio: decision.ratio,
      sizeUsd: decision.clipUsd,
      from: decision.from,
      to: decision.to,
    }),
  );

  if (decision.action === "hold" || decision.action === "skip") {
    book.pendingIntent = null;
    markPair(book, prices);
    bumpCurve(book, now);
    return { fills: [], skipped: decision.action === "skip" };
  }

  let fills: PaperFill[] = [];
  if (decision.action === "flatten") {
    fills = flattenToUsdc(book, prices, now, decision.reason, mind);
    book.haltedUntil = now + 12 * 60 * 60 * 1000;
    book.haltReason = decision.reason;
  } else if (decision.action === "deploy") {
    const solPct = decision.solPct ?? 0.5;
    fills = deployMix(book, prices, now, decision.clipUsd, solPct, decision.reason, mind);
  } else if (decision.action === "sell_sol" || decision.action === "rebalance") {
    if (decision.from === "SOL" && decision.to === "SPYx") {
      fills = swapSleeves(book, prices, now, "SOL", "SPYx", decision.clipUsd, decision.reason, impactPct, mind);
    } else if (decision.from === "SPYx" && decision.to === "SOL") {
      fills = swapSleeves(book, prices, now, "SPYx", "SOL", decision.clipUsd, decision.reason, impactPct, mind);
    }
  } else if (decision.action === "sell_spyx") {
    fills = swapSleeves(book, prices, now, "SPYx", "SOL", decision.clipUsd, decision.reason, impactPct, mind);
  }

  book.pendingIntent = null;
  markPair(book, prices);
  bumpCurve(book, now);
  return { fills, skipped: fills.length === 0 };
}

export function killBook(book: PaperBook, prices: PairPrices, now: number, mind?: Mind): PaperBook {
  flattenToUsdc(book, prices, now, "Kill switch. Flatten to USDC and halt.", mind);
  book.killed = true;
  book.haltedUntil = now + 10 * 365 * 24 * 60 * 60 * 1000;
  book.haltReason = "Kill switch. Flattened to USDC.";
  pushTape(book, tapeOf(now, "kill", "Kill switch. Flatten to USDC and halt."));
  return book;
}

export function unkilled(book: PaperBook): PaperBook {
  book.killed = false;
  book.haltedUntil = undefined;
  book.haltReason = undefined;
  return book;
}

export function tickPairBook(opts: {
  book: PaperBook;
  auto: AutoSettings;
  prices: PairPrices;
  samples: RatioSample[];
  study: HistoryStudy;
  now: number;
  mind?: Mind;
  depositedSol?: number;
  impactPct?: number;
  quoteOk?: boolean;
}): { decision: PairDecision; fills: PaperFill[] } {
  const losses = opts.book.lossCount || 0;
  const decision = decidePair({
    auto: opts.auto,
    book: opts.book,
    prices: opts.prices,
    samples: opts.samples,
    study: opts.study,
    now: opts.now,
    losses,
    depositedSol: opts.depositedSol,
    impactPct: opts.impactPct,
    quoteOk: opts.quoteOk,
  });
  const live = opts.auto.mode === "live" && LIVE_TRADING;
  const actionable =
    decision.action === "sell_sol" ||
    decision.action === "sell_spyx" ||
    decision.action === "flatten" ||
    decision.action === "deploy" ||
    decision.action === "rebalance";
  if (live && actionable) {
    const prev = opts.book.pendingIntent;
    const liveAction = decision.action as PairIntent["action"];
    const same = prev && prev.action === liveAction && prev.reason === decision.reason && opts.now - prev.at < 90_000;
    if (!same) {
      const intent: PairIntent = {
        action: liveAction,
        from: decision.from,
        to: decision.to,
        clipUsd: decision.clipUsd,
        reason: decision.reason,
        at: opts.now,
        solPct: decision.solPct,
      };
      opts.book.pendingIntent = intent;
      pushTape(
        opts.book,
        tapeOf(opts.now, decision.action === "flatten" ? "flatten" : decision.action === "deploy" ? "deploy" : "trade", `Live · waiting for signature. ${decision.reason}`, {
          z: decision.z7,
          ratio: decision.ratio,
          sizeUsd: decision.clipUsd,
          from: decision.from,
          to: decision.to,
        }),
      );
    }
    markPair(opts.book, opts.prices);
    bumpCurve(opts.book, opts.now);
    return { decision, fills: [] };
  }
  const { fills } = applyPairDecision(opts.book, decision, opts.prices, opts.now, opts.mind, opts.impactPct || 0);
  return { decision, fills };
}


