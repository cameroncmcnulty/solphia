/**
 * Option B: launch on Meteora Dynamic Bonding Curve.
 * Jupiter Instant Routing indexes this program, so Phantom Swap can buy pre-grad.
 * Static import + serverExternalPackages so Vercel traces the real node_modules tree
 * (webpack Function-import hid those requires and Phantom never saw a pair).
 */
import * as DbcMod from "@meteora-ag/dynamic-bonding-curve-sdk";
import BN from "bn.js";

import { connection, swapBusyReason, withRpcRetry } from "../solana/connection";
import { ComputeBudgetProgram, Keypair, PublicKey, Transaction, VersionedTransaction } from "@solana/web3.js";
import { TOKEN_2022_PROGRAM_ID, getTransferHook, unpackMint } from "@solana/spl-token";
import { encodeTx } from "../token/mint";
import { bytesToB64 } from "../solana/wire";
import { treasuryAddress } from "../treasury";
import { liveDbcConfig, dbcEnabled } from "./dbcIds";
import { emptyCurve, MIN_TRADE_SOL, quoteBuy } from "./curve";
import { CLAIM_DUST_SOL, feesFromPoolAccount } from "./claim";
import { sphaCurveTokens } from "../token/omics";
import { SPHA_TRANSFER_HOOK } from "../token/sphaHook";

const WSOL = "So11111111111111111111111111111111111111112";
/** Unsigned mint/config signers make RPC sim a false fail. Size is the real gate. */
const LEGACY_MAX = 1232;

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
      /** 50% creator on-chain; partner 50% is the displayed treasury project wallet (feeClaimer). */
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

/**
 * Dedicated $SPHA curve. Same 1% / 50% creator / DAMM 100 bps as the pad.
 * Curve supply is 77.1% (154.2M). Team 22.9% is minted to project wallets at T0
 * (DBC leftover is post-graduation only). Token-2022 + transfer hook is the only
 * DBC path that leaves mint authority with the creator long enough to mint those slices.
 * Never write this config onto the shared pad dbcConfig.
 */
export async function sphaCurveConfig() {
  const m = sdk();
  return m.buildCurveWithMarketCap({
    token: {
      tokenType: m.TokenType.Token2022,
      tokenBaseDecimal: m.TokenDecimal.SIX,
      tokenQuoteDecimal: m.TokenDecimal.NINE,
      tokenAuthorityOption: m.TokenAuthorityOption.CreatorUpdateAndMintAuthority,
      totalTokenSupply: sphaCurveTokens(),
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
    initialMarketCap: 40,
    migrationMarketCap: 585,
  });
}

/**
 * Same 1% / 50% creator / DAMM 100 bps as official $SPHA.
 * Curve supply is the float on the pad; the project slice is minted after.
 * Never write this config onto the shared pad curve.
 */
export async function hookedCurveConfig(curveTokens: number) {
  const m = sdk();
  const supply = Math.max(1_000_000, Math.floor(Number(curveTokens) || 0));
  return m.buildCurveWithMarketCap({
    token: {
      tokenType: m.TokenType.Token2022,
      tokenBaseDecimal: m.TokenDecimal.SIX,
      tokenQuoteDecimal: m.TokenDecimal.NINE,
      tokenAuthorityOption: m.TokenAuthorityOption.CreatorUpdateAndMintAuthority,
      totalTokenSupply: supply,
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
  const hasCu = tx.instructions.some((ix) => ix.programId.equals(ComputeBudgetProgram.programId));
  const out = hasCu ? tx : new Transaction().add(
    ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }),
    ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 50_000 }),
    ...tx.instructions,
  );
  out.feePayer = payer;
  out.recentBlockhash = latest.blockhash;
  if ("lastValidBlockHeight" in out) out.lastValidBlockHeight = latest.lastValidBlockHeight;
  return out;
}

