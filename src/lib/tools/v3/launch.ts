import {
  ComputeBudgetProgram,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import {
  AuthorityType,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountIdempotentInstruction,
  createMintToCheckedInstruction,
  createSetAuthorityInstruction,
  getAssociatedTokenAddressSync,
  unpackMint,
} from "@solana/spl-token";
import { isSolanaAddress } from "../../security";
import { connection, waitForSignature } from "../../solana/connection";
import { parseTx, signPackedB64 } from "../../solana/extraSign";
import { broadcastB64 } from "../../solana/broadcast";
import { b64ToBytes, bytesToB64 } from "../../solana/wire";
import { TOKEN_2022_PROGRAM, TOKEN_PROGRAM, tokenUiAmount } from "../../solana/tokenBalance";
import { SOL_MINT } from "../../pair/mints";
import { sphaRawAmount } from "../../token/omics";
import { encodeTx } from "../../token/mint";
import { sphaHookExtraPda, sphaHookInitIx } from "../../token/sphaHook";
import { isTokenMetaUri, pinSphaTokenMeta } from "../../token/sphaMeta";
import { dbcEnabled } from "../../launch/dbcIds";
import { durableConfigured, kvDel, kvGetJson, kvSetEx, kvSetNxEx, KEYS } from "../../persist";
import { SPHA_COUNTDOWN_MIN_MS } from "../../token/countdown";
import { DUMP_SLIPPAGE_BPS } from "../identities";
import { emptySnipers } from "../snipers";
import {
  allWalletsOf,
  loadKeys,
  loadProject,
  metaUrl,
  saveKeys,
  saveProject,
  V3_FIRST_BUY_SOL,
  V3_KEEP_LAMPORTS,
  V3_MIN_LAUNCH_SOL,
  V3_MINT_LEAD_MS,
  walletOf,
  type V3Project,
} from "./project";

const LOCK_TTL_S = 320;
const INFLIGHT_TTL_S = 40 * 60;
const MIN_OWNER_SOL = V3_MIN_LAUNCH_SOL;

type InflightMint = { mint: string; secret: string; uri: string; image: string; at: number };

async function loadInflight(): Promise<InflightMint | null> {
  const raw = await kvGetJson(KEYS.batchLaunchV3MintInflight).catch(() => null);
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const mint = typeof o.mint === "string" ? o.mint.trim() : "";
  const secret = typeof o.secret === "string" ? o.secret.trim() : "";
  if (!isSolanaAddress(mint) || !secret) return null;
  return {
    mint,
    secret,
    uri: typeof o.uri === "string" ? o.uri : "",
    image: typeof o.image === "string" ? o.image : "",
    at: Number(o.at) || 0,
  };
}

async function saveInflight(row: InflightMint): Promise<void> {
  await kvSetEx(KEYS.batchLaunchV3MintInflight, row, INFLIGHT_TTL_S).catch(() => undefined);
}

async function clearInflight(): Promise<void> {
  await kvDel(KEYS.batchLaunchV3MintInflight).catch(() => undefined);
}

async function withMintLock<T>(fn: () => Promise<T>): Promise<T | { skipped: true; reason: string }> {
  const got = await kvSetNxEx(KEYS.batchLaunchV3Lock, { at: Date.now() }, LOCK_TTL_S);
  if (got === false) {
    if (durableConfigured()) return { skipped: true, reason: "lock" };
  }
  try {
    return await fn();
  } finally {
    await kvDel(KEYS.batchLaunchV3Lock).catch(() => undefined);
  }
}

async function signSend(packed: string, signers: Keypair[]): Promise<string> {
  const signed = signPackedB64(packed, signers);
  return broadcastB64(signed, { skipPreflight: false });
}

async function mintAccountExists(mint: string): Promise<boolean> {
  try {
    const info = await connection().getAccountInfo(new PublicKey(mint), "confirmed");
    return Boolean(info);
  } catch {
    return false;
  }
}

function mintAtOf(p: V3Project): number {
  if (!(p.launchAt > 0)) return 0;
  return Math.max(0, p.launchAt - (p.mintLeadMs || V3_MINT_LEAD_MS));
}

export function v3InMintWindow(p: V3Project, now = Date.now()): boolean {
  if (!(p.launchAt > 0) || p.status === "live" || p.status === "stopped") return false;
  return now >= mintAtOf(p);
}

export function v3TimedOut(p: V3Project, now = Date.now()): boolean {
  return p.launchAt > 0 && now >= p.launchAt;
}

export async function launchFuel(p?: V3Project): Promise<{
  wallet: string;
  sol: number;
  needSol: number;
  enough: boolean;
  hot: boolean;
}> {
  const project = p || (await loadProject());
  const wallet = project.launchWallet || "";
  const keys = await loadKeys();
  const hot = Boolean(wallet && keys[wallet]);
  let sol = 0;
  if (isSolanaAddress(wallet)) {
    try {
      sol = (await connection().getBalance(new PublicKey(wallet), "confirmed")) / LAMPORTS_PER_SOL;
    } catch {
      sol = 0;
    }
  }
  return { wallet, sol, needSol: MIN_OWNER_SOL, enough: hot && sol >= MIN_OWNER_SOL, hot };
}

export async function armCountdown(launchAt: number): Promise<{ ok: boolean; project: V3Project; error?: string }> {
  const p = await loadProject();
  if (!p.id || p.status === "idle") return { ok: false, project: p, error: "Build a site from an idea first." };
  if (p.status === "live") return { ok: false, project: p, error: "This launch is already live." };
  if (p.status === "minted" || p.status === "minting") return { ok: false, project: p, error: "Mint already in flight." };
  if (!(launchAt > Date.now() + SPHA_COUNTDOWN_MIN_MS - 1_000)) {
    return { ok: false, project: p, error: "Pick a time at least 30 minutes 30 seconds from now so the T-30 mint has a window." };
  }
  if (!isSolanaAddress(p.launchWallet)) return { ok: false, project: p, error: "Launch wallet missing." };
  p.launchAt = Math.floor(launchAt);
  p.mintLeadMs = V3_MINT_LEAD_MS;
  p.armedAt = Date.now();
  p.status = "armed";
  p.error = undefined;
  await saveProject(p);
  return { ok: true, project: p };
}

export async function clearCountdown(): Promise<V3Project> {
  const p = await loadProject();
  if (p.pendingMint || p.mint) return p;
  if (p.status === "live" || p.status === "minting" || p.status === "minted") return p;
  p.launchAt = 0;
  p.armedAt = 0;
  p.status = p.id ? "drafted" : "idle";
  p.error = undefined;
  await saveProject(p);
  return p;
}

async function pinMeta(p: V3Project): Promise<{ image: string; uri: string }> {
  const image = p.image || metaUrl(p.handle).replace("/meta?ext=json", "/art");
  const pinned = await pinSphaTokenMeta({
    name: p.name,
    symbol: p.symbol,
    description: p.blurb,
    image,
    website: p.website,
    x: p.x,
    telegram: p.telegram,
    createdOn: p.createdOn,
  });
  const fallback = metaUrl(p.handle);
  const uri =
    pinned?.uri && isTokenMetaUri(pinned.uri) && !/spha-meta\.json/i.test(pinned.uri) ? pinned.uri : fallback;
  return { image: pinned?.image || image, uri };
}

async function buildTeamMintTx(opts: {
  payer: string;
  mint: string;
  project: V3Project;
}): Promise<{ transaction: Transaction; legs: { id: string; to: string; tokens: number }[] }> {
  const conn = connection();
  const payer = new PublicKey(opts.payer);
  const mint = new PublicKey(opts.mint);
  const info = await conn.getAccountInfo(mint, "confirmed");
  if (!info) throw new Error("Mint not on-chain yet.");
  const tokenProgram = info.owner.equals(TOKEN_2022_PROGRAM_ID) ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID;
  const mintState = unpackMint(mint, info, tokenProgram);
  const legs = opts.project.slices
    .filter((s) => s.id !== "lp" && isSolanaAddress(s.wallet) && s.tokens > 0)
    .map((s) => ({ id: s.id, to: s.wallet, tokens: s.tokens }));
  if (!legs.length) throw new Error("Team slices missing.");
  const supplyUi = Number(mintState.supply) / 10 ** mintState.decimals;
  let room = Math.max(0, opts.project.supply - supplyUi);
  const extraPda = tokenProgram.equals(TOKEN_2022_PROGRAM_ID) ? sphaHookExtraPda(mint) : null;
  const extraInfo = extraPda ? await conn.getAccountInfo(extraPda, "confirmed") : null;
  const { blockhash, lastValidBlockHeight } = await conn.getLatestBlockhash("confirmed");
  const tx = new Transaction().add(
    ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }),
    ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 50_000 }),
  );
  if (tokenProgram.equals(TOKEN_2022_PROGRAM_ID) && !extraInfo) tx.add(sphaHookInitIx(payer, mint));
  const minted: { id: string; to: string; tokens: number }[] = [];
  for (const leg of legs) {
    if (!(room > 0)) break;
    const have = await tokenUiAmount(conn, leg.to, opts.mint);
    const need = Math.min(Math.max(0, Math.floor(leg.tokens - (have.amount || 0) + 1e-6)), Math.floor(room));
    if (!(need > 0)) continue;
    const owner = new PublicKey(leg.to);
    const ata = getAssociatedTokenAddressSync(mint, owner, false, tokenProgram);
    tx.add(createAssociatedTokenAccountIdempotentInstruction(payer, ata, owner, mint, tokenProgram));
    tx.add(
      createMintToCheckedInstruction(mint, ata, payer, sphaRawAmount(need, mintState.decimals), mintState.decimals, [], tokenProgram),
    );
    minted.push({ id: leg.id, to: leg.to, tokens: need });
    room -= need;
  }
  if (mintState.mintAuthority && mintState.mintAuthority.equals(payer)) {
    tx.add(createSetAuthorityInstruction(mint, payer, AuthorityType.MintTokens, null, [], tokenProgram));
  }
  if (mintState.freezeAuthority && mintState.freezeAuthority.equals(payer)) {
    tx.add(createSetAuthorityInstruction(mint, payer, AuthorityType.FreezeAccount, null, [], tokenProgram));
  }
  if (tx.instructions.length <= 2) throw new Error("Team slices already minted.");
  tx.feePayer = payer;
  tx.recentBlockhash = blockhash;
  tx.lastValidBlockHeight = lastValidBlockHeight;
  return { transaction: tx, legs: minted.length ? minted : legs };
}

