import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  ComputeBudgetProgram,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import { isSolanaAddress } from "../security";
import { SITE_URL } from "../config";
import { connection, waitForSignature } from "../solana/connection";
import { signPackedB64 } from "../solana/extraSign";
import { broadcastB64 } from "../solana/broadcast";
import { b64ToBytes, bytesToB64 } from "../solana/wire";
import { encodeTx } from "../token/mint";
import { isTokenMetaUri, pinSphaTokenMeta } from "../token/sphaMeta";
import { createCoin, emptyLaunchBook } from "../launch/engine";
import { dbcEnabled } from "../launch/dbcIds";
import { harvestKeypair } from "../treasury/withdraw";
import { TREASURY_KEEP_LAMPORTS } from "../treasury/plan";
import { treasuryAddress } from "../treasury";
import { durableConfigured, kvDel, kvGetJson, kvSetJson, kvSetNxEx, KEYS } from "../persist";
import { audit, pushBounded, readyState, withLaunch } from "../store";
import { emptySnipers, sniperStats, type SniperStats } from "./snipers";
import { buildProjectSliceMintTx } from "./projectMint";
import { ownerAddress } from "../ownerWallet";
import {
  BATCH_RELAY_LAMPORTS,
  BATCH_RELAY_SOL,
  BATCH_SUPPLY,
  DEFAULT_NARRATIVE,
  DEFAULT_RANDOM,
  DEFAULT_WINDOW_MS,
  MAX_BATCH,
  splitMix,
  buildIdentities,
  curveTokensFor,
  fetchNarratives,
  isInsufficientFunds,
  scheduleTimes,
  teamTokensFor,
  type TokenIdentity,
} from "./identities";

export type CampaignStatus = "idle" | "running" | "paused" | "done" | "stopped";
export type TokenStatus = "queued" | "funding" | "launching" | "live" | "failed";

export type CampaignToken = TokenIdentity & {
  status: TokenStatus;
  scheduledAt: number;
  launchedAt?: number;
  wallet?: string;
  mint?: string;
  config?: string;
  image: string;
  uri: string;
  sigs: string[];
  teamTokens: number;
  curveTokens: number;
  error?: string;
  snipers: SniperStats;
};

export type Campaign = {
  id: string;
  status: CampaignStatus;
  createdAt: number;
  startedAt?: number;
  endsAt?: number;
  windowMs: number;
  narrative: number;
  random: number;
  fundLamports: number;
  relayFunded?: boolean;
  dry?: boolean;
  measuredCostSol?: number;
  relayLeftSol?: number;
  nextAt?: number;
  lastLaunchAt?: number;
  error?: string;
  tokens: CampaignToken[];
};

export type CampaignFuel = {
  treasury: string;
  treasurySol: number;
  hot: boolean;
  fundSol: number;
  remaining: number;
  needSol: number;
  keepSol: number;
  enough: boolean;
  relayLeftSol: number;
  measuredCostSol: number;
  dry: boolean;
};

type KeyPack = Record<string, string>;

const LOCK_TTL_S = 180;
const FILE = path.join(process.cwd(), "data", "batch-launch.json");
const KEYS_FILE = path.join(process.cwd(), "data", "batch-launch-keys.json");

function emptyCampaign(): Campaign {
  return {
    id: "",
    status: "idle",
    createdAt: 0,
    windowMs: DEFAULT_WINDOW_MS,
    narrative: DEFAULT_NARRATIVE,
    random: DEFAULT_RANDOM,
    fundLamports: BATCH_RELAY_LAMPORTS,
    relayFunded: false,
    dry: false,
    tokens: [],
  };
}

function artUrl(id: string): string {
  return `${SITE_URL.replace(/\/$/, "")}/api/tools/token-art/${encodeURIComponent(id)}`;
}

function metaUrl(id: string): string {
  return `${SITE_URL.replace(/\/$/, "")}/api/tools/token-meta/${encodeURIComponent(id)}?ext=json`;
}

