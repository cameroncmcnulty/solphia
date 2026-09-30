/**
 * Option B: launch on Meteora Dynamic Bonding Curve.
 * Jupiter Instant Routing indexes this program, so Phantom Swap can buy pre-grad.
 * Static import + serverExternalPackages so Vercel traces the real node_modules tree
 * (webpack Function-import hid those requires and Phantom never saw a pair).
 */
import * as DbcMod from "@meteora-ag/dynamic-bonding-curve-sdk";
import BN from "bn.js";

import { connection } from "../solana/connection";
import { Keypair, PublicKey, Transaction, VersionedTransaction } from "@solana/web3.js";
import { encodeTx } from "../token/mint";
import { bytesToB64 } from "../solana/wire";
import { treasuryAddress } from "../treasury";
import { liveDbcConfig, dbcEnabled } from "./dbcIds";
import { MIN_TRADE_SOL } from "./curve";
import { CLAIM_DUST_SOL, feesFromPoolAccount } from "./claim";

const WSOL = "So11111111111111111111111111111111111111112";

export { dbcEnabled };

function sdk(): any {
  const m = DbcMod as any;
  return m.DynamicBondingCurveClient ? m : m.default;
}

function client() {
  return sdk().DynamicBondingCurveClient.create(connection(), "confirmed");
}

export async function solphiaCurveConfig() {
  const m = sdk();
  return m.buildCurveWithMarketCap({
    token: {
      tokenType: m.TokenType.SPLToken,
      tokenBaseDecimal: m.TokenDecimal.SIX,
      tokenQuoteDecimal: m.TokenDecimal.NINE,
      tokenAuthorityOption: m.TokenAuthorityOption.Immutable,
      totalTokenSupply: 1_000_000_000,
      leftover: 0,
    },
    fee: {
      baseFeeParams: {
        baseFeeMode: m.BaseFeeMode.FeeSchedulerLinear,
        feeSchedulerParam: {
          startingFeeBps: 100,
          endingFeeBps: 100,
          numberOfPeriod: 0,
          totalDuration: 0,
        },
      },
      dynamicFeeEnabled: false,
      collectFeeMode: m.CollectFeeMode.QuoteToken,
      creatorTradingFeePercentage: 50,
      poolCreationFee: 0,
      enableFirstSwapWithMinFee: false,
    },
    migration: {
      migrationOption: m.MigrationOption.MET_DAMM_V2,
      /** 100 bps on DAMM v2 after graduate — same 1% forever, not bonding-only. */
      migrationFeeOption: m.MigrationFeeOption.FixedBps100,
      migrationFee: { feePercentage: 0, creatorFeePercentage: 0 },
    },
    liquidityDistribution: {
      partnerLiquidityPercentage: 0,
      partnerPermanentLockedLiquidityPercentage: 100,
      creatorLiquidityPercentage: 0,
      creatorPermanentLockedLiquidityPercentage: 0,
    },
    lockedVesting: {
      totalLockedVestingAmount: 0,
      numberOfVestingPeriod: 0,
      cliffUnlockAmount: 0,
      totalVestingDuration: 0,
      cliffDurationFromMigrationTime: 0,
    },
    activationType: m.ActivationType.Timestamp,
    /** Quote mint is SOL. 40 SOL FDV ≈ $4.7k; 585 SOL ≈ $69k graduate. Not USD. */
    initialMarketCap: 40,
    migrationMarketCap: 585,
  });
}

export { liveDbcConfig };

export function curveNeedsInstall(bookConfig?: string | null): boolean {
  return !liveDbcConfig(bookConfig);
}

export async function dbcConfigOnchain(config?: string | null): Promise<string> {
  const pk = liveDbcConfig(config);
  if (!pk) return "";
  try {
    const state = await client().state.getPoolConfig(pk);
    return state ? pk : "";
  } catch {
    return "";
  }
}

