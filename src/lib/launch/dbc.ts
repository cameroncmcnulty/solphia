/**
 * Solphia launches on Meteora DBC so Jupiter (and Phantom Swap) can route
 * the bonding curve the same way they route Pump.fun pre-grad.
 */
import BN from "bn.js";
import { PublicKey, Transaction } from "@solana/web3.js";
import {
  ActivationType,
  BaseFeeMode,
  CollectFeeMode,
  DynamicBondingCurveClient,
  MigrationFeeOption,
  MigrationOption,
  SwapMode,
  TokenAuthorityOption,
  TokenDecimal,
  TokenType,
  buildCurveWithMarketCap,
} from "@meteora-ag/dynamic-bonding-curve-sdk";
import { connection } from "../solana/connection";
import { encodeTx } from "../token/mint";
import { DBC_CONFIG, dbcEnabled } from "./dbcIds";
import { MIN_TRADE_SOL } from "./curve";

export { dbcEnabled };

function client() {
  return DynamicBondingCurveClient.create(connection(), "confirmed");
}

export function solphiaCurveConfig() {
  return buildCurveWithMarketCap({
    token: {
      tokenType: TokenType.SPLToken,
      tokenBaseDecimal: TokenDecimal.SIX,
      tokenQuoteDecimal: TokenDecimal.NINE,
      tokenAuthorityOption: TokenAuthorityOption.Immutable,
      totalTokenSupply: 1_000_000_000,
      leftover: 0,
    },
    fee: {
      baseFeeParams: {
        baseFeeMode: BaseFeeMode.FeeSchedulerLinear,
        feeSchedulerParam: {
          startingFeeBps: 100,
          endingFeeBps: 100,
          numberOfPeriod: 0,
          totalDuration: 0,
        },
      },
      dynamicFeeEnabled: false,
      collectFeeMode: CollectFeeMode.QuoteToken,
      creatorTradingFeePercentage: 50,
      poolCreationFee: 0,
      enableFirstSwapWithMinFee: false,
    },
    migration: {
      migrationOption: MigrationOption.MET_DAMM_V2,
      migrationFeeOption: MigrationFeeOption.FixedBps100,
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
    activationType: ActivationType.Timestamp,
    initialMarketCap: 4_000,
    migrationMarketCap: 69_000,
  });
}

async function readyTx(tx: Transaction, payer: PublicKey): Promise<Transaction> {
  const { blockhash } = await connection().getLatestBlockhash("confirmed");
  tx.feePayer = payer;
  tx.recentBlockhash = blockhash;
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
}): Promise<{ transaction: string; mint: string; tokensOut: number; feeSol: number }> {
  if (!dbcEnabled()) throw new Error("DBC config missing.");
  const payer = new PublicKey(opts.payer);
  const mint = new PublicKey(opts.mint);
  const buySol = Math.max(0, Number(opts.buySol) || 0);
  const firstBuy =
    buySol >= MIN_TRADE_SOL
      ? {
          buyer: payer,
          buyAmount: new BN(Math.round(buySol * 1e9)),
          minimumAmountOut: new BN(1),
          referralTokenAccount: null,
        }
      : undefined;
  const raw = await client().creator.createPoolWithFirstBuy({
    createPoolParam: {
      name: opts.name.slice(0, 32),
      symbol: opts.symbol.slice(0, 10),
      uri: opts.uri.slice(0, 200),
      payer,
      poolCreator: payer,
      config: new PublicKey(DBC_CONFIG),
      baseMint: mint,
    },
    firstBuyParam: firstBuy,
  });
  const tx = await readyTx(raw, payer);
  return { transaction: encodeTx(tx), mint: mint.toBase58(), tokensOut: 0, feeSol: buySol * 0.01 };
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
  const row = await client().state.getPoolByBaseMint(opts.mint);
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
  const raw = await client().pool.swap2({
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
