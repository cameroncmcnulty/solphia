import type { AutoSettings, Mind, PaperBook, PaperFill, PairTape } from "../types";
import { learnFromFill, noteOpen } from "../mind/engine";
import { pushBounded } from "../store";
import { applyFee } from "../risk/engine";
import {
  PAIR_FEE_BPS,
  PAIR_SLIP_BPS,
  PROTOCOL_FEE_BPS,
  SLEEVE_WEIGHT,
  costOf,
  decidePair,
  fillOf,
  id,
  markPair,
  pairOf,
  qtyOf,
  setSleeve,
  type PairDecision,
  type Sleeve,
} from "./engine";
import { liveTradingEnabled } from "../liveFlag";
import { DEFAULT_LEARN, noteExit } from "./signals";
import type { HistoryStudy } from "./knowledge";
import { SOL_MINT, USDC_MINT, XSTOCKS, type XStockId, type XStockSymbol, xstockBySymbol, xstockMint } from "./mints";
import type { PairPrices } from "./prices";
import { borrowUsd, closeFeeUsd, clampLev, notionalUsd, openFeeUsd } from "../leverage";
import type { SolPerp } from "../types";
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
  const fee = applyFee(sizeUsd, PAIR_FEE_BPS) + applyFee(sizeUsd, PROTOCOL_FEE_BPS);
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

function pxOf(prices: PairPrices, id: XStockId): number {
  return prices[id]?.usd || 0;
}

function asXId(from: string | undefined): XStockId | null {
  const row = xstockBySymbol(from || "");
  return row ? row.id : null;
}

function mintOfSleeve(sleeve: string): string {
  if (sleeve === "SOL") return SOL_MINT;
  if (sleeve === "USDC") return USDC_MINT;
  const row = xstockBySymbol(sleeve);
  return row ? xstockMint(row.id) : SOL_MINT;
}

function touchClip(h: ReturnType<typeof pairOf>, pairId: string | undefined, now: number) {
  if (!h.lastClipAt) h.lastClipAt = {};
  if (pairId) h.lastClipAt[pairId] = now;
}

export function flattenToUsdc(book: PaperBook, prices: PairPrices, now: number, reason: string, mind?: Mind): PaperFill[] {
  const h = pairOf(book);
  const fills: PaperFill[] = [];
  if (h.solPerp) {
    const fill = closeSolPerp(h, book, prices, now, reason);
    if (fill) fills.push(fill);
  }
  if (h.solQty > 0 && prices.sol.usd > 0) {
    const size = h.solQty * prices.sol.usd;
    const { fee, slip, drag } = costs(size);
    const net = Math.max(0, size - drag);
    const fill = fillOf(now, "sell", "SOL", SOL_MINT, prices.sol.usd, h.solQty, size, fee, slip, reason);
    fill.pnlUsd = net - (h.solCostUsd || size);
    fills.push(fill);
    pushFill(book, fill);
    h.usdcQty += net;
    h.solQty = 0;
    h.solCostUsd = 0;
    if (h.stops) delete h.stops.SOL;
    if (!book.pairLearn) book.pairLearn = {};
    book.pairLearn.SOL = noteExit(book.pairLearn.SOL || DEFAULT_LEARN, fill.pnlUsd || 0);
  }
  for (const x of XSTOCKS) {
    const qty = qtyOf(h, x.id);
    const px = pxOf(prices, x.id);
    if (qty <= 0 || !(px > 0)) {
      setSleeve(h, x.id, 0, 0);
      continue;
    }
    const size = qty * px;
    const { fee, slip, drag } = costs(size);
    const net = Math.max(0, size - drag);
    const fill = fillOf(now, "sell", x.symbol, xstockMint(x.id), px, qty, size, fee, slip, reason);
    fill.pnlUsd = net - (costOf(h, x.id) || size);
    fills.push(fill);
    pushFill(book, fill);
    h.usdcQty += net;
    setSleeve(h, x.id, 0, 0);
    if (h.stops) delete h.stops[x.symbol as "SPYx" | "QQQx" | "GLDx"];
    if (!book.pairLearn) book.pairLearn = {};
    book.pairLearn[x.symbol] = noteExit(book.pairLearn[x.symbol] || DEFAULT_LEARN, fill.pnlUsd || 0);
    if (mind) learnFromFill(mind, xstockMint(x.id), 0, "sol_spyx", undefined, true);
  }
  book.pair = h;
  book.lastTradeAt = now;
  book.pendingIntent = null;
  markPair(book, prices);
  bumpCurve(book, now);
  return fills;
}