async function readJsonFile<T>(file: string): Promise<T | null> {
  try {
    const raw = await readFile(file, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function writeJsonFile(file: string, value: unknown): Promise<void> {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(value), "utf8");
}

export async function loadCampaign(): Promise<Campaign> {
  if (durableConfigured()) {
    const raw = await kvGetJson(KEYS.batchLaunch).catch(() => null);
    if (raw && typeof raw === "object") return normalizeCampaign(raw);
  }
  const file = await readJsonFile<Campaign>(FILE);
  if (file) return normalizeCampaign(file);
  return emptyCampaign();
}

export async function saveCampaign(c: Campaign): Promise<void> {
  const slim = publicCampaign(c);
  if (durableConfigured()) await kvSetJson(KEYS.batchLaunch, slim).catch(() => false);
  await writeJsonFile(FILE, slim).catch(() => undefined);
}

async function loadKeys(): Promise<KeyPack> {
  if (durableConfigured()) {
    const raw = await kvGetJson(KEYS.batchLaunchKeys).catch(() => null);
    if (raw && typeof raw === "object") return raw as KeyPack;
  }
  return (await readJsonFile<KeyPack>(KEYS_FILE)) || {};
}

async function saveKeys(pack: KeyPack): Promise<void> {
  if (durableConfigured()) await kvSetJson(KEYS.batchLaunchKeys, pack).catch(() => false);
  await writeJsonFile(KEYS_FILE, pack).catch(() => undefined);
}

function walletOf(secret: string): Keypair {
  return Keypair.fromSecretKey(b64ToBytes(secret));
}

/** Tools launch wallets we hold secrets for. Used by EXTRACT ALL. */
export async function listCampaignSigners(): Promise<{ pk: string; kp: Keypair }[]> {
  const pack = await loadKeys();
  const out: { pk: string; kp: Keypair }[] = [];
  for (const [pk, secret] of Object.entries(pack)) {
    if (!pk || !secret) continue;
    try {
      const kp = walletOf(secret);
      if (kp.publicKey.toBase58() === pk) out.push({ pk, kp });
    } catch {
      /* skip bad secret */
    }
  }
  return out;
}

export function publicCampaign(c: Campaign): Campaign {
  return {
    ...c,
    tokens: (c.tokens || []).map((t) => ({
      ...t,
      sigs: Array.isArray(t.sigs) ? t.sigs.slice(-6) : [],
      snipers: t.snipers || emptySnipers(),
    })),
  };
}

function normalizeCampaign(raw: unknown): Campaign {
  const o = (raw && typeof raw === "object" ? raw : {}) as Partial<Campaign>;
  const tokens = Array.isArray(o.tokens) ? o.tokens.map(normalizeToken) : [];
  const status = (["idle", "running", "paused", "done", "stopped"] as const).includes(o.status as CampaignStatus)
    ? (o.status as CampaignStatus)
    : "idle";
  return {
    id: typeof o.id === "string" ? o.id : "",
    status,
    createdAt: Number(o.createdAt) || 0,
    startedAt: Number(o.startedAt) || undefined,
    endsAt: Number(o.endsAt) || undefined,
    windowMs: Number(o.windowMs) || DEFAULT_WINDOW_MS,
    narrative: Number(o.narrative) || 0,
    random: Number(o.random) || 0,
    fundLamports: Number(o.fundLamports) || BATCH_RELAY_LAMPORTS,
    relayFunded: Boolean(o.relayFunded),
    dry: Boolean(o.dry),
    measuredCostSol: Number(o.measuredCostSol) || undefined,
    relayLeftSol: Number(o.relayLeftSol) || undefined,
    nextAt: Number(o.nextAt) || undefined,
    lastLaunchAt: Number(o.lastLaunchAt) || undefined,
    error: typeof o.error === "string" ? o.error : undefined,
    tokens,
  };
}

function normalizeToken(raw: unknown): CampaignToken {
  const o = (raw && typeof raw === "object" ? raw : {}) as Partial<CampaignToken>;
  const id = typeof o.id === "string" ? o.id : `t_${hexId()}`;
  return {
    id,
    kind: o.kind === "narrative" ? "narrative" : "random",
    theme: typeof o.theme === "string" ? o.theme : "neon",
    name: typeof o.name === "string" ? o.name : "Coin",
    symbol: typeof o.symbol === "string" ? o.symbol : "COIN",
    blurb: typeof o.blurb === "string" ? o.blurb : "",
    website: typeof o.website === "string" ? o.website : "https://solphia.io",
    x: typeof o.x === "string" ? o.x : "",
    telegram: typeof o.telegram === "string" ? o.telegram : "",
    teamBps: Number(o.teamBps) || 300,
    status: (["queued", "funding", "launching", "live", "failed"] as const).includes(o.status as TokenStatus)
      ? (o.status as TokenStatus)
      : "queued",
    scheduledAt: Number(o.scheduledAt) || 0,
    launchedAt: Number(o.launchedAt) || undefined,
    wallet: typeof o.wallet === "string" ? o.wallet : undefined,
    mint: typeof o.mint === "string" ? o.mint : undefined,
    config: typeof o.config === "string" ? o.config : undefined,
    image: typeof o.image === "string" && o.image ? o.image : artUrl(id),
    uri: typeof o.uri === "string" && o.uri ? o.uri : metaUrl(id),
    sigs: Array.isArray(o.sigs) ? o.sigs.filter((s) => typeof s === "string") : [],
    teamTokens: Number(o.teamTokens) || teamTokensFor(Number(o.teamBps) || 300),
    curveTokens: Number(o.curveTokens) || curveTokensFor(Number(o.teamBps) || 300),
    error: typeof o.error === "string" ? o.error : undefined,
    snipers: o.snipers || emptySnipers(),
  };
}

function hexId(): string {
  return Math.random().toString(16).slice(2, 10);
}

function bookOf(s: { launch?: ReturnType<typeof emptyLaunchBook>; ownerWallet?: string }) {
  if (!s.launch) s.launch = emptyLaunchBook();
  if (s.ownerWallet && !s.launch.ownerWallet) s.launch.ownerWallet = s.ownerWallet;
  return s.launch;
}

async function signSend(packed: string, signers: Keypair[]): Promise<string> {
  const signed = signPackedB64(packed, signers);
  return broadcastB64(signed, { skipPreflight: false });
}

export async function campaignFuel(c?: Campaign): Promise<CampaignFuel> {
  const camp = c || (await loadCampaign());
  const treasury = treasuryAddress();
  const hot = Boolean(harvestKeypair());
  const remaining = camp.tokens.filter((t) => t.status === "queued" || t.status === "funding" || t.status === "launching").length
    || (camp.status === "idle" ? camp.narrative + camp.random || DEFAULT_NARRATIVE + DEFAULT_RANDOM : 0);
  const needSol = camp.relayFunded ? 0 : BATCH_RELAY_SOL;
  let treasurySol = 0;
  if (treasury && isSolanaAddress(treasury)) {
    try {
      treasurySol = (await connection().getBalance(new PublicKey(treasury), "confirmed")) / LAMPORTS_PER_SOL;
    } catch {
      treasurySol = 0;
    }
  }
  const keepSol = TREASURY_KEEP_LAMPORTS / LAMPORTS_PER_SOL;
  const live = camp.tokens.filter((t) => t.status === "live").length;
  return {
    treasury,
    treasurySol,
    hot,
    fundSol: camp.measuredCostSol || 0,
    remaining,
    needSol,
    keepSol,
    enough: hot && (camp.relayFunded || treasurySol >= needSol + keepSol),
    relayLeftSol: Number(camp.relayLeftSol) || 0,
    measuredCostSol: live && camp.measuredCostSol ? camp.measuredCostSol : Number(camp.measuredCostSol) || 0,
    dry: Boolean(camp.dry),
  };
}

export async function startCampaign(opts?: {
  narrative?: number;
  random?: number;
  windowMs?: number;
}): Promise<{ ok: true; campaign: Campaign; fuel: CampaignFuel } | { ok: false; error: string; fuel: CampaignFuel }> {
  const live = await loadCampaign();
  if (live.status === "running") {
    return { ok: false, error: "A campaign is already running. Pause or stop it first.", fuel: await campaignFuel(live) };
  }
  if (!dbcEnabled()) return { ok: false, error: "The bonding curve is not enabled.", fuel: await campaignFuel(live) };
  let narrative = Math.max(0, Math.min(MAX_BATCH, Math.floor(opts?.narrative ?? DEFAULT_NARRATIVE)));
  let random = Math.max(0, Math.min(MAX_BATCH, Math.floor(opts?.random ?? DEFAULT_RANDOM)));
  if (narrative + random > MAX_BATCH) {
    const mix = splitMix(MAX_BATCH, ((narrative + random) ? (narrative / (narrative + random)) * 100 : 40));
    narrative = mix.narrative;
    random = mix.random;
  }
  const total = narrative + random;
  if (!(total > 0)) return { ok: false, error: "Set at least one token to launch.", fuel: await campaignFuel(live) };
  const windowMs = Math.max(60_000, Math.floor(opts?.windowMs ?? DEFAULT_WINDOW_MS));
  const now = Date.now();
  const hits = await fetchNarratives(Math.max(120, narrative));
  const ids = buildIdentities({ narrative, random, hits });
  const times = scheduleTimes(ids.length, windowMs, now);
  const tokens: CampaignToken[] = ids.map((id, i) => ({
    ...id,
    status: "queued",
    scheduledAt: times[i] || now,
    image: artUrl(id.id),
    uri: metaUrl(id.id),
    sigs: [],
    teamTokens: teamTokensFor(id.teamBps),
    curveTokens: curveTokensFor(id.teamBps),
    snipers: emptySnipers(),
  }));
  const campaign: Campaign = {
    id: `bl_${now.toString(36)}_${hexId()}`,
    status: "running",
    createdAt: now,
    startedAt: now,
    endsAt: now + windowMs,
    windowMs,
    narrative,
    random,
    fundLamports: BATCH_RELAY_LAMPORTS,
    relayFunded: false,
    dry: false,
    nextAt: tokens[0]?.scheduledAt || now,
    tokens,
  };
  const fuel = await campaignFuel(campaign);
  if (!fuel.hot) {
    return { ok: false, error: "Treasury hot key is not loaded. Set TREASURY_SECRET to the displayed treasury.", fuel };
  }
  if (!fuel.enough) {
    return {
      ok: false,
      error: `Treasury needs ${BATCH_RELAY_SOL.toFixed(3)} SOL plus ${fuel.keepSol.toFixed(3)} SOL kept to seed the first launch wallet. It holds ${fuel.treasurySol.toFixed(3)} SOL. Remainder relays to the next wallet until a launch fails on insufficient funds.`,
      fuel,
    };
  }
  await saveCampaign(campaign);
  return { ok: true, campaign, fuel };
}

export async function pauseCampaign(): Promise<Campaign> {
  const c = await loadCampaign();
  if (c.status === "running") {
    c.status = "paused";
    await saveCampaign(c);
  }
  return c;
}

export async function resumeCampaign(): Promise<Campaign> {
  const c = await loadCampaign();
  if (c.status === "paused") {
    c.status = "running";
    const next = c.tokens.find((t) => t.status === "queued" || t.status === "funding" || t.status === "launching");
    c.nextAt = next?.scheduledAt || Date.now();
    c.error = undefined;
    await saveCampaign(c);
  }
  return c;
}

export async function stopCampaign(): Promise<Campaign> {
  const c = await loadCampaign();
  if (c.status === "running" || c.status === "paused") {
    c.status = "stopped";
    await saveCampaign(c);
  }
  return c;
}

export async function resetCampaign(): Promise<Campaign> {
  const c = await loadCampaign();
  if (c.status === "running") throw new Error("Stop or pause the campaign before resetting.");
  const empty = emptyCampaign();
  await saveCampaign(empty);
  await saveKeys({});
  if (durableConfigured()) await kvDel(KEYS.batchLaunchKeys).catch(() => undefined);
  return empty;
}

async function withLaunchLock<T>(fn: () => Promise<T>): Promise<T | { skipped: true }> {
  const got = await kvSetNxEx(KEYS.batchLaunchLock, { at: Date.now() }, LOCK_TTL_S);
  if (got === false && durableConfigured()) return { skipped: true };
  try {
    return await fn();
  } finally {
    await kvDel(KEYS.batchLaunchLock).catch(() => undefined);
  }
}

const RELAY_FEE_LAMPORTS = 15_000;

async function sendSol(from: Keypair, to: PublicKey, lamports: number): Promise<string> {
  const conn = connection();
  const { blockhash, lastValidBlockHeight } = await conn.getLatestBlockhash("confirmed");
  const tx = new Transaction().add(
    ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 50_000 }),
    SystemProgram.transfer({
      fromPubkey: from.publicKey,
      toPubkey: to,
      lamports,
    }),
  );
  tx.feePayer = from.publicKey;
  tx.recentBlockhash = blockhash;
  tx.lastValidBlockHeight = lastValidBlockHeight;
  tx.sign(from);
  const sig = await broadcastB64(bytesToB64(tx.serialize()), { skipPreflight: false });
  await waitForSignature(sig, 24);
  return sig;
}

