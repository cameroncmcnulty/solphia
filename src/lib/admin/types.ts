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
  admin: boolean;
  until: number | null;
  lastSeen: number;
  autoRenew: boolean;
};

export type AdminWindow = {
  volumeUsd: number;
  trades: number;
  feesUsd: number;
  pnlUsd: number;
};

export type AdminPromo = {
  id: string;
  at: number;
  kind: "image" | "video";
  aspect: "1:1" | "16:9" | "9:16";
  headline: string;
  caption: string;
  pnlLabel: string;
  mime: string;
  url: string;
  dataUrl?: string;
};

export type AdminOps = {
  holdingUsd: number;
  wallets: number;
  trading: number;
  h24: AdminWindow;
  d7: AdminWindow;
  d30: AdminWindow;
  newWallets24: number;
  solIn: number;
};

export type AdminPaper = {
  startingUsd: number;
  startedAt?: number;
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
  treasury: string;
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
  adminWallets: string[];
  ops: AdminOps;
  promos: AdminPromo[];
  promoPending: boolean;
  lastPromoDay: string;
  contentBot: boolean;
  xai: boolean;
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
  backtest?: import("../types").BacktestReport | null;
};
