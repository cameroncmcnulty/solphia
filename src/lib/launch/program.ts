import {
  ComputeBudgetProgram,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  VersionedTransaction,
} from "@solana/web3.js";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountIdempotentInstruction,
  createInitializeMint2Instruction,
  getAssociatedTokenAddressSync,
  getMinimumBalanceForRentExemptMint,
  MINT_SIZE,
} from "@solana/spl-token";
import { connection } from "../solana/connection";
import { encodeTx } from "../token/mint";
import { createMetadataV3Ix } from "../token/metadata";
import { DEFAULT_TREASURY } from "../config";
import { PAD_PROGRAM_ID as PAD_PROGRAM_ID_STR } from "./ids";
import type { CurveState } from "./curve";
import { MIN_TRADE_SOL } from "./curve";
import type { LaunchCoin } from "./engine";

export const PAD_PROGRAM_ID = new PublicKey(PAD_PROGRAM_ID_STR);
export const PAD_FEE_TREASURY = new PublicKey(DEFAULT_TREASURY);

export const PAD_DECIMALS = 6;
const TOKEN_SUPPLY_RAW = 1_000_000_000n * 1_000_000n;
const CURVE_SALE_RAW = 800_000_000n * 1_000_000n;
const VIRTUAL_SOL = 30n * 1_000_000_000n;
const VIRTUAL_TOKENS = 1_073_000_191n * 1_000_000n;
const GRADUATE_SOL = 85n * 1_000_000_000n;
const FEE_BPS = 100n;
const CREATE_CU = 400_000;
const TRADE_CU = 250_000;
const CU_PRICE = 100_000;

export function curvePda(mint: PublicKey | string): PublicKey {
  return PublicKey.findProgramAddressSync([Buffer.from("curve"), new PublicKey(mint).toBuffer()], PAD_PROGRAM_ID)[0];
}

export function globalPda(): PublicKey {
  return PublicKey.findProgramAddressSync([Buffer.from("global")], PAD_PROGRAM_ID)[0];
}

function lamports(sol: number): bigint {
  return BigInt(Math.round(Math.max(0, sol) * 1e9));
}

function fromLamports(n: bigint): number {
  return Number(n) / 1e9;
}

function fromRaw(n: bigint): number {
  return Number(n) / 1e6;
}

function u64(n: bigint): Buffer {
  const b = Buffer.alloc(8);
  b.writeBigUInt64LE(n);
  return b;
}

function feeOn(sol: bigint): bigint {
  return (sol * FEE_BPS) / 10_000n;
}

export function quoteBuyRaw(virtualSol: bigint, virtualTokens: bigint, solIn: bigint): { fee: bigint; net: bigint; tokensOut: bigint } {
  const fee = feeOn(solIn);
  const net = solIn - fee;
  const tokensOut = net > 0n ? (virtualTokens * net) / (virtualSol + net) : 0n;
  return { fee, net, tokensOut };
}

export function quoteSellRaw(virtualSol: bigint, virtualTokens: bigint, tokensIn: bigint): { gross: bigint; fee: bigint; solOut: bigint } {
  const gross = (virtualSol * tokensIn) / (virtualTokens + tokensIn);
  const fee = feeOn(gross);
  return { gross, fee, solOut: gross - fee };
}

export function curveFromAccount(data: Buffer): CurveState {
  const virtualSol = Number(data.readBigUInt64LE(104)) / 1e9;
  const virtualTokens = Number(data.readBigUInt64LE(112)) / 1e6;
  const realSol = Number(data.readBigUInt64LE(120)) / 1e9;
  const tokensSold = Number(data.readBigUInt64LE(128)) / 1e6;
  const complete = data[136] === 1;
  return {
    virtualSol,
    virtualTokens,
    realSol,
    tokensSold,
    phase: complete ? "graduated" : "curve",
  };
}

export function applyPadCurve(coin: LaunchCoin, curve: CurveState) {
  coin.curve = curve;
  if (curve.phase === "graduated" && coin.status !== "graduated") {
    coin.status = "graduated";
    coin.graduatedAt = coin.graduatedAt || Date.now();
  }
}