async function maybeFirstBuy(payer: string, mint: string, owner: Keypair, tries: number): Promise<void> {
  const held = await tokenUiAmount(connection(), payer, mint);
  if (held.amount > 0) return;
  const dbc = await import("../../launch/dbc");
  const pool = await dbc.waitForDbcPool(mint, tries);
  if (!pool) return;
  const buy = await dbc.buildDbcTradeTx({ mint, owner: payer, side: "buy", sol: V3_FIRST_BUY_SOL });
  if (buy.ok) await signSend(buy.transaction, [owner]);
}

export async function mintPending(now = Date.now()): Promise<{
  ok: boolean;
  minted: boolean;
  mint: string;
  error?: string;
}> {
  const p0 = await loadProject();
  if ((p0.mint || "").trim()) return { ok: true, minted: true, mint: p0.mint || "" };
  if ((p0.pendingMint || "").trim()) return { ok: true, minted: true, mint: p0.pendingMint || "" };
  if (!(p0.launchAt > 0) || !v3InMintWindow(p0, now)) return { ok: true, minted: false, mint: "" };
  if (!dbcEnabled()) return { ok: false, minted: false, mint: "", error: "The bonding curve is not enabled." };

  const locked = await withMintLock(async () => {
    const p = await loadProject();
    if ((p.mint || "").trim()) return { ok: true as const, minted: true, mint: p.mint || "" };
    if ((p.pendingMint || "").trim()) return { ok: true as const, minted: true, mint: p.pendingMint || "" };
    const keys = await loadKeys();
    const secret = keys[p.launchWallet];
    if (!secret) {
      p.status = "armed";
      p.error = "needs_signer";
      await saveProject(p);
      return { ok: false as const, minted: false, mint: "", error: "needs_signer" };
    }
    let owner: Keypair;
    try {
      owner = walletOf(secret);
      if (owner.publicKey.toBase58() !== p.launchWallet) throw new Error("wallet mismatch");
    } catch {
      p.status = "armed";
      p.error = "needs_signer";
      await saveProject(p);
      return { ok: false as const, minted: false, mint: "", error: "needs_signer" };
    }
    const ownerLamports = await connection().getBalance(owner.publicKey, "confirmed");
    if (ownerLamports < MIN_OWNER_SOL * LAMPORTS_PER_SOL) {
      p.status = "armed";
      p.error = "owner_sol";
      await saveProject(p);
      return { ok: false as const, minted: false, mint: "", error: "Launch wallet needs SOL for rent and the 0.05 opening buy." };
    }
    p.status = "minting";
    p.error = undefined;
    await saveProject(p);

    const payer = owner.publicKey.toBase58();
    const inflight = await loadInflight();
    let mintKp: Keypair;
    try {
      mintKp = inflight ? Keypair.fromSecretKey(b64ToBytes(inflight.secret)) : Keypair.generate();
    } catch {
      mintKp = Keypair.generate();
    }
    const mint = mintKp.publicKey.toBase58();
    let uri = inflight?.uri && isTokenMetaUri(inflight.uri) ? inflight.uri : p.uri;
    let image = inflight?.image || p.image;

    if (await mintAccountExists(mint)) {
      p.status = "minted";
      p.pendingMint = mint;
      p.mintedAt = Date.now();
      p.error = undefined;
      await saveProject(p);
      await clearInflight();
      return { ok: true as const, minted: true, mint };
    }

    if (!uri || !isTokenMetaUri(uri) || /spha-meta\.json/i.test(uri)) {
      const pinned = await pinMeta(p);
      uri = pinned.uri;
      image = pinned.image;
      p.image = image;
      p.uri = uri;
    }

    await saveInflight({ mint, secret: bytesToB64(mintKp.secretKey), uri, image, at: Date.now() });

    const dbc = await import("../../launch/dbc");
    let built: Awaited<ReturnType<typeof dbc.buildV3SphaDbcLaunchTx>>;
    try {
      built = await dbc.buildV3SphaDbcLaunchTx({
        payer,
        mint,
        name: p.name,
        symbol: p.symbol,
        uri: uri.slice(0, 255),
        feeClaimer: payer,
        leftoverReceiver: payer,
        curveTokens: p.curveTokens,
      });
    } catch (e) {
      p.status = "failed";
      p.error = e instanceof Error ? e.message : "Could not build the launch.";
      await saveProject(p);
      return { ok: false as const, minted: false, mint: "", error: p.error };
    }
    const extras: Keypair[] = [owner, mintKp];
    if (built.configSecret) extras.push(Keypair.fromSecretKey(b64ToBytes(built.configSecret)));
    let sig = "";
    try {
      sig = await signSend(built.transaction, extras);
    } catch (e) {
      if (!(await mintAccountExists(mint))) {
        p.status = "failed";
        p.error = e instanceof Error ? e.message : "send failed";
        await saveProject(p);
        return { ok: false as const, minted: false, mint: "", error: p.error };
      }
      sig = "recovered";
    }
    p.status = "minted";
    p.pendingMint = mint;
    p.config = built.config;
    p.image = image;
    p.uri = uri;
    p.mintedAt = Date.now();
    p.sigs = [...p.sigs, sig].slice(-40);
    p.error = undefined;
    await saveProject(p);
    await clearInflight();

    try {
      const team = await buildTeamMintTx({ payer, mint, project: p });
      const teamSig = await signSend(encodeTx(team.transaction), [owner]);
      p.sigs.push(teamSig);
    } catch {
      /* pending CA still counts */
    }
    try {
      const meta = await dbc.buildDbcPoolMetadataTx({
        payer,
        mint,
        name: p.name,
        website: p.website,
        logo: image,
      });
      const metaSig = await signSend(meta.transaction, [owner]);
      p.sigs.push(metaSig);
    } catch {
      /* pool meta pending */
    }
    try {
      await maybeFirstBuy(payer, mint, owner, 16);
    } catch {
      /* first buy pending */
    }
    await saveProject(p);
    return { ok: true as const, minted: true, mint };
  });

  if (locked && typeof locked === "object" && "skipped" in locked) {
    return { ok: true, minted: false, mint: "" };
  }
  return locked;
}