export async function waitForDbcConfig(config: string, tries = 24): Promise<boolean> {
  if (!liveDbcConfig(config)) return false;
  for (let i = 0; i < tries; i++) {
    if (await dbcConfigOnchain(config)) return true;
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

export async function buildDbcCreateConfigTx(opts: { owner: string }): Promise<{
  transaction: string;
  config: string;
  configSecret: string;
}> {
  const payer = new PublicKey(opts.owner);
  const treasury = new PublicKey(treasuryAddress());
  const config = Keypair.generate();
  const params = await solphiaCurveConfig();
  const raw = await client().partner.createConfig({
    ...params,
    config: config.publicKey,
    feeClaimer: treasury,
    leftoverReceiver: treasury,
    quoteMint: new PublicKey(WSOL),
    payer,
  });
  const tx = await readyTx(raw as Transaction, payer);
  return {
    transaction: encodeTx(tx),
    config: config.publicKey.toBase58(),
    configSecret: bytesToB64(config.secretKey),
  };
}

async function readyTx(tx: Transaction, payer: PublicKey): Promise<Transaction> {
  const latest = await connection().getLatestBlockhash("confirmed");
  tx.feePayer = payer;
  tx.recentBlockhash = latest.blockhash;
  if ("lastValidBlockHeight" in tx) (tx as Transaction).lastValidBlockHeight = latest.lastValidBlockHeight;
  return tx;
}

export async function dbcPoolByMint(mint: string) {
  if (!dbcEnabled()) return null;
  try {
    return await client().state.getPoolByBaseMint(mint);
  } catch {
    return null;
  }
}

export async function waitForDbcPool(mint: string, tries = 24) {
  let pool = await dbcPoolByMint(mint);
  for (let i = 0; i < tries && !pool; i++) {
    await new Promise((r) => setTimeout(r, 750));
    pool = await dbcPoolByMint(mint);
  }
  return pool;
}

export async function buildDbcLaunchTx(opts: {
  payer: string;
  mint: string;
  name: string;
  symbol: string;
  uri: string;
  buySol?: number;
  config?: string;
}): Promise<{
  transaction: string;
  mint: string;
  tokensOut: number;
  feeSol: number;
  config?: string;
  configSecret?: string;
}> {
  if (!dbcEnabled()) throw new Error("DBC config missing.");
  const payer = new PublicKey(opts.payer);
  const mint = new PublicKey(opts.mint);
  const buySol = Math.max(0, Number(opts.buySol) || 0);
  const existing = await dbcConfigOnchain(opts.config);
  const name = opts.name.slice(0, 32);
  const symbol = opts.symbol.slice(0, 10);
  const uri = opts.uri.slice(0, 255);
  const firstBuy =
    buySol >= MIN_TRADE_SOL
      ? {
          buyer: payer,
          buyAmount: new BN(Math.round(buySol * 1e9)),
          minimumAmountOut: new BN(1),
          referralTokenAccount: null,
        }
      : undefined;

  if (existing) {
    const createPoolParam = {
      name,
      symbol,
      uri,
      payer,
      poolCreator: payer,
      config: new PublicKey(existing),
      baseMint: mint,
    };
    const raw = firstBuy
      ? await client().creator.createPoolWithFirstBuy({ createPoolParam, firstBuyParam: firstBuy })
      : await client().creator.createPool(createPoolParam);
    const tx = await readyTx(raw as Transaction, payer);
    return { transaction: encodeTx(tx), mint: mint.toBase58(), tokensOut: 0, feeSol: buySol * 0.01, config: existing };
  }

  const configKp = Keypair.generate();
  const treasury = new PublicKey(treasuryAddress());
  const curve = await solphiaCurveConfig();
  const raw = await client().partner.createConfigAndPool({
    ...curve,
    config: configKp.publicKey,
    feeClaimer: treasury,
    leftoverReceiver: treasury,
    quoteMint: new PublicKey(WSOL),
    payer,
    preCreatePoolParam: {
      name,
      symbol,
      uri,
      poolCreator: payer,
      baseMint: mint,
    },
  });
  const tx = await readyTx(raw as Transaction, payer);
  return {
    transaction: encodeTx(tx),
    mint: mint.toBase58(),
    tokensOut: 0,
    feeSol: buySol * 0.01,
    config: configKp.publicKey.toBase58(),
    configSecret: bytesToB64(configKp.secretKey),
  };
}

export type DbcFees = {
  creatorFeesSol: number;
  creatorUnclaimedSol: number;
  partnerFeesSol: number;
  partnerUnclaimedSol: number;
};

function lamportsToSol(v: { toString(): string } | number | null | undefined): number {
  const n = Number(v?.toString?.() || v || 0);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return n / 1e9;
}

export { feesFromPoolAccount };

function poolInner(row: { publicKey: PublicKey; account: any }) {
  return row.account?.poolState || row.account || {};
}

export async function dbcFeeBreakdown(mint: string): Promise<DbcFees | null> {
  if (!dbcEnabled() || !mint) return null;
  try {
    const dbc = client();
    const row = await dbc.state.getPoolByBaseMint(mint);
    if (!row) return null;
    const bd = await dbc.state.getPoolFeeBreakdown(row.publicKey);
    return {
      creatorFeesSol: lamportsToSol(bd.creator.totalQuoteFee),
      creatorUnclaimedSol: lamportsToSol(bd.creator.unclaimedQuoteFee),
      partnerFeesSol: lamportsToSol(bd.partner.totalQuoteFee),
      partnerUnclaimedSol: lamportsToSol(bd.partner.unclaimedQuoteFee),
    };
  } catch {
    return null;
  }
}

export async function dbcFeesForMints(mints: string[]): Promise<Record<string, DbcFees>> {
  const uniq = [...new Set(mints.filter(Boolean))].slice(0, 16);
  const key = "fees:" + uniq.sort().join(",");
  return cached(key, 20_000, async () => {
    const out: Record<string, DbcFees> = {};
    await Promise.all(
      uniq.map(async (mint) => {
        const fees = await dbcFeeBreakdown(mint);
        if (fees) out[mint] = fees;
      }),
    );
    return out;
  });
}

export type ChainPadCoin = {
  mint: string;
  pool: string;
  creator: string;
  creatorFeesSol: number;
  creatorUnclaimedSol: number;
  partnerFeesSol: number;
  partnerUnclaimedSol: number;
  quoteSol: number;
};

function pkStr(v: unknown): string {
  if (!v) return "";
  if (typeof v === "string") return v;
  if (typeof v === "object" && typeof (v as { toBase58?: () => string }).toBase58 === "function") {
    return (v as { toBase58: () => string }).toBase58();
  }
  return "";
}

function mintOfPool(row: { publicKey: PublicKey; account: any }): string {
  const inner = poolInner(row);
  return pkStr(inner.baseMint) || pkStr(inner.base_mint);
}

function quoteSolOf(inner: Record<string, unknown>): number {
  for (const k of ["quoteReserve", "quote_reserve", "quoteReserveAmount", "quote_reserve_amount"]) {
    const n = lamportsToSol(inner?.[k] as { toString(): string } | number | null | undefined);
    if (n > 0) return n;
  }
  return 0;
}

export function clearDbcCreatorCache(creator?: string) {
  if (creator) memo.delete("pools:" + creator);
  for (const k of [...memo.keys()]) {
    if (k.startsWith("fees:")) memo.delete(k);
  }
}

const memo = new Map<string, { at: number; data: unknown }>();
const inflight = new Map<string, Promise<unknown>>();
function cached<T>(key: string, ms: number, fn: () => Promise<T>): Promise<T> {
  const hit = memo.get(key);
  if (hit && Date.now() - hit.at < ms) return Promise.resolve(hit.data as T);
  const pending = inflight.get(key) as Promise<T> | undefined;
  if (pending) return pending;
  const p = fn()
    .then((data) => {
      memo.set(key, { at: Date.now(), data });
      inflight.delete(key);
      return data;
    })
    .catch((e) => {
      inflight.delete(key);
      throw e;
    });
  inflight.set(key, p);
  return p;
}

export async function chainCoinsForCreator(creator: string): Promise<ChainPadCoin[]> {
  if (!dbcEnabled() || !creator) return [];
  return cached("pools:" + creator, 8_000, async () => {
    const dbc = client();
    let pools: { publicKey: PublicKey; account: any }[] = [];
    try {
      pools = await dbc.state.getPoolsByCreator(creator);
    } catch {
      return [] as ChainPadCoin[];
    }
    return pools
      .map((row) => {
        const mint = mintOfPool(row);
        const inner = poolInner(row);
        const fees = feesFromPoolAccount(inner);
        return {
          mint,
          pool: row.publicKey.toBase58(),
          creator: String(inner.creator || creator),
          ...fees,
          quoteSol: quoteSolOf(inner),
        };
      })
      .filter((p) => p.mint);
  });
}

export async function chainPartnerTotals(config: string): Promise<{
  unclaimedSol: number;
  totalSol: number;
  byMint: Record<string, DbcFees>;
}> {
  const empty = { unclaimedSol: 0, totalSol: 0, byMint: {} as Record<string, DbcFees> };
  if (!dbcEnabled() || !config) return empty;
  const dbc = client();
  let pools: { publicKey: PublicKey; account: any }[] = [];
  try {
    pools = await dbc.state.getPoolsByConfig(config);
  } catch {
    return empty;
  }
  let unclaimedSol = 0;
  let totalSol = 0;
  const byMint: Record<string, DbcFees> = {};
  for (const row of pools) {
    const mint = mintOfPool(row);
    if (!mint) continue;
    const fees = feesFromPoolAccount(poolInner(row));
    byMint[mint] = fees;
    unclaimedSol += fees.partnerUnclaimedSol;
    totalSol += fees.partnerFeesSol;
  }
  return { unclaimedSol, totalSol, byMint };
}

export type DbcClaimBatch = {
  ok: true;
  transaction: string;
  claimSol: number;
  mints: string[];
  remaining: number;
  remainingSol: number;
  remainingMints: string[];
};

/** Phantom Blowfish flags restitched / multi-pool claims as malicious. One SDK claim, unchanged. */
async function simulateClaim(tx: Transaction): Promise<boolean> {
  try {
    const vtx = new VersionedTransaction(tx.compileMessage());
    const sim = await connection().simulateTransaction(vtx, {
      sigVerify: false,
      replaceRecentBlockhash: true,
      commitment: "confirmed",
    });
    return !sim.value.err;
  } catch {
    return false;
  }
}

export async function buildDbcClaimCreatorTx(opts: {
  mint: string;
  owner: string;
}): Promise<{ ok: true; transaction: string } | { ok: false; error: string }> {
  const batch = await buildDbcClaimCreatorBatch({ mints: [opts.mint], owner: opts.owner });
  if (!batch.ok) return batch;
  return { ok: true, transaction: batch.transaction };
}

export async function buildDbcClaimCreatorBatch(opts: {
  mints: string[];
  owner: string;
}): Promise<DbcClaimBatch | { ok: false; error: string }> {
  const dbc = client();
  const creator = new PublicKey(opts.owner);
  const max = new BN("1000000000000000");
  const target = (opts.mints || []).map((m) => String(m || "").trim()).find(Boolean) || "";
  if (!target) return { ok: false, error: "empty" };
  clearDbcCreatorCache(opts.owner);
  let pools: { publicKey: PublicKey; account: any }[] = [];
  try {
    pools = await dbc.state.getPoolsByCreator(opts.owner);
  } catch {
    pools = [];
  }
  const unpaid: { mint: string; unclaimedSol: number; pool: PublicKey }[] = [];
  const seen = new Set<string>();
  for (const row of pools) {
    const mint = mintOfPool(row);
    if (!mint || seen.has(mint)) continue;
    const unclaimedSol = feesFromPoolAccount(poolInner(row)).creatorUnclaimedSol;
    if (unclaimedSol <= CLAIM_DUST_SOL) continue;
    seen.add(mint);
    unpaid.push({ mint, unclaimedSol, pool: row.publicKey });
  }
  let hit = unpaid.find((p) => p.mint === target);
  if (!hit) {
    try {
      const row = await dbc.state.getPoolByBaseMint(target);
      if (row) {
        const unclaimedSol = feesFromPoolAccount(poolInner(row)).creatorUnclaimedSol;
        if (unclaimedSol > CLAIM_DUST_SOL) hit = { mint: target, unclaimedSol, pool: row.publicKey };
      }
    } catch {
      /* missing */
    }
  }
  if (!hit) return { ok: false, error: "empty" };
  let raw: Transaction;
  try {
    raw = (await dbc.creator.claimCreatorTradingFee({
      creator,
      payer: creator,
      pool: hit.pool,
      maxBaseAmount: max,
      maxQuoteAmount: max,
    })) as Transaction;
  } catch {
    return { ok: false, error: "empty" };
  }
  const ready = await readyTx(raw, creator);
  if (!(await simulateClaim(ready))) {
    return { ok: false, error: "Claim would fail simulation. Phantom would block it." };
  }
  const rest = unpaid.filter((p) => p.mint !== hit.mint);
  return {
    ok: true,
    transaction: encodeTx(ready),
    claimSol: hit.unclaimedSol,
    mints: [hit.mint],
    remaining: rest.length,
    remainingSol: rest.reduce((s, p) => s + p.unclaimedSol, 0),
    remainingMints: rest.map((p) => p.mint),
  };
}

export async function buildDbcClaimPartnerTx(opts: {
  mint: string;
  owner: string;
  receiver?: string;
}): Promise<{ ok: true; transaction: string } | { ok: false; error: string }> {
  const dbc = client();
  const row = await dbc.state.getPoolByBaseMint(opts.mint);
  if (!row) return { ok: false, error: "curve_missing" };
  const claimer = new PublicKey(opts.owner);
  const max = new BN("1000000000000000");
  try {
    const raw = await dbc.partner.claimPartnerTradingFee({
      feeClaimer: claimer,
      payer: claimer,
      pool: row.publicKey,
      maxBaseAmount: max,
      maxQuoteAmount: max,
      receiver: opts.receiver ? new PublicKey(opts.receiver) : undefined,
    });
    const tx = await readyTx(raw as Transaction, claimer);
    return { ok: true, transaction: encodeTx(tx) };
  } catch {
    return { ok: false, error: "empty" };
  }
}

function asPool(row: { publicKey: PublicKey; account: any }) {
  const a = row.account;
  if (a?.poolState) return a;
  return { poolState: a };
}

export async function quoteDbcTrade(opts: {
  mint: string;
  side: "buy" | "sell";
  sol?: number;
  tokens?: number;
}): Promise<{ ok: true; tokensOut?: number; solOut?: number; feeSol: number } | { ok: false; error: string }> {
  const { SwapMode } = sdk();
  const dbc = client();
  const row = await dbc.state.getPoolByBaseMint(opts.mint);
  if (!row) return { ok: false, error: "curve_missing" };
  const vp = asPool(row);
  const inner = vp.poolState || vp;
  const cfg = await dbc.state.getPoolConfig(inner.config);
  if (!cfg) return { ok: false, error: "curve_missing" };
  const currentPoint = new BN(Math.floor(Date.now() / 1000));
  const buy = opts.side === "buy";
  const amountIn = buy
    ? new BN(Math.round((Number(opts.sol) || 0) * 1e9))
    : new BN(Math.round((Number(opts.tokens) || 0) * 1e6));
  if (amountIn.toString() === "0") return { ok: false, error: "too_small" };
  const q = dbc.pool.swapQuote2({
    virtualPool: vp,
    config: cfg,
    swapBaseForQuote: !buy,
    swapMode: SwapMode.ExactIn,
    amountIn,
    slippageBps: 100,
    hasReferral: false,
    eligibleForFirstSwapWithMinFee: false,
    currentPoint,
  });
  const out = Number(q.outputAmount.toString());
  if (buy) return { ok: true, tokensOut: out / 1e6, feeSol: (Number(opts.sol) || 0) * 0.01 };
  return { ok: true, solOut: out / 1e9, feeSol: (out / 1e9) * 0.01 };
}

export async function buildDbcTradeTx(opts: {
  mint: string;
  owner: string;
  side: "buy" | "sell";
  sol?: number;
  tokens?: number;
}): Promise<{ ok: true; transaction: string; tokensOut?: number; solOut?: number; feeSol: number } | { ok: false; error: string }> {
  const { SwapMode } = sdk();
  const dbc = client();
  const row = await dbc.state.getPoolByBaseMint(opts.mint);
  if (!row) return { ok: false, error: "curve_missing" };
  const quoted = await quoteDbcTrade(opts);
  if (!quoted.ok) return quoted;
  const owner = new PublicKey(opts.owner);
  const buy = opts.side === "buy";
  const amountIn = buy
    ? new BN(Math.round((Number(opts.sol) || 0) * 1e9))
    : new BN(Math.round((Number(opts.tokens) || 0) * 1e6));
  const minOut = buy
    ? new BN(Math.floor((quoted.tokensOut || 0) * 1e6 * 0.99))
    : new BN(Math.floor((quoted.solOut || 0) * 1e9 * 0.99));
  const raw = await dbc.pool.swap2({
    owner,
    pool: row.publicKey,
    swapBaseForQuote: !buy,
    swapMode: SwapMode.ExactIn,
    amountIn,
    minimumAmountOut: minOut.toString() === "0" ? new BN(1) : minOut,
    referralTokenAccount: null,
  });
  const tx = await readyTx(raw, owner);
  return {
    ok: true,
    transaction: encodeTx(tx),
    tokensOut: quoted.tokensOut,
    solOut: quoted.solOut,
    feeSol: quoted.feeSol,
  };
}
