import type { EngineSettings } from "./types";

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://solphia.io";
export const NETWORK = process.env.NEXT_PUBLIC_NETWORK || "mainnet-beta";
export const LIVE_TRADING = process.env.LIVE_TRADING === "true";
export const PAPER_STARTING_USD = Number(process.env.PAPER_STARTING_USD || 1000);
export const SUBSCRIPTION_SOL = 0.15;
export { PLANS } from "./plans";
export const FEE_BPS = 35;
export const TREASURY = process.env.SOLPHIA_TREASURY || "";
export const ADMIN_SECRET = process.env.ADMIN_SECRET || "";
export const CRON_SECRET = process.env.CRON_SECRET || "";
export const HELIUS_API_KEY = process.env.HELIUS_API_KEY || "";
export const XAI_API_KEY = process.env.XAI_API_KEY || "";
export const XAI_MODEL = "grok-4.6";
export const XAI_BASE = "https://api.x.ai/v1";

export const PUBLIC_RPC = "https://api.mainnet-beta.solana.com";

export function rpcUrl(): string {
  if (HELIUS_API_KEY) return `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;
  return PUBLIC_RPC;
}

export const DEFAULT_SETTINGS: EngineSettings = {
  minScoreLaunch: 78,
  minScoreMigration: 70,
  minScoreCopy: 68,
  minScoreScalp: 74,
  maxPositions: 8,
  maxPositionPct: 0.08,
  takeProfitPct: 0.32,
  stopLossPct: 0.16,
  trailingArmPct: 0.18,
  trailingGivebackPct: 0.09,
  feeBps: FEE_BPS,
  slippageBpsLaunch: 150,
  slippageBpsMigration: 70,
  slippageBpsCopy: 45,
  slippageBpsScalp: 55,
  maxNewEntriesPerTick: 2,
  launchMaxAgeMs: 8 * 60 * 1000,
  migrationMinBonding: 0.82,
  timeStopLaunchMs: 45 * 60 * 1000,
  timeStopMigrationMs: 2 * 60 * 60 * 1000,
  timeStopCopyMs: 4 * 60 * 60 * 1000,
  timeStopScalpMs: 90 * 60 * 1000,
};

export const RESEARCH = {
  pumpfunLaunchDayDeathPct: 68.67,
  pumpfunSurvive90dPct: 4.55,
  pumpfunGraduationWeeklyPct: 0.74,
  solidusScamPct: 98.6,
  raydiumSoftRugPct: 93,
  traderLossPct: 56.23,
  medianTraderProfitUsd: 0.02,
  industryFeeBps: 100,
  solphiaFeeBps: FEE_BPS,
  firstHourSurvivorVolumeMultiple: 19,
  firstHourSurvivorTradeMultiple: 13,
} as const;