async function finalizePending(now = Date.now()): Promise<void> {
  const p = await loadProject();
  const mint = (p.pendingMint || p.mint || "").trim();
  if (!mint || !isSolanaAddress(mint)) return;
  const keys = await loadKeys();
  const secret = keys[p.launchWallet];
  if (!secret) return;
  let owner: Keypair;
  try {
    owner = walletOf(secret);
  } catch {
    return;
  }
  const payer = owner.publicKey.toBase58();
  try {
    const team = await buildTeamMintTx({ payer, mint, project: p });
    await signSend(encodeTx(team.transaction), [owner]);
  } catch {
    /* team slices may already exist */
  }
  const dbc = await import("../../launch/dbc");
  const pool = await dbc.waitForDbcPool(mint, 8);
  if (pool?.publicKey) p.pool = pool.publicKey.toBase58();
  try {
    const meta = await dbc.buildDbcPoolMetadataTx({
      payer,
      mint,
      name: p.name,
      website: p.website,
      logo: p.image,
    });
    await signSend(meta.transaction, [owner]);
  } catch {
    /* pool meta may already exist */
  }
  try {
    await maybeFirstBuy(payer, mint, owner, 8);
  } catch {
    /* first buy may already have landed */
  }
  p.at = now;
  await saveProject(p);
}

