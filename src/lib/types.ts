export type Venue =
  | "pumpfun"
  | "pumpswap"
  | "launchlab"
  | "raydium"
  | "meteora"
  | "orca"
  | "unknown";

export type Strategy = "launch_snipe" | "migration_snipe" | "copy_trade" | "scalp";

export type Side = "buy" | "sell";

export interface Socials {
  twitter?: string;
  telegram?: string;
  website?: string;
}

export interface TokenSnapshot {
  mint: string;
  name: string;
  symbol: string;
  image?: string;
  venue: Venue;
  pairAddress?: string;
  creator?: string;
  createdAt: number;
  priceUsd: number;
  marketCapUsd: number;
  liquidityUsd: number;
  volume5m: number;
  volume1h: number;
  volume24h: number;
  txns5m: number;
  txns1h: number;
  buys1h: number;
  sells1h: number;
  uniqueTraders1h: number;
  uniqueEstimated?: boolean;
  priceChange5m: number;
  priceChange1h: number;
  priceChange6h: number;
  priceChange24h: number;
  bondingProgress: number;
  graduated: boolean;
  nsfw: boolean;
  banned: boolean;
  livestream: boolean;
  replyCount: number;
  verified: boolean;
  socials: Socials;
  mintAuthorityRevoked?: boolean;
  freezeAuthorityRevoked?: boolean;
  lpLockedOrBurned?: boolean;
  top10HolderPct?: number;
  bundleRatio?: number;
  organicBuyRatio?: number;
  devSoldPct?: number;
  smartMoneyInflow?: boolean;
  copiedBy?: string[];
  copiedHolding?: boolean;
  leaderHoldPct?: number;
  farmCluster?: boolean;
  deployerDeathRate?: number;
  deployerTokenCount?: number;
  athMarketCapUsd?: number;
}

export interface RiskFactor {
  id: string;
  label: string;
  delta: number;
  detail: string;
}

export interface RiskReport {
  mint: string;
  score: number;
  grade: "X" | "D" | "C" | "B" | "A" | "S";
  verdict: "skip" | "wait" | "trade";
  vetoed: boolean;
  vetoReasons: string[];
  caps: string[];
  factors: RiskFactor[];
  allowedStrategies: Strategy[];
  summary: string;
  why: string;
  scoredAt: number;
  pGrad?: number;
}

export interface EngineSettings {
  minScoreLaunch: number;
  minScoreMigration: number;
  minScoreCopy: number;
  minScoreScalp: number;
  maxPositions: number;
  maxPositionPct: number;
  takeProfitPct: number;
  stopLossPct: number;
  trailingArmPct: number;
  trailingGivebackPct: number;
  feeBps: number;
  slippageBpsLaunch: number;
  slippageBpsMigration: number;
  slippageBpsCopy: number;
  slippageBpsScalp: number;
  maxNewEntriesPerTick: number;
  launchMaxAgeMs: number;
  migrationMinBonding: number;
  timeStopLaunchMs: number;
  timeStopMigrationMs: number;
  timeStopCopyMs: number;
  timeStopScalpMs: number;
  dailyLossPct: number;
  maxCoinPct: number;
  bundleVeto: number;
  leaderSupplyVeto: number;
  minWalletQuality: number;
  partialTp1: number;
  partialTp1Sell: number;
  partialTp2: number;
  partialTp2Sell: number;
  minPGradLaunch: number;
  minPGradMigrate: number;
  intentTtlMs: number;
}

export interface PaperPosition {
  id: string;
  mint: string;
  symbol: string;
  name: string;
  strategy: Strategy;
  openedAt: number;
  entryUsd: number;
  qty: number;
  originalQty: number;
  sizeUsd: number;
  originalSizeUsd: number;
  feeUsd: number;
  slippageUsd: number;
  tpUsd: number;
  slUsd: number;
  trailArmed: boolean;
  trailPeakUsd: number;
  markUsd: number;
  unrealizedUsd: number;
  riskScore: number;
  venue: Venue;
  copiedFrom?: string;
  scaledOut: number;
}

export interface PaperFill {
  id: string;
  mint: string;
  symbol: string;
  name: string;
  strategy: Strategy;
  side: Side;
  at: number;
  priceUsd: number;
  qty: number;
  sizeUsd: number;
  feeUsd: number;
  slippageUsd: number;
  pnlUsd?: number;
  pnlPct?: number;
  reason: string;
  riskScore: number;
  venue: Venue;
}

export interface EquityPoint {
  t: number;
  equity: number;
}

export interface PaperBook {
  startingUsd: number;
  startedAt: number;
  cashUsd: number;
  equityUsd: number;
  realizedPnlUsd: number;
  feesPaidUsd: number;
  slippagePaidUsd: number;
  winCount: number;
  lossCount: number;
  positions: PaperPosition[];
  fills: PaperFill[];
  curve: EquityPoint[];
  haltedUntil?: number;
  haltReason?: string;
}

export interface CreatorStat {
  creator: string;
  tokens: number;
  dead: number;
  survivors: number;
  lastSeen: number;
}

export interface AppUser {
  pubkey: string;
  email?: string;
  plan?: string;
  comped?: boolean;
  subscribedUntil?: number;
  createdAt: number;
  lastSeen: number;
  alertsEnabled: boolean;
}

export interface AutoSettings {
  armed: boolean;
  mode: "paper" | "live";
  copy: boolean;
  launch: boolean;
  migrate: boolean;
  scalp: boolean;
  maxSolPerTrade: number;
  minScore: number;
  tradingPubkey?: string;
}

export interface TraderAccount {
  owner: string;
  tradingPubkey?: string;
  depositedSol: number;
  auto: AutoSettings;
  book: PaperBook;
  updatedAt: number;
}

export interface AlertEvent {
  id: string;
  at: number;
  kind: "smart_money" | "launch" | "migration" | "risk" | "exit" | "entry" | "bundle" | "halt" | "deny";
  title: string;
  body: string;
  mint?: string;
  score?: number;
  strategy?: Strategy;
}

export interface EmailRecord {
  id: string;
  at: number;
  to: string;
  subject: string;
  html: string;
  status: "queued" | "sent" | "failed" | "preview";
  error?: string;
}

export interface AuditEvent {
  id: string;
  at: number;
  actor: string;
  action: string;
  detail: string;
  ip?: string;
}

export interface FeedHealth {
  source: string;
  ok: boolean;
  ms: number;
  count: number;
  error?: string;
  at: number;
}

export type LabKind = "copy" | "launch" | "migrate";

export interface LabStrategy {
  id: LabKind;
  enabled: boolean;
  demoted: boolean;
  shadowPnlUsd: number;
  greenDays: number;
  lastDayKey: string;
  lastDayPnl: number;
  trades: number;
  denied: number;
}

export interface AppState {
  paper: PaperBook;
  lab: Record<LabKind, LabStrategy>;
  settings: EngineSettings;
  users: AppUser[];
  alerts: AlertEvent[];
  emails: EmailRecord[];
  audit: AuditEvent[];
  creators: Record<string, CreatorStat>;
  watchWallets: string[];
  adminWallets: string[];
  traders: Record<string, TraderAccount>;
  feedHealth: FeedHealth[];
  lastTickAt: number;
  lastSnapshots: TokenSnapshot[];
}
