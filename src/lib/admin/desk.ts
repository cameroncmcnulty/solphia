import { DEFAULT_AUTO } from "../auto";
import { PAIR_FEE_BPS, PAIR_SLIP_BPS, PROTOCOL_FEE_BPS, SUBSCRIPTION_SOL, XAI_API_KEY } from "../config";
import { liveTradingEnabled } from "../liveFlag";
import { SLEEVE_WEIGHT, TRADE_PAIRS } from "../pair/catalog";
import { SOL_MINT, USDC_MINT, gldxMint, qqqxMint, spyxMint } from "../pair/mints";
import type { PairDeskPublic } from "../pair/public";
import { heliusEnabled } from "../solana/connection";
import { isFounder } from "../access";
import { loadState } from "../store";
import { lastPairDesk, lastPairPrices, publicBook } from "../tick";
import { treasuryAddress } from "../treasury";
import { bookHoldingUsd, sumWindows, tradingNow, uniqueWallets } from "./stats";
import type { AdminDesk, AdminPromo, AdminSeat, AdminSleeve, AdminTrader } from "./types";

export type { AdminDesk, AdminSeat, AdminSleeve, AdminTrader } from "./types";

export function buildAdminDesk(): AdminDesk {
  const s = loadState();
  const paper = publicBook(s.paper);
  const pair = (lastPairDesk() || (s.lastPair as PairDeskPublic | null) || null) as PairDeskPublic | null;
  const px = lastPairPrices();
  const solUsd = px.solUsd || pair?.solUsd || 0;
  const spyxUsd = px.spyxUsd || pair?.spyxUsd || 0;
  const qqqxUsd = px.qqqxUsd || pair?.qqqxUsd || 0;
  const gldxUsd = px.gldxUsd || pair?.gldxUsd || 0;
  const prices = { solUsd, spyxUsd, qqqxUsd, gldxUsd };
  const h = paper.pair || { solQty: 0, spyxQty: 0, qqqxQty: 0, gldxQty: 0, usdcQty: paper.cashUsd };

  const sleeves: AdminSleeve[] = [
    { id: "USDC", name: "USDC", qty: h.usdcQty || 0, usd: 1, valueUsd: h.usdcQty || 0 },
    { id: "SOL", name: "SOL", qty: h.solQty || 0, usd: solUsd, valueUsd: (h.solQty || 0) * solUsd },
    { id: "SPYx", name: "S&P 500", qty: h.spyxQty || 0, usd: spyxUsd, valueUsd: (h.spyxQty || 0) * spyxUsd },
    { id: "QQQx", name: "Nasdaq-100", qty: h.qqqxQty || 0, usd: qqqxUsd, valueUsd: (h.qqqxQty || 0) * qqqxUsd },
    { id: "GLDx", name: "Gold", qty: h.gldxQty || 0, usd: gldxUsd, valueUsd: (h.gldxQty || 0) * gldxUsd },
  ];

  const traders: AdminTrader[] = Object.values(s.traders || {}).map((t) => {
    const book = publicBook(t.book);
    return {
      owner: t.owner,
      tradingPubkey: t.tradingPubkey || t.auto?.tradingPubkey || null,
      depositedSol: t.depositedSol || 0,
      mode: t.auto?.mode === "live" ? "live" : "paper",
      armed: Boolean(t.auto?.armed) && !t.book.killed,
      killed: Boolean(t.book.killed),
      equityUsd: book.equityUsd,
      pnlPct: book.pnlPct,
      trades: book.trades,
      lastAction: t.book.lastAction,
      pending: Boolean(t.book.pendingIntent),
      updatedAt: t.updatedAt,
    };
  });
  traders.sort((a, b) => b.updatedAt - a.updatedAt);

  const seats: AdminSeat[] = (s.users || []).map((u) => ({
    pubkey: u.pubkey,
    plan: u.plan === "live" || u.plan === "full" ? "live" : "paper",
    paid: Boolean(u.subscribedUntil && u.subscribedUntil > Date.now()),
    admin: isFounder(s, u.pubkey),
    until: u.subscribedUntil || null,
    lastSeen: u.lastSeen,
  }));
  seats.sort((a, b) => b.lastSeen - a.lastSeen);

  const books = [s.paper, ...Object.values(s.traders || {}).map((t) => t.book)];
  const windows = sumWindows(books);
  let holdingUsd = bookHoldingUsd(s.paper, prices);
  let solIn = 0;
  for (const t of Object.values(s.traders || {})) {
    holdingUsd += bookHoldingUsd(t.book, prices);
    solIn += t.depositedSol || 0;
  }
  const now = Date.now();
  const newWallets24 = (s.users || []).filter((u) => now - (u.createdAt || 0) < 86_400_000).length;
  const treasury = treasuryAddress();
  const promos: AdminPromo[] = (s.promos || [])
    .slice()
    .reverse()
    .map((p) => ({
      id: p.id,
      at: p.at,
      kind: p.kind,
      aspect: p.aspect,
      headline: p.headline,
      caption: p.caption,
      pnlLabel: p.pnlLabel,
      mime: p.mime,
      url: `/api/admin/promo/file?id=${encodeURIComponent(p.id)}`,
    }));

  return {
    liveTrading: liveTradingEnabled(),
    helius: heliusEnabled(),
    treasury,
    treasurySet: Boolean(treasury),
    lastTickAt: s.lastTickAt || 0,
    seatSol: SUBSCRIPTION_SOL,
    protocolFeeBps: PROTOCOL_FEE_BPS,
    pairFeeBps: PAIR_FEE_BPS,
    slipBps: PAIR_SLIP_BPS,
    paper,
    pair,
    prices,
    mints: {
      sol: SOL_MINT,
      usdc: USDC_MINT,
      spyx: spyxMint(),
      qqqx: qqqxMint(),
      gldx: gldxMint(),
    },
    sleeves,
    feedHealth: s.feedHealth || [],
    traders,
    seats,
    adminWallets: s.adminWallets || [],
    ops: {
      holdingUsd: round2(holdingUsd),
      wallets: uniqueWallets(s.users || [], s.traders || {}).length,
      trading: tradingNow(s.traders || {}, Boolean(s.paper.killed)),
      h24: roundWindow(windows.h24),
      d7: roundWindow(windows.d7),
      newWallets24,
      solIn: round2(solIn),
    },
    promos,
    promoPending: Boolean(s.promoPending),
    lastPromoDay: s.lastPromoDay || "",
    xai: Boolean(XAI_API_KEY),
    audit: (s.audit || []).slice(-40).reverse(),
    locked: {
      cooldownMin: DEFAULT_AUTO.cooldownMin,
      allocationPct: DEFAULT_AUTO.allocationPct,
      clipPct: DEFAULT_AUTO.clipPct,
      stopPct: DEFAULT_AUTO.stopPct,
      sleeveWeight: SLEEVE_WEIGHT,
      leverage: 1,
      style: DEFAULT_AUTO.style,
      band: DEFAULT_AUTO.band,
    },
    pairs: TRADE_PAIRS.map((p) => ({
      id: p.id,
      left: p.left,
      right: p.right,
      leftName: p.leftName,
      rightName: p.rightName,
    })),
  };
}

function round2(n: number) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

function roundWindow(w: { volumeUsd: number; trades: number; feesUsd: number; pnlUsd: number }) {
  return {
    volumeUsd: round2(w.volumeUsd),
    trades: w.trades,
    feesUsd: round2(w.feesUsd),
    pnlUsd: round2(w.pnlUsd),
  };
}