export async function revealLive(now = Date.now()): Promise<{ ok: boolean; revealed: boolean; mint: string }> {
  const p = await loadProject();
  const pending = (p.pendingMint || "").trim();
  const live = (p.mint || "").trim();
  if (live) {
    if (p.status !== "live") {
      p.status = "live";
      p.revealedAt = p.revealedAt || now;
      await saveProject(p);
    }
    return { ok: true, revealed: true, mint: live };
  }
  if (!pending) return { ok: true, revealed: false, mint: "" };
  if (!v3TimedOut(p, now) && p.status !== "live") return { ok: true, revealed: false, mint: "" };
  p.mint = pending;
  p.status = "live";
  p.revealedAt = now;
  await saveProject(p);
  return { ok: true, revealed: true, mint: pending };
}

export async function tickV3(now = Date.now()): Promise<{
  ok: boolean;
  phase: string;
  minted: boolean;
  revealed: boolean;
  mint: string;
  error?: string;
}> {
  const p = await loadProject();
  if (!p.id || p.status === "idle" || p.status === "stopped") {
    return { ok: true, phase: p.status || "idle", minted: false, revealed: false, mint: p.mint || "" };
  }
  if (p.status === "live" && p.mint) {
    await refreshSnipers().catch(() => undefined);
    return { ok: true, phase: "live", minted: true, revealed: true, mint: p.mint };
  }
  if (!(p.launchAt > 0)) {
    return { ok: true, phase: p.status, minted: false, revealed: false, mint: "" };
  }
  let minted = Boolean(p.pendingMint);
  let mint = p.pendingMint || "";
  let error: string | undefined;
  if (v3InMintWindow(p, now) && !minted) {
    const m = await mintPending(now);
    minted = m.minted;
    mint = m.mint || mint;
    error = m.error;
    if (!m.ok) return { ok: false, phase: "failed", minted: false, revealed: false, mint: "", error };
  }
  if (minted || mint) {
    try {
      await finalizePending(now);
    } catch {
      /* reveal still runs */
    }
  }
  let revealed = false;
  if (v3TimedOut(await loadProject(), now)) {
    const r = await revealLive(now);
    revealed = r.revealed;
    mint = r.mint || mint;
  }
  const after = await loadProject();
  await refreshSnipers().catch(() => undefined);
  const phase = after.mint
    ? "live"
    : after.pendingMint
      ? "minted"
      : v3InMintWindow(after, now)
        ? "minting"
        : after.launchAt > 0
          ? "counting"
          : after.status;
  return { ok: true, phase, minted, revealed, mint: after.mint || mint, error: after.error || error };
}