/** sigVerify false is required: mint/config keys are still unsigned at prepare. */
async function simulatePadTx(tx: Transaction): Promise<void> {
  try {
    const vtx = new VersionedTransaction(tx.compileMessage());
    const sim = await connection().simulateTransaction(vtx, {
      sigVerify: false,
      replaceRecentBlockhash: true,
      commitment: "confirmed",
    });
    if (!sim.value.err) return;
    const logs = (sim.value.logs || []).join("\n");
    if (/insufficient lamports|Transfer: insufficient/i.test(logs)) {
      throw new Error("Not enough SOL in this wallet to create the token. Add SOL and tap Launch again.");
    }
    if (/AccountDiscriminatorMismatch/i.test(logs)) {
      throw new Error("The Solphia curve config cannot launch this token. Refresh and tap Launch again.");
    }
    const hint = (sim.value.logs || [])
      .filter((l) => /Error|failed|custom program/i.test(l))
      .slice(-2)
      .join(" ");
    throw new Error(hint || "Launch would fail on Solana. Wait a moment and tap Launch again.");
  } catch (e) {
    if (e instanceof Error && /Not enough SOL|cannot launch this token|would fail on Solana|AccountDiscriminator/i.test(e.message)) {
      throw e;
    }
  }
}

function asTransaction(raw: unknown): Transaction {
  if (raw instanceof Transaction) return raw;
  if (raw && typeof raw === "object" && Array.isArray((raw as Transaction).instructions)) {
    return raw as Transaction;
  }
  if (raw && typeof raw === "object") {
    const o = raw as {
      createConfigTx?: Transaction;
      createPoolWithFirstBuyTx?: Transaction;
      createPoolTx?: Transaction;
    };
    const tx = new Transaction();
    for (const part of [o.createConfigTx, o.createPoolWithFirstBuyTx, o.createPoolTx]) {
      if (part?.instructions) for (const ix of part.instructions) tx.add(ix);
    }
    if (tx.instructions.length) return tx;
  }
  throw new Error("Launch builder did not encode a transaction.");
}

function firstBuyParam(payer: PublicKey, buySol: number) {
  return {
    buyer: payer,
    receiver: payer,
    buyAmount: new BN(Math.round(buySol * 1e9)),
    minimumAmountOut: new BN(1),
    referralTokenAccount: null,
  };
}

function estimateLaunchTokens(buySol: number): number {
  if (!(buySol >= MIN_TRADE_SOL)) return 0;
  const q = quoteBuy(emptyCurve(), buySol);
  return q.ok ? Number(q.tokensOut) || 0 : 0;
}

export async function dbcPoolByMint(mint: string) {
  if (!dbcEnabled()) return null;
  try {
    return await client().state.getPoolByBaseMint(mint);
  } catch {
    return null;
  }
}

export async function mintUsesTransferHook(mint: string): Promise<boolean> {
  try {
    const pk = new PublicKey(mint);
    const info = await connection().getAccountInfo(pk, "confirmed");
    if (!info || !info.owner.equals(TOKEN_2022_PROGRAM_ID)) return false;
    const hook = getTransferHook(unpackMint(pk, info, TOKEN_2022_PROGRAM_ID));
    return Boolean(hook && !hook.programId.equals(PublicKey.default));
  } catch {
    return false;
  }
}

type DbcPoolRow = { publicKey: PublicKey; account: any };

async function resolveDbcPool(mint: string): Promise<
  | { ok: true; dbc: ReturnType<typeof client>; row: DbcPoolRow }
  | { ok: false; error: string }