function packTx(payer: PublicKey, ixs: TransactionInstruction[], blockhash: string, cu: number): Transaction {
  const tx = new Transaction();
  tx.add(ComputeBudgetProgram.setComputeUnitLimit({ units: cu }));
  tx.add(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: CU_PRICE }));
  tx.add(...ixs);
  tx.feePayer = payer;
  tx.recentBlockhash = blockhash;
  return tx;
}

async function simulateOrThrow(tx: Transaction): Promise<void> {
  if (!tx.feePayer || !tx.recentBlockhash) throw new Error("Pad simulation failed.");
  const vtx = new VersionedTransaction(tx.compileMessage());
  const sim = await connection().simulateTransaction(vtx, {
    sigVerify: false,
    replaceRecentBlockhash: true,
    commitment: "confirmed",
  });
  if (sim.value.err) {
    const logs = (sim.value.logs || []).filter((l) => /Error|failed|custom program/i.test(l)).slice(-4);
    throw new Error(logs.join(" · ") || "Pad simulation failed.");
  }
}

function initializeIx(opts: {
  payer: PublicKey;
  mint: PublicKey;
  creator: PublicKey;
  referrer?: string;
}): TransactionInstruction {
  const curve = curvePda(opts.mint);
  const curveAta = getAssociatedTokenAddressSync(opts.mint, curve, true);
  const referrer = opts.referrer && opts.referrer !== opts.creator.toBase58() ? new PublicKey(opts.referrer) : PublicKey.default;
  const data = Buffer.concat([Buffer.from([1]), referrer.toBuffer()]);
  return new TransactionInstruction({
    programId: PAD_PROGRAM_ID,
    keys: [
      { pubkey: opts.payer, isSigner: true, isWritable: true },
      { pubkey: opts.mint, isSigner: true, isWritable: true },
      { pubkey: curve, isSigner: false, isWritable: true },
      { pubkey: curveAta, isSigner: false, isWritable: true },
      { pubkey: globalPda(), isSigner: false, isWritable: false },
      { pubkey: opts.creator, isSigner: false, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });
}

function tradeIx(opts: {
  side: "buy" | "sell";
  user: PublicKey;
  mint: PublicKey;
  creator: PublicKey;
  solLamports?: bigint;
  tokensRaw?: bigint;
  minOut: bigint;
  referrer?: string;
}): TransactionInstruction {
  const curve = curvePda(opts.mint);
  const curveAta = getAssociatedTokenAddressSync(opts.mint, curve, true);
  const userAta = getAssociatedTokenAddressSync(opts.mint, opts.user, false);
  const disc = opts.side === "buy" ? 2 : 3;
  const a = opts.side === "buy" ? opts.solLamports || 0n : opts.tokensRaw || 0n;
  const data = Buffer.concat([Buffer.from([disc]), u64(a), u64(opts.minOut)]);
  const keys = [
    { pubkey: opts.user, isSigner: true, isWritable: true },
    { pubkey: opts.mint, isSigner: false, isWritable: false },
    { pubkey: curve, isSigner: false, isWritable: true },
    { pubkey: curveAta, isSigner: false, isWritable: true },
    { pubkey: userAta, isSigner: false, isWritable: true },
    { pubkey: globalPda(), isSigner: false, isWritable: false },
    { pubkey: opts.creator, isSigner: false, isWritable: true },
    { pubkey: PAD_FEE_TREASURY, isSigner: false, isWritable: true },
    { pubkey: PAD_FEE_TREASURY, isSigner: false, isWritable: true },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
  ];
  if (opts.side === "buy") keys.push({ pubkey: SystemProgram.programId, isSigner: false, isWritable: false });
  if (opts.referrer) keys.push({ pubkey: new PublicKey(opts.referrer), isSigner: false, isWritable: true });
  return new TransactionInstruction({ programId: PAD_PROGRAM_ID, keys, data });
}

export async function padCurveReady(mint: string): Promise<{ ok: true; curve: CurveState } | { ok: false; error: string }> {
  try {
    const info = await connection().getAccountInfo(curvePda(mint), "confirmed");
    if (!info || info.data.length < 138) return { ok: false, error: "curve_missing" };
    if (Buffer.from(info.data.slice(0, 8)).toString() !== "splhcrv1") return { ok: false, error: "curve_missing" };
    return { ok: true, curve: curveFromAccount(info.data as Buffer) };
  } catch {
    return { ok: false, error: "curve_missing" };
  }
}

export async function waitForPadCurve(
  mint: string,
  sig?: string,
): Promise<{ ok: true; curve: CurveState } | { ok: false; error: string }> {
  const conn = connection();
  if (sig) {
    try {
      const latest = await conn.getLatestBlockhash("confirmed");
      const conf = await conn.confirmTransaction({ signature: sig, ...latest }, "confirmed");
      if (conf.value.err) return { ok: false, error: "chain_failed" };
    } catch {
      /* still poll the curve */
    }
    try {
      const tx = await conn.getTransaction(sig, { commitment: "confirmed", maxSupportedTransactionVersion: 0 });
      if (tx?.meta?.err) return { ok: false, error: "chain_failed" };
    } catch {
      /* RPC lag */
    }
  }
  let ready = await padCurveReady(mint);
  for (let i = 0; i < 24 && !ready.ok; i++) {
    await new Promise((r) => setTimeout(r, 750));
    ready = await padCurveReady(mint);
  }
  return ready;
}

export async function hydratePadCoins(coins: LaunchCoin[]): Promise<void> {
  const rows = coins.filter((c) => (c.venue === "solphia" || c.venue === "pump") && c.mint.length >= 32 && !c.mint.startsWith("curve:"));
  if (!rows.length) return;
  try {
    const infos = await connection().getMultipleAccountsInfo(rows.map((c) => curvePda(c.mint)), "confirmed");
    for (let i = 0; i < rows.length; i++) {
      const info = infos[i];
      if (!info || info.data.length < 138) continue;
      applyPadCurve(rows[i], curveFromAccount(info.data as Buffer));
    }
  } catch {
    /* tape still serves Redis snapshot */
  }
}

export async function buildPadLaunchTx(opts: {
  payer: string;
  mint: string;
  name: string;
  symbol: string;
  uri: string;
  buySol?: number;
  referrer?: string;
}): Promise<{ transaction: string; mint: string; tokensOut: number; feeSol: number }> {
  const conn = connection();
  const payer = new PublicKey(opts.payer);
  const mint = new PublicKey(opts.mint);
  const rent = await getMinimumBalanceForRentExemptMint(conn);
  const { blockhash } = await conn.getLatestBlockhash("confirmed");
  const ixs: TransactionInstruction[] = [
    SystemProgram.createAccount({
      fromPubkey: payer,
      newAccountPubkey: mint,
      space: MINT_SIZE,
      lamports: rent,
      programId: TOKEN_PROGRAM_ID,
    }),
    createInitializeMint2Instruction(mint, PAD_DECIMALS, payer, payer, TOKEN_PROGRAM_ID),
    createMetadataV3Ix({
      mint,
      mintAuthority: payer,
      payer,
      updateAuthority: payer,
      name: opts.name.slice(0, 32),
      symbol: opts.symbol.slice(0, 10),
      uri: opts.uri.slice(0, 200),
    }),
    initializeIx({ payer, mint, creator: payer, referrer: opts.referrer }),
  ];
  const buySol = Math.max(0, Number(opts.buySol) || 0);
  let tokensOut = 0;
  let feeSol = 0;
  if (buySol >= MIN_TRADE_SOL) {
    const q = quoteBuyRaw(VIRTUAL_SOL, VIRTUAL_TOKENS, lamports(buySol));
    tokensOut = fromRaw(q.tokensOut);
    feeSol = fromLamports(q.fee);
    const userAta = getAssociatedTokenAddressSync(mint, payer, false);
    ixs.push(createAssociatedTokenAccountIdempotentInstruction(payer, userAta, payer, mint, TOKEN_PROGRAM_ID));
    ixs.push(
      tradeIx({
        side: "buy",
        user: payer,
        mint,
        creator: payer,
        solLamports: lamports(buySol),
        minOut: (q.tokensOut * 99n) / 100n,
        referrer: opts.referrer,
      }),
    );
  }
  const tx = packTx(payer, ixs, blockhash, CREATE_CU);
  await simulateOrThrow(tx);
  return { transaction: encodeTx(tx), mint: mint.toBase58(), tokensOut, feeSol };
}

export async function quotePadTrade(opts: {
  mint: string;
  owner: string;
  side: "buy" | "sell";
  sol?: number;
  tokens?: number;
}): Promise<
  | { ok: true; tokensOut?: number; solOut?: number; feeSol: number; complete: boolean }
  | { ok: false; error: string }
> {
  const ready = await padCurveReady(opts.mint);
  if (!ready.ok) return ready;
  if (ready.curve.phase === "graduated") return { ok: false, error: "graduated" };
  const vs = BigInt(Math.round(ready.curve.virtualSol * 1e9));
  const vt = BigInt(Math.round(ready.curve.virtualTokens * 1e6));
  if (opts.side === "buy") {
    const sol = Number(opts.sol) || 0;
    if (sol < MIN_TRADE_SOL) return { ok: false, error: "too_small" };
    const q = quoteBuyRaw(vs, vt, lamports(sol));
    if (q.tokensOut <= 0n) return { ok: false, error: "zero_out" };
    return { ok: true, tokensOut: fromRaw(q.tokensOut), feeSol: fromLamports(q.fee), complete: false };
  }
  const tokens = Number(opts.tokens) || 0;
  if (!(tokens > 0)) return { ok: false, error: "not_enough" };
  const q = quoteSellRaw(vs, vt, BigInt(Math.round(tokens * 1e6)));
  if (q.solOut <= 0n) return { ok: false, error: "zero_out" };
  return { ok: true, solOut: fromLamports(q.solOut), feeSol: fromLamports(q.fee), complete: false };
}

export async function buildPadTradeTx(opts: {
  mint: string;
  owner: string;
  creator: string;
  side: "buy" | "sell";
  sol?: number;
  tokens?: number;
  referrer?: string;
}): Promise<
  | { ok: true; transaction: string; tokensOut?: number; solOut?: number; sol?: number; tokens?: number; feeSol: number }
  | { ok: false; error: string }
> {
  const quoted = await quotePadTrade(opts);
  if (!quoted.ok) return quoted;
  try {
    const user = new PublicKey(opts.owner);
    const mint = new PublicKey(opts.mint);
    const creator = new PublicKey(opts.creator);
    const { blockhash } = await connection().getLatestBlockhash("confirmed");
    const ixs: TransactionInstruction[] = [];
    if (opts.side === "buy") {
      const sol = Number(opts.sol) || 0;
      const userAta = getAssociatedTokenAddressSync(mint, user, false);
      ixs.push(createAssociatedTokenAccountIdempotentInstruction(user, userAta, user, mint, TOKEN_PROGRAM_ID));
      const minOut = BigInt(Math.floor((quoted.tokensOut || 0) * 1e6 * 0.99));
      ixs.push(
        tradeIx({
          side: "buy",
          user,
          mint,
          creator,
          solLamports: lamports(sol),
          minOut,
          referrer: opts.referrer,
        }),
      );
      const tx = packTx(user, ixs, blockhash, TRADE_CU);
      await simulateOrThrow(tx);
      return { ok: true, transaction: encodeTx(tx), tokensOut: quoted.tokensOut, sol, feeSol: quoted.feeSol };
    }
    const tokens = Number(opts.tokens) || 0;
    const minOut = BigInt(Math.floor((quoted.solOut || 0) * 1e9 * 0.99));
    ixs.push(
      tradeIx({
        side: "sell",
        user,
        mint,
        creator,
        tokensRaw: BigInt(Math.round(tokens * 1e6)),
        minOut,
        referrer: opts.referrer,
      }),
    );
    const tx = packTx(user, ixs, blockhash, TRADE_CU);
    await simulateOrThrow(tx);
    return { ok: true, transaction: encodeTx(tx), solOut: quoted.solOut, tokens, feeSol: quoted.feeSol };
  } catch {
    return { ok: false, error: "chain_failed" };
  }
}