type WalletBag = { mint: string; amount: number; account: PublicKey; program: PublicKey };

async function listWalletBags(owner: string): Promise<WalletBag[]> {
  const conn = connection();
  const ownerPk = new PublicKey(owner);
  const [legacy, t22] = await Promise.all([
    conn.getParsedTokenAccountsByOwner(ownerPk, { programId: new PublicKey(TOKEN_PROGRAM) }),
    conn.getParsedTokenAccountsByOwner(ownerPk, { programId: new PublicKey(TOKEN_2022_PROGRAM) }),
  ]);
  const out: WalletBag[] = [];
  const push = (row: { pubkey: PublicKey; account: { data: unknown } }, program: PublicKey) => {
    const data = row.account.data as { parsed?: { info?: { mint?: string; tokenAmount?: { uiAmount?: number } } } };
    const mint = data?.parsed?.info?.mint || "";
    const amount = Number(data?.parsed?.info?.tokenAmount?.uiAmount) || 0;
    if (!isSolanaAddress(mint) || mint === SOL_MINT || !(amount > 0)) return;
    out.push({ mint, amount, account: row.pubkey, program });
  };
  for (const row of legacy.value) push(row, TOKEN_PROGRAM_ID);
  for (const row of t22.value) push(row, TOKEN_2022_PROGRAM_ID);
  return out;
}

