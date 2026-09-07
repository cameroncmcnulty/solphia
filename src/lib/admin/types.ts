import type { AuditEvent, FeedHealth, PairIntent, PairTape } from "../types";

export type AdminSleeve = {
  id: string;
  name: string;
  qty: number;
  usd: number;
  valueUsd: number;
};

export type AdminTrader = {
  owner: string;
  tradingPubkey: string | null;
  depositedSol: number;
  mode: "paper" | "live";
  armed: boolean;
  killed: boolean;
  equityUsd: number;
  pnlPct: number;
  trades: number;
  lastAction?: string;
  pending: boolean;
  updatedAt: number;
};

export type AdminSeat = {
  pubkey: string;
  plan: string;
  paid: boolean;
  until: number | null;
  lastSeen: number;
};

export type AdminPaper = {
  startingUsd: number;
  cashUsd: number;
  equityUsd: number;
  pnlPct: number;
  feesPaidUsd: number;
  trades: number;
  skipped: number;
  lastAction?: string;
  lastSkipReason?: string;
  killed: boolean;
  haltReason?: string;
  haltedUntil?: number;
  tape: PairTape[];
  pendingIntent: PairIntent | null;
  pair: {
    solQty: number;
    spyxQty: number;
    qqqxQty?: number;
    gldxQty?: number;
    usdcQty: number;
  };
};

export type AdminPair = {
  session?: "cash" | "after_hours" | "weekend";
  reason?: string;
  signal?: string;
  z7?: number;
  z24?: number;
  stale?: boolean;
  oracle?: { sol: string; spyx: string; qqqx: string; gldx: string; ageMs: number };
  knowledge?: { note?: string };
};

export type AdminDesk = {
  liveTrading: boolean;
  helius: boolean;
  treasurySet: boolean;
  lastTickAt: number;
  seatSol: number;
  protocolFeeBps: number;
  pairFeeBps: number;
  slipBps: number;
  paper: AdminPaper;
  pair: AdminPair | null;
  prices: { solUsd: number; spyxUsd: number; qqqxUsd: number; gldxUsd: number };
  mints: { sol: string; usdc: string; spyx: string; qqqx: string; gldx: string };
  sleeves: AdminSleeve[];
  feedHealth: FeedHealth[];
  traders: AdminTrader[];
  seats: AdminSeat[];
  audit: AuditEvent[];
  locked: {
    cooldownMin: number;
    allocationPct: number;
    clipPct: number;
    stopPct: number;
    sleeveWeight: number;
    leverage: 1;
    style: string;
    band: string;
  };
  pairs: { id: string; left: string; right: string; leftName: string; rightName: string }[];
};