function buyFromUsd(
  h: ReturnType<typeof pairOf>,
  book: PaperBook,
  prices: PairPrices,
  now: number,
  symbol: "SOL" | XStockSymbol,
  usd: number,
  reason: string,
  mind?: Mind,
): PaperFill | null {
  if (usd < 8) return null;
  if (symbol === "SOL") {
    if (!(prices.sol.usd > 0)) return null;
    const { fee, slip, drag } = costs(usd);
    const qty = (usd - drag) / prices.sol.usd;
    const fill = fillOf(now, "buy", "SOL", SOL_MINT, prices.sol.usd, qty, usd, fee, slip, reason);
    pushFill(book, fill);
    h.solQty += qty;
    h.solCostUsd = (h.solCostUsd || 0) + usd;
    h.usdcQty -= usd;
    return fill;
  }
  const row = xstockBySymbol(symbol);
  if (!row) return null;
  const px = pxOf(prices, row.id);
  if (!(px > 0)) return null;
  const { fee, slip, drag } = costs(usd);
  const qty = (usd - drag) / px;
  const fill = fillOf(now, "buy", row.symbol, xstockMint(row.id), px, qty, usd, fee, slip, reason);
  pushFill(book, fill);
  setSleeve(h, row.id, qtyOf(h, row.id) + qty, costOf(h, row.id) + usd);
  h.usdcQty -= usd;
  if (mind) noteOpen(mind, xstockMint(row.id), [0.5, 0.5, 0, 0.5, 0.5], "sol_spyx");
  return fill;
}

function sleevePx(prices: PairPrices, sleeve: Sleeve): number {
  if (sleeve === "USDC") return 1;
  if (sleeve === "SOL") return prices.sol.usd || 0;
  const id = asXId(sleeve);
  return id ? pxOf(prices, id) : 0;
}

function sleeveQty(h: ReturnType<typeof pairOf>, sleeve: Sleeve): number {
  if (sleeve === "USDC") return h.usdcQty || 0;
  if (sleeve === "SOL") return h.solQty || 0;
  const id = asXId(sleeve);
  return id ? qtyOf(h, id) : 0;
}

function sleeveCost(h: ReturnType<typeof pairOf>, sleeve: Sleeve): number {
  if (sleeve === "USDC") return h.usdcQty || 0;
  if (sleeve === "SOL") return h.solCostUsd || 0;
  const id = asXId(sleeve);
  return id ? costOf(h, id) : 0;
}

function applySell(h: ReturnType<typeof pairOf>, sleeve: Sleeve, qty: number, costSold: number) {
  if (sleeve === "USDC") {
    h.usdcQty = Math.max(0, (h.usdcQty || 0) - qty);
    return;
  }
  if (sleeve === "SOL") {
    h.solQty = Math.max(0, h.solQty - qty);
    h.solCostUsd = Math.max(0, (h.solCostUsd || 0) - costSold);
    return;
  }
  const id = asXId(sleeve);
  if (id) setSleeve(h, id, Math.max(0, qtyOf(h, id) - qty), Math.max(0, costOf(h, id) - costSold));
}

function applyBuy(h: ReturnType<typeof pairOf>, sleeve: Sleeve, qty: number, costUsd: number) {
  if (sleeve === "USDC") {
    h.usdcQty = (h.usdcQty || 0) + qty;
    return;
  }
  if (sleeve === "SOL") {
    h.solQty += qty;
    h.solCostUsd = (h.solCostUsd || 0) + costUsd;
    return;
  }
  const id = asXId(sleeve);
  if (id) setSleeve(h, id, qtyOf(h, id) + qty, costOf(h, id) + costUsd);
}

function openSolPerp(h: ReturnType<typeof pairOf>, now: number, collateralUsd: number, px: number, lev: 2 | 3): SolPerp {
  const notional = notionalUsd(collateralUsd, lev);
  return {
    leverage: lev,
    collateralUsd,
    notionalUsd: notional,
    entryPx: px,
    openedAt: now,
    lastBorrowAt: now,
    borrowPaidUsd: 0,
  };
}