async function sellHolding(kp: Keypair, mint: string, tokens: number): Promise<{ sig: string; solOut: number } | null> {
  if (!(tokens > 0) || !isSolanaAddress(mint)) return null;
  const dbc = await import("../../launch/dbc");
  const built = await dbc.buildDbcTradeTx({
    mint,
    owner: kp.publicKey.toBase58(),
    side: "sell",
    tokens,
    slippageBps: DUMP_SLIPPAGE_BPS,
    minOutLamports: 1,
  });
  if (!built.ok) return null;
  const signed = signPackedB64(built.transaction, [kp]);
  const sig = await broadcastB64(signed, { skipPreflight: true });
  await waitForSignature(sig, 24);
  return { sig, solOut: Number(built.solOut) || 0 };
}

async function sellAllHoldings(kp: Keypair, preferMint?: string): Promise<number> {
  let recovered = 0;
  for (let pass = 0; pass < 4; pass++) {
    const bags = await listWalletBags(kp.publicKey.toBase58());
    if (!bags.length) break;
    bags.sort((a, b) => {
      if (preferMint && a.mint === preferMint) return -1;
      if (preferMint && b.mint === preferMint) return 1;
      return b.amount - a.amount;
    });
    let any = false;
    for (const bag of bags) {
      try {
        const sold = await sellHolding(kp, bag.mint, bag.amount);
        if (!sold) continue;
        any = true;
        recovered += sold.solOut;
      } catch {
        /* next bag */
      }
    }
    if (!any) break;
  }
  return recovered;
}

async function relaySol(from: Keypair, to: PublicKey, lamports?: number): Promise<{ sig: string; lamports: number } | null> {
  const bal = await connection().getBalance(from.publicKey, "confirmed");
  const send = lamports != null ? Math.floor(lamports) : bal - V3_KEEP_LAMPORTS;
  if (send < 1_000_000) return null;
  if (bal - send < V3_KEEP_LAMPORTS) return null;
  const { blockhash, lastValidBlockHeight } = await connection().getLatestBlockhash("confirmed");
  const tx = new Transaction().add(
    ComputeBudgetProgram.setComputeUnitLimit({ units: 20_000 }),
    ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 50_000 }),
    SystemProgram.transfer({ fromPubkey: from.publicKey, toPubkey: to, lamports: send }),
  );
  tx.feePayer = from.publicKey;
  tx.recentBlockhash = blockhash;
  tx.lastValidBlockHeight = lastValidBlockHeight;
  tx.sign(from);
  const sig = await broadcastB64(bytesToB64(tx.serialize()), { skipPreflight: true });
  await waitForSignature(sig, 20);
  return { sig, lamports: send };
}