async function relayAll(from: Keypair, to: PublicKey): Promise<{ sig: string; lamports: number }> {
  const bal = await connection().getBalance(from.publicKey, "confirmed");
  const send = bal - RELAY_FEE_LAMPORTS;
  if (send < 1) return { sig: "", lamports: Math.max(0, bal) };
  const sig = await sendSol(from, to, send);
  return { sig, lamports: send };
}

async function ensureWallet(token: CampaignToken, keys: KeyPack): Promise<Keypair> {
  if (token.wallet && keys[token.wallet]) return walletOf(keys[token.wallet]!);
  const kp = Keypair.generate();
  token.wallet = kp.publicKey.toBase58();
  keys[token.wallet] = bytesToB64(kp.secretKey);
  await saveKeys(keys);
  return kp;
}

function measureRelay(c: Campaign, leftSol: number) {
  c.relayLeftSol = Math.max(0, leftSol);
  const live = c.tokens.filter((t) => t.status === "live").length;
  const spent = Math.max(0, BATCH_RELAY_SOL - c.relayLeftSol);
  c.measuredCostSol = live > 0 ? spent / live : spent;
}

function markDry(c: Campaign, token: CampaignToken, walletSol: number, message: string) {
  token.status = "failed";
  token.error = message;
  c.dry = true;
  c.status = "stopped";
  measureRelay(c, walletSol);
  const live = c.tokens.filter((t) => t.status === "live").length;
  c.error = `Stopped on insufficient funds after ${live} live launch${live === 1 ? "" : "es"}. Seed was ${BATCH_RELAY_SOL} SOL. About ${(c.measuredCostSol || 0).toFixed(4)} SOL used per launch. ${walletSol.toFixed(4)} SOL left in the last wallet. ${message}`;
}