function closeSolPerp(
  h: ReturnType<typeof pairOf>,
  book: PaperBook,
  prices: PairPrices,
  now: number,
  reason: string,
): PaperFill | null {
  const p = h.solPerp;
  if (!p || !(p.entryPx > 0)) return null;
  const px = prices.sol.usd;
  const pnl = ((px - p.entryPx) / p.entryPx) * p.notionalUsd;
  const fee = closeFeeUsd(p.notionalUsd);
  const borrow =
    (p.borrowPaidUsd || 0) +
    borrowUsd({ notionalUsd: p.notionalUsd, lev: p.leverage, from: p.lastBorrowAt, to: now });
  const back = p.collateralUsd + pnl - fee - borrow;
  h.usdcQty += Math.max(0, back);
  const fill = fillOf(now, "sell", "SOL-PERP", SOL_MINT, px, p.notionalUsd / p.entryPx, p.notionalUsd, fee, 0, reason);
  fill.pnlUsd = back - p.collateralUsd;
  pushFill(book, fill);
  h.solPerp = null;
  if (h.stops) delete h.stops.SOL;
  if (!book.pairLearn) book.pairLearn = {};
  book.pairLearn.SOL = noteExit(book.pairLearn.SOL || DEFAULT_LEARN, fill.pnlUsd || 0);
  return fill;
}