/** Sell every V3 bag. SOL stays in the isolated launch wallet. Never sends to protocol treasury. */
export async function stopLaunch(): Promise<{ ok: boolean; soldSol: number; error?: string; project: V3Project }> {
  const p = await loadProject();
  if (!p.id) return { ok: false, soldSol: 0, error: "No V3 project.", project: p };
  const keys = await loadKeys();
  const destPk = p.launchWallet;
  if (!isSolanaAddress(destPk) || !keys[destPk]) {
    return { ok: false, soldSol: 0, error: "Launch wallet secret missing.", project: p };
  }
  const dest = new PublicKey(destPk);
  let soldSol = 0;
  const mint = p.mint || p.pendingMint;
  for (const pk of allWalletsOf(p)) {
    const secret = keys[pk];
    if (!secret) continue;
    let kp: Keypair;
    try {
      kp = walletOf(secret);
      if (kp.publicKey.toBase58() !== pk) continue;
    } catch {
      continue;
    }
    try {
      soldSol += await sellAllHoldings(kp, mint);
    } catch {
      /* SOL still relocates */
    }
    if (pk !== destPk) {
      try {
        const relayed = await relaySol(kp, dest);
        if (relayed) p.sigs.push(relayed.sig);
      } catch {
        /* leave it */
      }
    }
  }
  p.status = "stopped";
  p.stoppedAt = Date.now();
  p.returnedSol = (p.returnedSol || 0) + soldSol;
  await saveProject(p);
  return { ok: true, soldSol, project: p };
}

/** Send leftover SOL from the isolated launch wallet to a pasted address (CEX). Optional sol sends that amount and keeps the rest. */
export async function sendLaunchSol(to: string, sol?: number): Promise<{ ok: boolean; movedSol: number; sig?: string; error?: string }> {
  if (!isSolanaAddress(to)) return { ok: false, movedSol: 0, error: "Paste a valid Solana address." };
  const p = await loadProject();
  const keys = await loadKeys();
  const secret = keys[p.launchWallet];
  if (!secret) return { ok: false, movedSol: 0, error: "Launch wallet secret missing." };
  if (to === p.launchWallet) return { ok: false, movedSol: 0, error: "Destination is the launch wallet." };
  const kp = walletOf(secret);
  try {
    const lamports = sol && sol > 0 ? Math.floor(sol * LAMPORTS_PER_SOL) : undefined;
    const relayed = await relaySol(kp, new PublicKey(to), lamports);
    if (!relayed) return { ok: false, movedSol: 0, error: "Not enough SOL to send." };
    p.sigs.push(relayed.sig);
    await saveProject(p);
    return { ok: true, movedSol: relayed.lamports / LAMPORTS_PER_SOL, sig: relayed.sig };
  } catch (e) {
    return { ok: false, movedSol: 0, error: e instanceof Error ? e.message : "Send failed." };
  }
}

function packedFeePayer(transaction: string): string {
  const tx = parseTx(b64ToBytes(transaction));
  if ("feePayer" in tx && tx.feePayer) return tx.feePayer.toBase58();
  const msg = "message" in tx ? tx.message : null;
  if (!msg) return "";
  const keys = "staticAccountKeys" in msg ? msg.staticAccountKeys : [];
  return keys[0]?.toBase58() || "";
}

/** Sign and broadcast a packed swap/send tx with the isolated launch wallet. Never returns the secret. */
export async function signLaunchTx(transaction: string): Promise<{ ok: boolean; signature?: string; error?: string }> {
  const packed = (transaction || "").trim();
  if (packed.length < 16) return { ok: false, error: "Missing transaction." };
  const p = await loadProject();
  const keys = await loadKeys();
  const secret = keys[p.launchWallet];
  if (!p.launchWallet || !secret) return { ok: false, error: "Launch wallet secret missing." };
  let kp: Keypair;
  try {
    kp = walletOf(secret);
  } catch {
    return { ok: false, error: "Launch wallet secret missing." };
  }
  if (kp.publicKey.toBase58() !== p.launchWallet) return { ok: false, error: "Launch wallet mismatch." };
  try {
    if (packedFeePayer(packed) !== p.launchWallet) {
      return { ok: false, error: "Transaction is not from the launch wallet." };
    }
    const signed = signPackedB64(packed, [kp]);
    const signature = await broadcastB64(signed, { skipPreflight: false });
    return { ok: true, signature };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "sign failed" };
  }
}