async function relayToNext(c: Campaign, from: Keypair, token: CampaignToken, keys: KeyPack): Promise<void> {
  const next = c.tokens.find((t) => (t.status === "queued" || t.status === "funding") && t.id !== token.id);
  if (!next) {
    const left = await connection().getBalance(from.publicKey, "confirmed").catch(() => 0);
    measureRelay(c, left / LAMPORTS_PER_SOL);
    return;
  }
  const nextKp = await ensureWallet(next, keys);
  try {
    const relayed = await relayAll(from, nextKp.publicKey);
    if (relayed.sig) token.sigs.push(relayed.sig);
    measureRelay(c, relayed.lamports / LAMPORTS_PER_SOL);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Relay failed.";
    const left = await connection().getBalance(from.publicKey, "confirmed").catch(() => 0);
    if (isInsufficientFunds(msg) && token.status !== "live") markDry(c, token, left / LAMPORTS_PER_SOL, msg);
    else measureRelay(c, left / LAMPORTS_PER_SOL);
  }
}

async function pinMeta(token: CampaignToken): Promise<{ image: string; uri: string }> {
  const image = token.image || artUrl(token.id);
  const pinned = await pinSphaTokenMeta({
    name: token.name,
    symbol: token.symbol,
    description: token.blurb,
    image,
    website: token.website,
    x: token.x,
    telegram: token.telegram,
  });
  const pinnedUri = pinned?.uri || "";
  const uri =
    pinnedUri && isTokenMetaUri(pinnedUri) && !/spha-meta\.json/i.test(pinnedUri) ? pinnedUri : metaUrl(token.id);
  return { image: pinned?.image || image, uri };
}