function swapSleeves(
  book: PaperBook,
  prices: PairPrices,
  now: number,
  from: Sleeve,
  to: Sleeve,
  clipUsd: number,
  reason: string,
  impactPct: number,
  mind?: Mind,
  pairId?: string,
): PaperFill[] {
  const h = pairOf(book);
  const fromPx = sleevePx(prices, from);
  const toPx = sleevePx(prices, to);
  const fromQtyAvail = sleeveQty(h, from);
  const maxUsd = fromQtyAvail * fromPx;
  const lev = clampLev(book.solLeverage);
  if (from === "USDC" && to === "SOL" && (lev === 2 || lev === 3)) {
    if (h.solPerp) return [];
    const size = Math.min(clipUsd, h.usdcQty);
    if (size < 8 || toPx <= 0) return [];
    const notional = notionalUsd(size, lev);
    const fee = openFeeUsd(notional);
    const collat = Math.max(8, size - fee);
    if (h.usdcQty < size) return [];
    h.usdcQty -= size;
    h.solPerp = openSolPerp(h, now, collat, toPx, lev);
    const buy = fillOf(now, "buy", "SOL-PERP", SOL_MINT, toPx, notional / toPx, notional, fee, 0, `${reason} · ${lev}x`);
    pushFill(book, buy);
    touchClip(h, pairId, now);
    if (!h.stops) h.stops = {};
    h.stops.SOL = { entryPx: toPx, peakPx: toPx, stopPx: 0, armed: false };
    book.pair = h;
    book.lastTradeAt = now;
    return [buy];
  }
  if (from === "SOL" && to === "USDC" && h.solPerp) {
    const fill = closeSolPerp(h, book, prices, now, reason);
    book.pair = h;
    book.lastTradeAt = now;
    return fill ? [fill] : [];
  }
  const size = Math.min(clipUsd, maxUsd);
  if (size < 8 || fromPx <= 0 || toPx <= 0) return [];
  const { fee, slip, drag } = costs(size, impactPct);
  const sellQty = size / fromPx;
  const buyQty = Math.max(0, size - drag) / toPx;
  const fromMint = mintOfSleeve(from);
  const toMint = mintOfSleeve(to);
  const fromCost = sleeveCost(h, from);
  const costSold = fromQtyAvail > 0 ? fromCost * (sellQty / fromQtyAvail) : size;
  const sell = fillOf(now, "sell", from, fromMint, fromPx, sellQty, size, fee / 2, slip / 2, reason);
  sell.pnlUsd = from === "USDC" ? -drag : size - drag - costSold;
  const buy = fillOf(now, "buy", to, toMint, toPx, buyQty, size - drag, fee / 2, slip / 2, reason);
  applySell(h, from, sellQty, costSold);
  applyBuy(h, to, buyQty, size - drag);
  pushFill(book, sell);
  pushFill(book, buy);
  touchClip(h, pairId, now);
  if (!h.stops) h.stops = {};
  if (!book.pairLearn) book.pairLearn = {};
  if (from === "USDC" && to !== "USDC") {
    const k = to as "SOL" | "SPYx" | "QQQx" | "GLDx";
    h.stops[k] = { entryPx: toPx, peakPx: toPx, stopPx: 0, armed: false };
  }
  if (to === "USDC" && from !== "USDC") {
    const k = from as "SOL" | "SPYx" | "QQQx" | "GLDx";
    delete h.stops[k];
    book.pairLearn[from] = noteExit(book.pairLearn[from] || DEFAULT_LEARN, sell.pnlUsd || 0);
  }
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
  reason: string,
  mind?: Mind,
  only?: XStockId | "SOL",
): PaperFill[] {
  const h = pairOf(book);
  const spend = Math.min(usd, h.usdcQty);
  if (spend < 20 && !only) return [];
  const fills: PaperFill[] = [];
  if (only && only !== "SOL") {
    const row = XSTOCKS.find((x) => x.id === only);
    if (row) {
      const take = Math.min(spend, Math.max(20, spend));
      const fill = buyFromUsd(h, book, prices, now, row.symbol, take, reason, mind);
      if (fill) fills.push(fill);
      touchClip(h, only, now);
    }
  } else {
    const solUsd = spend * SLEEVE_WEIGHT;
    const perX = spend * SLEEVE_WEIGHT;
    const solFill = buyFromUsd(h, book, prices, now, "SOL", solUsd, reason, mind);
    if (solFill) fills.push(solFill);
    for (const x of XSTOCKS) {
      const fill = buyFromUsd(h, book, prices, now, x.symbol, perX, reason, mind);
      if (fill) fills.push(fill);
      touchClip(h, x.id, now);
    }
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
    decision.action === "sell_sol" ||
    decision.action === "sell_xstock" ||
    decision.action === "sell_spyx" ||
    decision.action === "swap" ||
    decision.action === "rebalance"
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
    fills = deployMix(
      book,
      prices,
      now,
      decision.clipUsd,
      decision.reason,
      mind,
      decision.asset || (decision.solPct === 1 ? "SOL" : undefined),
    );
  } else if (
    decision.action === "sell_sol" ||
    decision.action === "sell_xstock" ||
    decision.action === "sell_spyx" ||
    decision.action === "swap" ||
    decision.action === "rebalance"
  ) {
    const from = (decision.from === "both" || decision.from === "none" ? "SOL" : decision.from) as Sleeve;
    const to = (decision.to === "none" ? "SOL" : decision.to) as Sleeve;
    fills = swapSleeves(book, prices, now, from, to, decision.clipUsd, decision.reason, impactPct, mind, decision.pairId);
  }

  book.pendingIntent = null;
  markPair(book, prices);
  bumpCurve(book, now);
  return { fills, skipped: fills.length === 0 };
}

export function killBook(book: PaperBook, prices: PairPrices, now: number, mind?: Mind): PaperBook {
  flattenToUsdc(book, prices, now, "Kill switch. Flatten to cash and halt.", mind);
  book.killed = true;
  book.haltedUntil = now + 10 * 365 * 24 * 60 * 60 * 1000;
  book.haltReason = "Kill switch. Flattened to cash.";
  pushTape(book, tapeOf(now, "kill", "Kill switch. Flatten to cash and halt."));
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
  live?: boolean;
  shortTape?: import("./shortTape").ShortTape;
  frames?: import("./frames").ScalpFrames;
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
    live: opts.live || (opts.auto.mode === "live" && liveTradingEnabled()),
    shortTape: opts.shortTape,
    frames: opts.frames,
  });
  opts.book.solLeverage = clampLev(opts.auto.leverage);
  const live = (opts.live || (opts.auto.mode === "live" && liveTradingEnabled())) && opts.book.solLeverage === 1;
  const actionable =
    decision.action === "sell_sol" ||
    decision.action === "sell_xstock" ||
    decision.action === "sell_spyx" ||
    decision.action === "swap" ||
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
        asset: decision.asset,
        pairId: decision.pairId,
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