async function dexPairStats(mint: string): Promise<{ buys: number; sells: number; volumeSol: number; buySol: number } | null> {
  if (!isSolanaAddress(mint)) return null;
  try {
    const r = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mint}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(6_000),
      headers: { accept: "application/json" },
    });
    if (!r.ok) return null;
    const j = (await r.json()) as {
      pairs?: {
        chainId?: string;
        pairAddress?: string;
        txns?: { h24?: { buys?: number; sells?: number }; m5?: { buys?: number; sells?: number } };
        volume?: { h24?: number };
        priceUsd?: string | number;
        priceNative?: string | number;
      }[];
    };
    const pairs = Array.isArray(j.pairs) ? j.pairs : [];
    const pair = pairs.find((row) => String(row.chainId || "").toLowerCase().startsWith("sol")) || pairs[0];
    if (!pair) return null;
    const tx = pair.txns?.h24 || pair.txns?.m5 || {};
    const buys = Number(tx.buys) || 0;
    const sells = Number(tx.sells) || 0;
    const volUsd = Number(pair.volume?.h24) || 0;
    const priceUsd = Number(pair.priceUsd) || 0;
    const priceNative = Number(pair.priceNative) || 0;
    const solUsd = priceNative > 0 && priceUsd > 0 ? priceUsd / priceNative : 0;
    const volumeSol = solUsd > 0 ? volUsd / solUsd : 0;
    const flow = buys + sells;
    return { buys, sells, volumeSol, buySol: flow > 0 ? volumeSol * (buys / flow) : volumeSol };
  } catch {
    return null;
  }
}

export async function refreshSnipers(): Promise<void> {
  const p = await loadProject();
  const mint = p.mint || p.pendingMint;
  if (!isSolanaAddress(mint || "")) return;
  let curveSol = p.snipers.curveSol || 0;
  try {
    const dbc = await import("../../launch/dbc");
    curveSol = await dbc.dbcPoolQuoteSol(mint!);
    if (!p.pool) {
      const pool = await dbc.waitForDbcPool(mint!, 2);
      if (pool?.publicKey) p.pool = pool.publicKey.toBase58();
    }
  } catch {
    /* keep last */
  }
  const dex = await dexPairStats(mint!);
  p.snipers = {
    ...emptySnipers(),
    buys: dex?.buys || 0,
    sells: dex?.sells || 0,
    volumeSol: dex?.volumeSol || 0,
    buySol: dex?.buySol || 0,
    snipers: (dex?.buys || 0) + (dex?.sells || 0) ? Math.max(1, dex?.buys || 0) : 0,
    curveSol,
  };
  if (p.launchWallet) {
    try {
      const bags = await listWalletBags(p.launchWallet);
      let quote = 0;
      for (const bag of bags) {
        try {
          const dbc = await import("../../launch/dbc");
          const q = await dbc.quoteDbcTrade({ mint: bag.mint, side: "sell", tokens: bag.amount, slippageBps: DUMP_SLIPPAGE_BPS });
          if (q.ok) quote = Math.max(quote, Number(q.solOut) || 0);
        } catch {
          /* skip */
        }
      }
      p.bagQuoteSol = quote;
    } catch {
      /* desk still loads */
    }
  }
  await saveProject(p);
}

/** Desk never returns secrets. */
export function adminDeskShape(p: V3Project, fuel: Awaited<ReturnType<typeof launchFuel>>, now = Date.now()) {
  return {
    project: {
      ...p,
    },
    fuel,
    countdown: {
      launchAt: p.launchAt,
      mintAt: mintAtOf(p),
      remainingMs: p.launchAt > 0 ? Math.max(0, p.launchAt - now) : 0,
      inMintWindow: v3InMintWindow(p, now),
      timedOut: v3TimedOut(p, now),
      mintLeadMs: p.mintLeadMs || V3_MINT_LEAD_MS,
    },
  };
}