async function launchOne(c: Campaign, token: CampaignToken): Promise<CampaignToken> {
  const treasury = harvestKeypair();
  if (!treasury) {
    token.status = "failed";
    token.error = "Treasury hot key is not loaded.";
    return token;
  }
  const owner = ownerAddress();
  if (!isSolanaAddress(owner)) {
    token.status = "failed";
    token.error = "Set the owner wallet so this launcher can send the 1% swap fee to owner.";
    return token;
  }
  const conn = connection();
  const keys = await loadKeys();
  const walletKp = await ensureWallet(token, keys);
  token.status = "funding";
  try {
    if (!c.relayFunded) {
      const treasBal = await conn.getBalance(treasury.publicKey, "confirmed");
      if (treasBal < BATCH_RELAY_LAMPORTS + TREASURY_KEEP_LAMPORTS + RELAY_FEE_LAMPORTS) {
        markDry(c, token, treasBal / LAMPORTS_PER_SOL, "Treasury cannot seed the 0.5 SOL relay.");
        return token;
      }
      const sig = await sendSol(treasury, walletKp.publicKey, BATCH_RELAY_LAMPORTS);
      token.sigs.push(sig);
      c.relayFunded = true;
    } else {
      const bal = await conn.getBalance(walletKp.publicKey, "confirmed");
      if (bal < 20_000_000) {
        const prevs = c.tokens.filter(
          (t) => t.wallet && t.wallet !== token.wallet && keys[t.wallet] && (t.status === "live" || t.status === "failed"),
        );
        for (const prev of [...prevs].reverse()) {
          const prevKp = walletOf(keys[prev.wallet!]!);
          const prevBal = await conn.getBalance(prevKp.publicKey, "confirmed");
          if (prevBal > RELAY_FEE_LAMPORTS + 1_000_000) {
            const relayed = await relayAll(prevKp, walletKp.publicKey);
            if (relayed.sig) token.sigs.push(relayed.sig);
            break;
          }
        }
      }
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Funding failed.";
    const left = await conn.getBalance(walletKp.publicKey, "confirmed").catch(() => 0);
    if (isInsufficientFunds(msg)) {
      markDry(c, token, left / LAMPORTS_PER_SOL, msg);
      return token;
    }
    token.status = "failed";
    token.error = msg;
    return token;
  }

  token.status = "launching";
  const mintKp = Keypair.generate();
  token.mint = mintKp.publicKey.toBase58();
  const art = await pinMeta(token);
  token.image = art.image;
  token.uri = art.uri;
  const dbc = await import("../launch/dbc");
  try {
    const built = await dbc.buildHookedDbcLaunchTx({
      payer: walletKp.publicKey.toBase58(),
      mint: token.mint,
      name: token.name,
      symbol: token.symbol,
      uri: token.uri.slice(0, 255),
      curveTokens: token.curveTokens,
      feeClaimer: owner,
      leftoverReceiver: owner,
      creatorTradingFeePercentage: 0,
    });
    token.config = built.config;
    const launchSig = await signSend(built.transaction, [
      walletKp,
      mintKp,
      Keypair.fromSecretKey(b64ToBytes(built.configSecret)),
    ]);
    token.sigs.push(launchSig);
    await waitForSignature(launchSig, 32);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Launch failed.";
    const left = await conn.getBalance(walletKp.publicKey, "confirmed").catch(() => 0);
    if (isInsufficientFunds(msg)) {
      markDry(c, token, left / LAMPORTS_PER_SOL, msg);
      return token;
    }
    token.status = "failed";
    token.error = msg;
    await relayToNext(c, walletKp, token, keys);
    return token;
  }
  try {
    const team = await buildProjectSliceMintTx({
      conn,
      payer: walletKp.publicKey.toBase58(),
      mint: token.mint,
      to: walletKp.publicKey.toBase58(),
      tokens: token.teamTokens,
      supplyCap: BATCH_SUPPLY,
    });
    const teamSig = await signSend(encodeTx(team.transaction), [walletKp]);
    token.sigs.push(teamSig);
  } catch {
    /* slice may already exist */
  }
  try {
    const meta = await dbc.buildDbcPoolMetadataTx({
      payer: walletKp.publicKey.toBase58(),
      mint: token.mint,
      name: token.name,
      website: token.website,
      logo: token.image,
    });
    const metaSig = await signSend(meta.transaction, [walletKp]);
    token.sigs.push(metaSig);
  } catch {
    /* pool meta pending */
  }
  if (isSolanaAddress(token.wallet || "") && isSolanaAddress(token.mint || "")) {
    await withLaunch((st) => {
      const book = bookOf(st);
      createCoin(book, {
        creator: token.wallet!,
        name: token.name,
        symbol: token.symbol,
        blurb: token.blurb,
        image: token.image,
        website: token.website,
        x: token.x,
        telegram: token.telegram,
        mint: token.mint,
        venue: "solphia",
      });
      pushBounded(st.audit, audit("admin", "batch_launch", token.mint || token.symbol), 400);
    }, true);
  }
  token.status = "live";
  token.launchedAt = Date.now();
  token.error = undefined;
  await relayToNext(c, walletKp, token, keys);
  return token;
}

function nextQueued(c: Campaign, now: number): CampaignToken | undefined {
  return c.tokens
    .filter((t) => (t.status === "queued" || t.status === "funding" || t.status === "launching") && t.scheduledAt <= now)
    .sort((a, b) => a.scheduledAt - b.scheduledAt)[0];
}

export async function tickBatchLaunch(opts?: { limit?: number }): Promise<{
  ran: number;
  failed: number;
  status: CampaignStatus;
  nextAt?: number;
}> {
  const c0 = await loadCampaign();
  if (c0.status !== "running") return { ran: 0, failed: 0, status: c0.status, nextAt: c0.nextAt };
  const locked = await withLaunchLock(async () => {
    let ran = 0;
    let failed = 0;
    const limit = Math.max(1, Math.min(3, opts?.limit ?? 2));
    for (let i = 0; i < limit; i++) {
      const c = await loadCampaign();
      if (c.status !== "running") break;
      const now = Date.now();
      const token = nextQueued(c, now);
      if (!token) {
        const pending = c.tokens.find((t) => t.status === "queued" || t.status === "funding" || t.status === "launching");
        if (!pending) {
          c.status = "done";
          c.nextAt = undefined;
          await saveCampaign(c);
        } else {
          c.nextAt = pending.scheduledAt;
          await saveCampaign(c);
        }
        break;
      }
      const idx = c.tokens.findIndex((t) => t.id === token.id);
      try {
        const live = await launchOne(c, token);
        if (idx >= 0) c.tokens[idx] = live;
        if (live.status === "live") ran += 1;
        else failed += 1;
        c.lastLaunchAt = Date.now();
        const next = c.tokens.find((t) => t.status === "queued" || t.status === "funding" || t.status === "launching");
        c.nextAt = next?.scheduledAt;
        if (!next && c.status === "running") c.status = "done";
        await saveCampaign(c);
        if (c.dry || c.status !== "running") break;
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Launch failed.";
        let walletSol = 0;
        try {
          if (token.wallet) {
            walletSol = (await connection().getBalance(new PublicKey(token.wallet), "confirmed")) / LAMPORTS_PER_SOL;
          }
        } catch {
          walletSol = 0;
        }
        if (isInsufficientFunds(msg)) markDry(c, token, walletSol, msg);
        else {
          token.status = "failed";
          token.error = msg;
        }
        if (idx >= 0) c.tokens[idx] = token;
        failed += 1;
        c.lastLaunchAt = Date.now();
        await saveCampaign(c);
        if (c.dry || c.status !== "running") break;
      }
    }
    const c = await loadCampaign();
    return { ran, failed, status: c.status, nextAt: c.nextAt };
  });
  if (locked && typeof locked === "object" && "skipped" in locked) {
    return { ran: 0, failed: 0, status: c0.status, nextAt: c0.nextAt };
  }
  return locked;
}

export async function refreshSnipers(limit = 12): Promise<number> {
  const c = await loadCampaign();
  const live = c.tokens.filter((t) => t.status === "live" && t.mint);
  if (!live.length) return 0;
  const s = await readyState();
  const book = s.launch;
  const dbc = await import("../launch/dbc").catch(() => null);
  const slice = live.sort((a, b) => (a.snipers.volumeSol || 0) - (b.snipers.volumeSol || 0)).slice(0, limit);
  let n = 0;
  for (const token of slice) {
    const coin = book?.coins?.find((x) => x.mint === token.mint);
    let curveSol = token.snipers.curveSol || 0;
    if (dbc && token.mint) {
      try {
        curveSol = await dbc.dbcPoolQuoteSol(token.mint);
      } catch {
        /* keep last */
      }
    }
    token.snipers = sniperStats(coin, curveSol);
    n += 1;
  }
  await saveCampaign(c);
  return n;
}

export function campaignSummary(c: Campaign) {
  const live = c.tokens.filter((t) => t.status === "live").length;
  const failed = c.tokens.filter((t) => t.status === "failed").length;
  const queued = c.tokens.filter((t) => t.status === "queued" || t.status === "funding" || t.status === "launching").length;
  const buys = c.tokens.reduce((s, t) => s + (t.snipers.buys || 0), 0);
  const sells = c.tokens.reduce((s, t) => s + (t.snipers.sells || 0), 0);
  const volumeSol = c.tokens.reduce((s, t) => s + (t.snipers.volumeSol || 0), 0);
  return {
    total: c.tokens.length,
    live,
    failed,
    queued,
    buys,
    sells,
    volumeSol,
    dry: Boolean(c.dry),
    measuredCostSol: Number(c.measuredCostSol) || 0,
    relayLeftSol: Number(c.relayLeftSol) || 0,
    relayFunded: Boolean(c.relayFunded),
  };
}
