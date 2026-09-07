import { DEFAULT_AUTO } from "../auto";
import {
  LIVE_TRADING,
  PAIR_FEE_BPS,
  PAIR_SLIP_BPS,
  PROTOCOL_FEE_BPS,
  SUBSCRIPTION_SOL,
  TREASURY,
} from "../config";
import { SLEEVE_WEIGHT, TRADE_PAIRS } from "../pair/catalog";
import { SOL_MINT, USDC_MINT, gldxMint, qqqxMint, spyxMint } from "../pair/mints";
import type { PairDeskPublic } from "../pair/public";
import { heliusEnabled } from "../solana/connection";
import { loadState } from "../store";
import { lastPairDesk, lastPairPrices, publicBook } from "../tick";
import type { AdminDesk, AdminSeat, AdminSleeve, AdminTrader } from "./types";

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
    plan: u.plan === "live" ? "live" : "paper",
    paid: Boolean(u.subscribedUntil && u.subscribedUntil > Date.now()),
    until: u.subscribedUntil || null,
    lastSeen: u.lastSeen,
  }));
  seats.sort((a, b) => b.lastSeen - a.lastSeen);

  return {
    liveTrading: LIVE_TRADING,
    helius: heliusEnabled(),
    treasurySet: Boolean(TREASURY),
    lastTickAt: s.lastTickAt || 0,
    seatSol: SUBSCRIPTION_SOL,
    protocolFeeBps: PROTOCOL_FEE_BPS,
    pairFeeBps: PAIR_FEE_BPS,
    slipBps: PAIR_SLIP_BPS,
    paper,
    pair,
    prices: { solUsd, spyxUsd, qqqxUsd, gldxUsd },
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