> {
  const dbc = client();
  const load = () => withRpcRetry(() => dbc.state.getPoolByBaseMint(mint) as Promise<DbcPoolRow | null | undefined>);
  try {
    let row = await load();
    if (row?.publicKey) return { ok: true as const, dbc, row };
    if (await mintUsesTransferHook(mint)) {
      for (let i = 0; i < 4; i++) {
        await new Promise((r) => setTimeout(r, 400 * (i + 1)));
        row = await load();
        if (row?.publicKey) return { ok: true as const, dbc, row };
      }
      return { ok: false as const, error: "curve_opening" };
    }
    return { ok: false as const, error: "curve_missing" };
  } catch (e) {
    return { ok: false as const, error: swapBusyReason(e) || (e instanceof Error ? e.message : "curve_missing") };
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
  firstBuyIncluded: boolean;
}> {
  if (!dbcEnabled()) throw new Error("DBC config missing.");
  const payer = new PublicKey(opts.payer);
  const mint = new PublicKey(opts.mint);
  const buySol = Math.max(0, Number(opts.buySol) || 0);
  const wantBuy = buySol >= MIN_TRADE_SOL;
  const name = opts.name.slice(0, 32);
  const symbol = opts.symbol.slice(0, 10);
  const uri = opts.uri.slice(0, 255);
  const tokensOut = estimateLaunchTokens(buySol);
  const feeSol = wantBuy ? buySol * 0.01 : 0;
  const firstBuy = wantBuy ? firstBuyParam(payer, buySol) : undefined;

  async function pack(raw: unknown, firstBuyIncluded: boolean, extra?: { config?: string; configSecret?: string }) {
    const tx = await readyTx(asTransaction(raw), payer);
    const encoded = encodeTx(tx);
    if (Buffer.from(encoded, "base64").length > LEGACY_MAX) return null;
    await simulatePadTx(tx);
    return {
      transaction: encoded,
      mint: mint.toBase58(),
      tokensOut: firstBuyIncluded ? tokensOut : 0,
      feeSol: firstBuyIncluded ? feeSol : 0,
      firstBuyIncluded,
      ...extra,
    };
  }

  const padConfig = liveDbcConfig(opts.config);
  const existing = await dbcConfigOnchain(padConfig);
  if (!existing) {
    throw new Error("Solphia curve is not on Solana right now. Wait a few seconds and tap Launch again.");
  }

  const createPoolParam = {
    name,
    symbol,
    uri,
    payer,
    poolCreator: payer,
    config: new PublicKey(existing),
    baseMint: mint,
  };
  if (firstBuy) {
    try {
      const raw = await client().creator.createPoolWithFirstBuy({ createPoolParam, firstBuyParam: firstBuy });
      const hit = await pack(raw, true, { config: existing });
      if (hit) return hit;
    } catch (e) {
      if (e instanceof Error && /Not enough SOL|cannot launch this token|would fail on Solana/i.test(e.message)) {
        throw e;
      }
      /* first buy ix did not fit — pool still launches, client follows with a buy */
    }
  }
  const raw = await client().creator.createPool(createPoolParam);
  const launched = await pack(raw, false, { config: existing });
  if (!launched) throw new Error("Could not build the launch.");
  return launched;
}

/** Official $SPHA: always a fresh 154.2M-curve config. Does not touch the shared pad config. */
export async function buildSphaDbcLaunchTx(opts: {
  payer: string;
  mint: string;
  name: string;
  symbol: string;
  uri: string;
}): Promise<{
  transaction: string;
  mint: string;
  tokensOut: number;
  feeSol: number;
  config: string;
  configSecret: string;
  firstBuyIncluded: boolean;
}> {
  if (!dbcEnabled()) throw new Error("DBC config missing.");
  const payer = new PublicKey(opts.payer);
  const mint = new PublicKey(opts.mint);
  const configKp = Keypair.generate();
  const treasury = new PublicKey(treasuryAddress());
  const curve = await sphaCurveConfig();
  const raw = await client().partner.createConfigAndPoolWithTransferHook({
    ...curve,
    config: configKp.publicKey,
    feeClaimer: treasury,
    leftoverReceiver: treasury,
    quoteMint: new PublicKey(WSOL),
    payer,
    transferHookProgram: new PublicKey(SPHA_TRANSFER_HOOK),
    preCreatePoolParam: {
      name: opts.name.slice(0, 32),
      symbol: opts.symbol.slice(0, 10),
      uri: opts.uri.slice(0, 255),
      poolCreator: payer,
      baseMint: mint,
    },
  });
  const tx = await readyTx(asTransaction(raw), payer);
  const encoded = encodeTx(tx);
  if (Buffer.from(encoded, "base64").length > LEGACY_MAX) throw new Error("Could not build the $SPHA launch.");
  return {
    transaction: encoded,
    mint: mint.toBase58(),
    tokensOut: 0,
    feeSol: 0,
    config: configKp.publicKey.toBase58(),
    configSecret: bytesToB64(configKp.secretKey),
    firstBuyIncluded: false,
  };
}

/** R&D launches: unique Token-2022 hooked config, variable curve supply. Never writes the shared pad curve. */
export async function buildHookedDbcLaunchTx(opts: {
  payer: string;
  mint: string;
  name: string;
  symbol: string;
  uri: string;
  curveTokens: number;
}): Promise<{
  transaction: string;
  mint: string;
  tokensOut: number;
  feeSol: number;
  config: string;
  configSecret: string;
  firstBuyIncluded: boolean;
}> {
  if (!dbcEnabled()) throw new Error("DBC config missing.");
  const payer = new PublicKey(opts.payer);
  const mint = new PublicKey(opts.mint);
  const configKp = Keypair.generate();
  const treasury = new PublicKey(treasuryAddress());
  const curve = await hookedCurveConfig(opts.curveTokens);
  const raw = await client().partner.createConfigAndPoolWithTransferHook({
    ...curve,
    config: configKp.publicKey,
    feeClaimer: treasury,
    leftoverReceiver: treasury,
    quoteMint: new PublicKey(WSOL),
    payer,
    transferHookProgram: new PublicKey(SPHA_TRANSFER_HOOK),
    preCreatePoolParam: {
      name: opts.name.slice(0, 32),
      symbol: opts.symbol.slice(0, 10),
      uri: opts.uri.slice(0, 255),
      poolCreator: payer,
      baseMint: mint,
    },
  });
  const tx = await readyTx(asTransaction(raw), payer);
  const encoded = encodeTx(tx);
  if (Buffer.from(encoded, "base64").length > LEGACY_MAX) throw new Error("Could not build the launch.");
  return {
    transaction: encoded,
    mint: mint.toBase58(),
    tokensOut: 0,
    feeSol: 0,
    config: configKp.publicKey.toBase58(),
    configSecret: bytesToB64(configKp.secretKey),
    firstBuyIncluded: false,
  };
}

/** Meteora VirtualPoolMetadata so the pair page has name / site / logo from block one. */
export async function buildDbcPoolMetadataTx(opts: {
  payer: string;
  mint: string;
  name: string;
  website?: string;
  logo?: string;
}): Promise<{ transaction: string; pool: string }> {
  const payer = new PublicKey(opts.payer);
  const row = await waitForDbcPool(opts.mint, 16);
  if (!row) throw new Error("DBC pool not on-chain yet.");
  const virtualPool = (row as { publicKey: PublicKey }).publicKey;
  if (!virtualPool) throw new Error("DBC pool not on-chain yet.");
  const logoRaw = (opts.logo || "").trim();
  const raw = await client().creator.createPoolMetadata({
    virtualPool,
    name: opts.name.slice(0, 32),
    website: (opts.website || "https://solphia.io").slice(0, 64),
    logo: logoRaw && logoRaw.length <= 128 ? logoRaw : "https://solphia.io/spha-mark.png",
    creator: payer,
    payer,
  });
  const tx = await readyTx(asTransaction(raw), payer);
  return { transaction: encodeTx(tx), pool: virtualPool.toBase58() };
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

export async function dbcPoolQuoteSol(mint: string): Promise<number> {
  if (!dbcEnabled() || !mint) return 0;
  try {
    const row = await dbcPoolByMint(mint);
    if (!row) return 0;
    return quoteSolOf(poolInner(row));
  } catch {
    return 0;
  }
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

export function mergePartnerFeeMaps(
  base: { unclaimedSol: number; totalSol: number; byMint: Record<string, DbcFees> },
  extra: Record<string, DbcFees>,
): { unclaimedSol: number; totalSol: number; byMint: Record<string, DbcFees> } {
  const byMint = { ...base.byMint };
  let unclaimedSol = Number(base.unclaimedSol) || 0;
  let totalSol = Number(base.totalSol) || 0;
  for (const [mint, fees] of Object.entries(extra || {})) {
    if (!mint || byMint[mint]) continue;
    byMint[mint] = fees;
    unclaimedSol += Number(fees.partnerUnclaimedSol) || 0;
    totalSol += Number(fees.partnerFeesSol) || 0;
  }
  return { unclaimedSol, totalSol, byMint };
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

export function clearDbcFeeCache() {
  for (const k of [...memo.keys()]) {
    if (k.startsWith("fees:") || k.startsWith("partner:") || k.startsWith("pools:")) memo.delete(k);
  }
}

export function clearDbcCreatorCache(creator?: string) {
  if (creator) memo.delete("pools:" + creator);
  clearDbcFeeCache();
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
  return cached("partner:" + config, 15_000, async () => {
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
  });
}

/** Pad config pools plus dedicated 200M mints that live on their own DBC config. */
export async function partnerTotalsWithMints(
  config: string,
  extraMints: string[] = [],
): Promise<{ unclaimedSol: number; totalSol: number; byMint: Record<string, DbcFees> }> {
  const empty = { unclaimedSol: 0, totalSol: 0, byMint: {} as Record<string, DbcFees> };
  const pad = config ? await chainPartnerTotals(config) : empty;
  const missing = extraMints.filter((m) => m && !pad.byMint[m]).slice(0, 16);
  if (!missing.length) return pad;
  const extra = await dbcFeesForMints(missing);
  return mergePartnerFeeMaps(pad, extra);
}

export type DbcClaimBatch = {
  ok: true;
  transaction: string;
  claimSol: number;
  mints: string[];
  creator?: string;
  partnerOnly: boolean;
  remaining: number;
  remainingSol: number;
  remainingMints: string[];
};

/** One SDK claim per tx. Sim logs go back to the desk when it would fail. */
async function simulateClaim(tx: Transaction): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const vtx = new VersionedTransaction(tx.compileMessage());
    const sim = await connection().simulateTransaction(vtx, {
      sigVerify: false,
      replaceRecentBlockhash: true,
      commitment: "confirmed",
    });
    if (!sim.value.err) return { ok: true };
    const logs = (sim.value.logs || []).filter(Boolean).slice(-4).join(" ");
    return { ok: false, error: logs || "Claim would fail simulation." };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Claim would fail simulation." };
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
  const max = new BN("1000000000000000");
  const target = (opts.mints || []).map((m) => String(m || "").trim()).find(Boolean) || "";
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
  for (const mint of (opts.mints || []).map((m) => String(m || "").trim()).filter(Boolean)) {
    if (seen.has(mint)) continue;
    try {
      const row = await dbc.state.getPoolByBaseMint(mint);
      if (!row) continue;
      const unclaimedSol = feesFromPoolAccount(poolInner(row)).creatorUnclaimedSol;
      if (unclaimedSol <= CLAIM_DUST_SOL) continue;
      seen.add(mint);
      unpaid.push({ mint, unclaimedSol, pool: row.publicKey });
    } catch {
      /* skip */
    }
  }
  unpaid.sort((a, b) => b.unclaimedSol - a.unclaimedSol);
  let hit = unpaid.find((p) => p.mint === target);
  if (!hit && target) {
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
  if (!hit) hit = unpaid[0];
  if (!hit) return { ok: false, error: "empty" };
  let poolCreator = opts.owner;
  try {
    const row = await dbc.state.getPoolByBaseMint(hit.mint);
    if (row) poolCreator = pkStr(poolInner(row).creator) || opts.owner;
  } catch {
    /* keep owner */
  }
  if (poolCreator && poolCreator !== opts.owner) {
    return {
      ok: false,
      error: `On-chain creator is ${poolCreator}. Owner cannot claim until that wallet transfers creator to the owner project wallet.`,
    };
  }
  const creatorPk = new PublicKey(poolCreator || opts.owner);
  let raw: Transaction;
  try {
    const hook = await mintUsesTransferHook(hit.mint);
    raw = (hook
      ? await dbc.creator.claimCreatorTradingFee2({
          creator: creatorPk,
          payer: creatorPk,
          pool: hit.pool,
          maxBaseAmount: max,
          maxQuoteAmount: max,
          receiver: creatorPk,
        })
      : await dbc.creator.claimCreatorTradingFee({
          creator: creatorPk,
          payer: creatorPk,
          pool: hit.pool,
          maxBaseAmount: max,
          maxQuoteAmount: max,
        })) as Transaction;
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "empty" };
  }
  const ready = await readyTx(raw, creatorPk);
  const sim = await simulateClaim(ready);
  if (!sim.ok) {
    return { ok: false, error: sim.error || "Claim would fail simulation." };
  }
  const rest = unpaid.filter((p) => p.mint !== hit.mint);
  return {
    ok: true,
    transaction: encodeTx(ready),
    claimSol: hit.unclaimedSol,
    mints: [hit.mint],
    partnerOnly: false,
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
  const batch = await buildDbcClaimPartnerBatch({ mints: [opts.mint], owner: opts.owner, receiver: opts.receiver });
  if (!batch.ok) return batch;
  return { ok: true, transaction: batch.transaction };
}

export async function buildDbcClaimPartnerBatch(opts: {
  mints: string[];
  owner: string;
  receiver?: string;
  payer?: string;
}): Promise<DbcClaimBatch | { ok: false; error: string }> {
  const dbc = client();
  const claimer = new PublicKey(opts.owner);
  const payer = new PublicKey(opts.payer || opts.owner);
  const max = new BN("1000000000000000");
  const wanted = (opts.mints || []).map((m) => String(m || "").trim()).filter(Boolean);
  const unpaid: { mint: string; unclaimedSol: number; pool: PublicKey }[] = [];
  const seen = new Set<string>();
  const push = (mint: string, unclaimedSol: number, pool: PublicKey) => {
    if (!mint || seen.has(mint) || unclaimedSol <= CLAIM_DUST_SOL) return;
    seen.add(mint);
    unpaid.push({ mint, unclaimedSol, pool });
  };
  for (const mint of wanted) {
    try {
      const row = await dbc.state.getPoolByBaseMint(mint);
      if (!row) continue;
      push(mint, feesFromPoolAccount(poolInner(row)).partnerUnclaimedSol, row.publicKey);
    } catch {
      /* skip */
    }
  }
  const cfg = liveDbcConfig();
  if (cfg) {
    try {
      const pools = await dbc.state.getPoolsByConfig(cfg);
      for (const row of pools) {
        const mint = mintOfPool(row);
        if (wanted.length && !wanted.includes(mint)) continue;
        push(mint, feesFromPoolAccount(poolInner(row)).partnerUnclaimedSol, row.publicKey);
      }
    } catch {
      /* config scan optional */
    }
  }
  const target = wanted.find((m) => unpaid.some((p) => p.mint === m)) || unpaid[0]?.mint || "";
  const ordered = [
    ...unpaid.filter((p) => p.mint === target),
    ...unpaid.filter((p) => p.mint !== target),
  ];
  for (const hit of ordered) {
    let creator = "";
    let partnerOnly = true;
    try {
      const row = await dbc.state.getPoolByBaseMint(hit.mint);
      if (row) {
        const inner = poolInner(row);
        creator = pkStr(inner.creator);
        const cfgPk = pkStr(inner.config) || pkStr(inner.poolConfig);
        if (cfgPk) {
          const cfg = await dbc.state.getPoolConfig(cfgPk);
          const pct = Number(cfg?.creatorTradingFeePercentage ?? cfg?.creator_trading_fee_percentage ?? 50);
          partnerOnly = pct > 0;
        }
      }
    } catch {
      /* split falls back to partner-only */
    }
    try {
      const hook = await mintUsesTransferHook(hit.mint);
      const receiver = opts.receiver ? new PublicKey(opts.receiver) : claimer;
      const raw = hook
        ? await dbc.partner.claimPartnerTradingFee2({
            feeClaimer: claimer,
            payer,
            pool: hit.pool,
            maxBaseAmount: max,
            maxQuoteAmount: max,
            receiver,
          })
        : await dbc.partner.claimPartnerTradingFee({
            feeClaimer: claimer,
            payer,
            pool: hit.pool,
            maxBaseAmount: max,
            maxQuoteAmount: max,
            receiver,
          });
      const tx = await readyTx(raw as Transaction, payer);
      const sim = await simulateClaim(tx);
      if (!sim.ok) continue;
      const rest = unpaid.filter((p) => p.mint !== hit.mint);
      return {
        ok: true,
        transaction: encodeTx(tx),
        claimSol: hit.unclaimedSol,
        mints: [hit.mint],
        creator,
        partnerOnly,
        remaining: rest.length,
        remainingSol: rest.reduce((s, p) => s + p.unclaimedSol, 0),
        remainingMints: rest.map((p) => p.mint),
      };
    } catch {
      /* this claimer cannot harvest this pool */
    }
  }
  return { ok: false, error: "empty" };
}

function asPool(row: { publicKey: PublicKey; account: any }) {
  const a = row.account;
  if (a?.poolState) return a;
  return { poolState: a };
}

async function mintTokenDecimals(mint: string): Promise<number> {
  try {
    const supply = await connection().getTokenSupply(new PublicKey(mint), "confirmed");
    const d = Number(supply.value?.decimals);
    if (Number.isFinite(d) && d >= 0 && d <= 18) return d;
  } catch {
    /* 200M and pad mints are 6 */
  }
  return 6;
}

function uiToBn(amount: number, decimals: number): BN {
  if (!(amount > 0) || !Number.isFinite(amount)) return new BN(0);
  const scaled = amount * 10 ** decimals;
  if (!Number.isFinite(scaled) || scaled <= 0) return new BN(0);
  return new BN(Math.round(scaled).toString());
}

export type DbcTradeQuote =
  | { ok: true; tokensOut?: number; solOut?: number; feeSol: number; inAmount: number; clipped?: boolean }
  | { ok: false; error: string };

export async function quoteDbcTrade(opts: {
  mint: string;
  side: "buy" | "sell";
  sol?: number;
  tokens?: number;
}): Promise<DbcTradeQuote> {
  const { SwapMode } = sdk();
  const found = await resolveDbcPool(opts.mint);
  if (!found.ok) return found;
  const { dbc, row } = found;
  let cfg: Awaited<ReturnType<typeof dbc.state.getPoolConfig>>;
  try {
    const vp0 = asPool(row);
    const inner0 = vp0.poolState || vp0;
    cfg = await withRpcRetry(() => dbc.state.getPoolConfig(inner0.config));
    if (!cfg) return { ok: false, error: "curve_missing" };
  } catch (e) {
    return { ok: false, error: swapBusyReason(e) || (e instanceof Error ? e.message : "curve_missing") };
  }
  const vp = asPool(row);
  const currentPoint = new BN(Math.floor(Date.now() / 1000));
  const buy = opts.side === "buy";
  const tokenDec = await mintTokenDecimals(opts.mint);
  const wanted = buy ? Number(opts.sol) || 0 : Number(opts.tokens) || 0;
  if (!(wanted > 0)) return { ok: false, error: "too_small" };

  const run = (ui: number): DbcTradeQuote => {
    const amountIn = buy ? new BN(Math.round(ui * 1e9)) : uiToBn(ui, tokenDec);
    if (amountIn.toString() === "0") return { ok: false, error: "too_small" };
    try {
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
      if (!(out > 0)) return { ok: false, error: "zero_out" };
      if (buy) return { ok: true, tokensOut: out / 10 ** tokenDec, feeSol: ui * 0.01, inAmount: ui };
      return { ok: true, solOut: out / 1e9, feeSol: (out / 1e9) * 0.01, inAmount: ui };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e || "quote_failed");
      return { ok: false, error: msg || "quote_failed" };
    }
  };

  const direct = run(wanted);
  if (direct.ok) return direct;
  if (buy || !/insufficient liquidity/i.test(direct.error || "")) return direct;
  let lo = 0;
  let hi = wanted;
  let best: DbcTradeQuote | null = null;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    const q = run(mid);
    if (q.ok) {
      best = q;
      lo = mid;
    } else {
      hi = mid;
    }
  }
  if (best?.ok && (best.solOut || 0) > 0) return { ...best, clipped: true };
  return { ok: false, error: "The curve does not have enough SOL for that sell yet." };
}

export async function buildDbcTradeTx(opts: {
  mint: string;
  owner: string;
  side: "buy" | "sell";
  sol?: number;
  tokens?: number;
}): Promise<{ ok: true; transaction: string; tokensOut?: number; solOut?: number; feeSol: number } | { ok: false; error: string }> {
  const { SwapMode } = sdk();
  const found = await resolveDbcPool(opts.mint);
  if (!found.ok) return found;
  const { dbc, row } = found;
  const quoted = await quoteDbcTrade(opts);
  if (!quoted.ok) return quoted;
  const owner = new PublicKey(opts.owner);
  const buy = opts.side === "buy";
  const tokenDec = await mintTokenDecimals(opts.mint);
  const inUi = quoted.inAmount || (buy ? Number(opts.sol) || 0 : Number(opts.tokens) || 0);
  const amountIn = buy ? new BN(Math.round(inUi * 1e9)) : uiToBn(inUi, tokenDec);
  const minOut = buy
    ? new BN(Math.floor((quoted.tokensOut || 0) * 10 ** tokenDec * 0.99))
    : new BN(Math.floor((quoted.solOut || 0) * 1e9 * 0.99));
  const swapArg = {
    owner,
    pool: row.publicKey,
    swapBaseForQuote: !buy,
    swapMode: SwapMode.ExactIn,
    amountIn,
    minimumAmountOut: minOut.toString() === "0" ? new BN(1) : minOut,
    referralTokenAccount: null,
  };
  try {
    const raw = (await mintUsesTransferHook(opts.mint))
      ? await dbc.pool.swap2WithTransferHook(swapArg)
      : await dbc.pool.swap2(swapArg);
    const tx = await readyTx(raw, owner);
    return {
      ok: true,
      transaction: encodeTx(tx),
      tokensOut: quoted.tokensOut,
      solOut: quoted.solOut,
      feeSol: quoted.feeSol,
    };
  } catch (e) {
    return { ok: false, error: swapBusyReason(e) || (e instanceof Error ? e.message : "Could not build the swap.") };
  }
}
