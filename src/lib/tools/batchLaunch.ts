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
import { createCloseAccountInstruction, TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { isSolanaAddress } from "../security";
import { SITE_URL } from "../config";
import { connection, waitForSignature } from "../solana/connection";
import { signPackedB64 } from "../solana/extraSign";
import { broadcastB64 } from "../solana/broadcast";
import { b64ToBytes, bytesToB64 } from "../solana/wire";
import { encodeTx } from "../token/mint";
import { TOKEN_2022_PROGRAM, TOKEN_PROGRAM } from "../solana/tokenBalance";
import { SOL_MINT } from "../pair/mints";
import { isTokenMetaUri, pinSphaTokenMeta } from "../token/sphaMeta";
import { createCoin, emptyLaunchBook } from "../launch/engine";
import { dbcEnabled } from "../launch/dbcIds";
import { loadTreasuryKeypair } from "../treasury/withdraw";
import { TREASURY_KEEP_LAMPORTS } from "../treasury/plan";
import { treasuryAddress } from "../treasury";
import { durableConfigured, kvDel, kvGetJson, kvSetJson, kvSetNxEx, KEYS } from "../persist";
import { audit, pushBounded, readyState, withLaunch } from "../store";
import { emptySnipers, sniperStats, type SniperStats } from "./snipers";
import { buildProjectSliceMintTx } from "./projectMint";
import { ownerAddress } from "../ownerWallet";
import {
  BATCH_FIRST_BUY_SOL,
  BATCH_RELAY_LAMPORTS,
  BATCH_RELAY_SOL,
  BATCH_SUPPLY,
  DEFAULT_NARRATIVE,
  DEFAULT_RANDOM,
  DEFAULT_WINDOW_MS,
  DUMP_DELAY_MS,
  DUMP_MIN_SOL,
  DUMP_SLIPPAGE_BPS,
  dumpHot,
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
  pool?: string;
  image: string;
  uri: string;
  sigs: string[];
  teamTokens: number;
  curveTokens: number;
  error?: string;
  snipers: SniperStats;
  dumpAt?: number;
  dumped?: boolean;
  dumpSol?: number;
  bagQuoteSol?: number;
  returnedSol?: number;
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
  returnedSol?: number;
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
const TICKERS_FILE = path.join(process.cwd(), "data", "batch-launch-tickers.json");

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

function ingestTickers(used: Set<string>, rows: unknown) {
  if (!Array.isArray(rows)) return;
  for (const row of rows) {
    const sym = String(row || "").replace(/^\$/, "").trim().toUpperCase();
    if (sym) used.add(sym);
  }
}

async function loadUsedTickers(): Promise<Set<string>> {
  const used = new Set<string>();
  const prev = await loadCampaign().catch(() => null);
  for (const t of prev?.tokens || []) {
    const sym = (t.symbol || "").replace(/^\$/, "").trim().toUpperCase();
    if (sym) used.add(sym);
  }
  try {
    const s = await readyState();
    for (const coin of s.launch?.coins || []) {
      const sym = (coin.symbol || "").replace(/^\$/, "").trim().toUpperCase();
      if (sym) used.add(sym);
    }
  } catch {
    /* campaign history is enough */
  }
  if (durableConfigured()) {
    ingestTickers(used, await kvGetJson(KEYS.batchLaunchTickers).catch(() => null));
  }
  ingestTickers(used, await readJsonFile<unknown>(TICKERS_FILE));
  return used;
}

async function rememberTickers(symbols: string[]) {
  const used = await loadUsedTickers();
  for (const raw of symbols) {
    const sym = String(raw || "").replace(/^\$/, "").trim().toUpperCase();
    if (sym) used.add(sym);
  }
  const list = [...used].slice(-2000);
  if (durableConfigured()) await kvSetJson(KEYS.batchLaunchTickers, list).catch(() => undefined);
  await writeJsonFile(TICKERS_FILE, list).catch(() => undefined);
}

function walletOf(secret: string): Keypair {
  return Keypair.fromSecretKey(b64ToBytes(secret));
}

/** Tools launch wallets we hold secrets for. Used by EXTRACT LAUNCHED WALLETS. */
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
    returnedSol: Number(o.returnedSol) || undefined,
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
    pool: typeof o.pool === "string" ? o.pool : undefined,
    image: typeof o.image === "string" && o.image ? o.image : artUrl(id),
    uri: typeof o.uri === "string" && o.uri ? o.uri : metaUrl(id),
    sigs: Array.isArray(o.sigs) ? o.sigs.filter((s) => typeof s === "string") : [],
    teamTokens: Number(o.teamTokens) || teamTokensFor(Number(o.teamBps) || 300),
    curveTokens: Number(o.curveTokens) || curveTokensFor(Number(o.teamBps) || 300),
    error: typeof o.error === "string" ? o.error : undefined,
    snipers: o.snipers || emptySnipers(),
    dumpAt: Number(o.dumpAt) || undefined,
    dumped: Boolean(o.dumped),
    dumpSol: Number(o.dumpSol) || undefined,
    bagQuoteSol: Number(o.bagQuoteSol) || undefined,
    returnedSol: Number(o.returnedSol) || undefined,
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
  const hot = Boolean(await loadTreasuryKeypair());
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
  const used = await loadUsedTickers();
  const ids = buildIdentities({ narrative, random, hits, used });
  await rememberTickers(ids.map((id) => id.symbol));
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
    return {
      ok: false,
      error: "Treasury cannot sign. Save the treasury project key in Wallets so it matches the displayed treasury.",
      fuel,
    };
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
    c.nextAt = nextWorkAt(c) || Date.now();
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
    try {
      await closeOutCampaign(c, { limit: 8 });
    } catch {
      /* cron finishes leftover hops */
    }
  }
  return loadCampaign();
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

const RELAY_FEE_LAMPORTS = 2_000_000;

async function sendSol(from: Keypair, to: PublicKey, lamports: number): Promise<string> {
  const conn = connection();
  const live = await conn.getBalance(from.publicKey, "confirmed");
  let send = Math.min(lamports, Math.max(0, live - RELAY_FEE_LAMPORTS));
  if (send < 1) throw new Error("dust");
  const fire = async (amount: number) => {
    const { blockhash, lastValidBlockHeight } = await conn.getLatestBlockhash("confirmed");
    const tx = new Transaction().add(
      ComputeBudgetProgram.setComputeUnitLimit({ units: 20_000 }),
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 50_000 }),
      SystemProgram.transfer({
        fromPubkey: from.publicKey,
        toPubkey: to,
        lamports: amount,
      }),
    );
    tx.feePayer = from.publicKey;
    tx.recentBlockhash = blockhash;
    tx.lastValidBlockHeight = lastValidBlockHeight;
    tx.sign(from);
    const sig = await broadcastB64(bytesToB64(tx.serialize()), { skipPreflight: true });
    await waitForSignature(sig, 24);
    return sig;
  };
  try {
    return await fire(send);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (!/insufficient|simulation|debit/i.test(msg)) throw e;
    const live2 = await conn.getBalance(from.publicKey, "confirmed");
    send = Math.max(0, live2 - RELAY_FEE_LAMPORTS - 1_000_000);
    if (send < 1) throw e;
    return await fire(send);
  }
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

async function returnWalletToOwner(c: Campaign, from: Keypair, token: CampaignToken): Promise<void> {
  const owner = ownerAddress();
  if (!isSolanaAddress(owner) || from.publicKey.toBase58() === owner) {
    const left = await connection().getBalance(from.publicKey, "confirmed").catch(() => 0);
    measureRelay(c, left / LAMPORTS_PER_SOL);
    return;
  }
  try {
    const relayed = await relayAll(from, new PublicKey(owner));
    if (relayed.sig) token.sigs.push(relayed.sig);
    const sol = relayed.lamports / LAMPORTS_PER_SOL;
    token.returnedSol = (token.returnedSol || 0) + sol;
    c.returnedSol = (c.returnedSol || 0) + sol;
    measureRelay(c, 0);
  } catch {
    const left = await connection().getBalance(from.publicKey, "confirmed").catch(() => 0);
    measureRelay(c, left / LAMPORTS_PER_SOL);
  }
}

async function relayToNext(c: Campaign, from: Keypair, token: CampaignToken, keys: KeyPack): Promise<void> {
  const next = c.tokens.find((t) => (t.status === "queued" || t.status === "funding") && t.id !== token.id);
  if (!next) {
    await returnWalletToOwner(c, from, token);
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
    const data = row.account.data as {
      parsed?: { info?: { mint?: string; tokenAmount?: { uiAmount?: number } } };
    };
    const mint = data?.parsed?.info?.mint || "";
    const amount = Number(data?.parsed?.info?.tokenAmount?.uiAmount) || 0;
    if (!isSolanaAddress(mint) || mint === SOL_MINT || !(amount > 0)) return;
    out.push({ mint, amount, account: row.pubkey, program });
  };
  for (const row of legacy.value) push(row, TOKEN_PROGRAM_ID);
  for (const row of t22.value) push(row, TOKEN_2022_PROGRAM_ID);
  return out;
}

async function quoteBagSol(mint: string, tokens: number): Promise<number> {
  if (!(tokens > 0) || !isSolanaAddress(mint)) return 0;
  try {
    const dbc = await import("../launch/dbc");
    const q = await dbc.quoteDbcTrade({ mint, side: "sell", tokens, slippageBps: DUMP_SLIPPAGE_BPS });
    return q.ok ? Number(q.solOut) || 0 : 0;
  } catch {
    return 0;
  }
}

async function sellHolding(kp: Keypair, mint: string, tokens: number): Promise<{ sig: string; solOut: number } | null> {
  if (!(tokens > 0) || !isSolanaAddress(mint)) return null;
  const dbc = await import("../launch/dbc");
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

async function closeEmptyBags(kp: Keypair, bags: WalletBag[]): Promise<string | null> {
  if (!bags.length) return null;
  const conn = connection();
  const ixs = [];
  for (const bag of bags) {
    try {
      const info = await conn.getTokenAccountBalance(bag.account, "confirmed");
      if (BigInt(info.value.amount || "0") !== 0n) continue;
      ixs.push(createCloseAccountInstruction(bag.account, kp.publicKey, kp.publicKey, [], bag.program));
    } catch {
      /* leave the ATA */
    }
  }
  if (!ixs.length) return null;
  const { blockhash, lastValidBlockHeight } = await conn.getLatestBlockhash("confirmed");
  const tx = new Transaction().add(
    ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 50_000 }),
    ...ixs.slice(0, 8),
  );
  tx.feePayer = kp.publicKey;
  tx.recentBlockhash = blockhash;
  tx.lastValidBlockHeight = lastValidBlockHeight;
  tx.sign(kp);
  const sig = await broadcastB64(bytesToB64(tx.serialize()), { skipPreflight: true });
  await waitForSignature(sig, 20);
  return sig;
}

async function sellAllHoldings(kp: Keypair, token: CampaignToken, opts?: { minSol?: number }): Promise<number> {
  const minSol = opts?.minSol ?? DUMP_MIN_SOL;
  let recovered = 0;
  for (let pass = 0; pass < 4; pass++) {
    const bags = await listWalletBags(kp.publicKey.toBase58());
    if (!bags.length) break;
    bags.sort((a, b) => {
      if (token.mint && a.mint === token.mint) return -1;
      if (token.mint && b.mint === token.mint) return 1;
      return b.amount - a.amount;
    });
    let any = false;
    for (const bag of bags) {
      try {
        const value = await quoteBagSol(bag.mint, bag.amount);
        if (value < minSol) continue;
        const sold = await sellHolding(kp, bag.mint, bag.amount);
        if (!sold) continue;
        any = true;
        recovered += sold.solOut;
        token.sigs.push(sold.sig);
      } catch {
        /* try the next bag */
      }
    }
    try {
      const closed = await closeEmptyBags(kp, bags);
      if (closed) token.sigs.push(closed);
    } catch {
      /* rent reclaim is best-effort */
    }
    if (!any) break;
  }
  token.dumpSol = (token.dumpSol || 0) + recovered;
  return recovered;
}

function tokenDumpHot(token: CampaignToken, quote = token.bagQuoteSol || 0): boolean {
  return dumpHot({
    bagQuoteSol: quote,
    sniperVolumeSol: token.snipers?.volumeSol,
    sniperBuySol: token.snipers?.buySol,
  });
}

async function dumpAndAdvance(c: Campaign, token: CampaignToken): Promise<void> {
  const keys = await loadKeys();
  if (!token.wallet || !keys[token.wallet]) {
    token.dumped = true;
    return;
  }
  const kp = walletOf(keys[token.wallet]!);
  const bags = await listWalletBags(kp.publicKey.toBase58()).catch(() => [] as WalletBag[]);
  let quote = 0;
  for (const bag of bags) {
    const value = await quoteBagSol(bag.mint, bag.amount);
    if (value > quote) quote = value;
  }
  token.bagQuoteSol = quote;
  if (token.mint) {
    try {
      const dex = await dexPairStats(token.mint);
      if (dex) {
        token.snipers = {
          ...token.snipers,
          buys: Math.max(token.snipers.buys || 0, dex.buys),
          sells: Math.max(token.snipers.sells || 0, dex.sells),
          volumeSol: Math.max(token.snipers.volumeSol || 0, dex.volumeSol),
          buySol: Math.max(token.snipers.buySol || 0, dex.buySol),
        };
      }
    } catch {
      /* hop still runs */
    }
  }
  const hot = tokenDumpHot(token, quote);
  const due = (token.dumpAt || 0) <= Date.now();
  if (!hot && !due) return;
  if (hot) {
    try {
      await sellAllHoldings(kp, token, { minSol: 0 });
    } catch {
      /* hop leftover anyway so the scheduled run continues */
    }
  }
  token.dumped = true;
  await relayToNext(c, kp, token, keys);
}

async function closeOutCampaign(c: Campaign, opts?: { limit?: number; minSol?: number; only?: string[] }): Promise<number> {
  const keys = await loadKeys();
  const owner = ownerAddress();
  if (!isSolanaAddress(owner)) return 0;
  const to = new PublicKey(owner);
  const limit = Math.max(1, Math.min(80, opts?.limit ?? 8));
  let sent = 0;
  let moved = 0;
  const scratch: CampaignToken = {
    id: "drain",
    kind: "random",
    theme: "neon",
    name: "Launch",
    symbol: "LAUNCH",
    blurb: "",
    website: "",
    x: "",
    telegram: "",
    teamBps: 300,
    status: "failed",
    scheduledAt: 0,
    image: "",
    uri: "",
    sigs: [],
    teamTokens: 0,
    curveTokens: 0,
    snipers: emptySnipers(),
  };
  const only = opts?.only?.length ? new Set(opts.only) : null;
  for (const [pk, secret] of Object.entries(keys)) {
    if (sent >= limit) break;
    if (!pk || !secret || pk === owner) continue;
    if (only && !only.has(pk)) continue;
    let kp: Keypair;
    try {
      kp = walletOf(secret);
      if (kp.publicKey.toBase58() !== pk) continue;
    } catch {
      continue;
    }
    const token = c.tokens.find((t) => t.wallet === pk) || scratch;
    try {
      await sellAllHoldings(kp, token, { minSol: opts?.minSol ?? DUMP_MIN_SOL });
    } catch {
      /* SOL still moves */
    }
    if (token !== scratch) token.dumped = true;
    const bal = await connection().getBalance(kp.publicKey, "confirmed").catch(() => 0);
    if (bal <= RELAY_FEE_LAMPORTS) continue;
    try {
      const relayed = await relayAll(kp, to);
      if (relayed.sig && token !== scratch) token.sigs.push(relayed.sig);
      const sol = relayed.lamports / LAMPORTS_PER_SOL;
      if (token !== scratch) token.returnedSol = (token.returnedSol || 0) + sol;
      c.returnedSol = (c.returnedSol || 0) + sol;
      moved += sol;
      sent += 1;
    } catch {
      /* next wallet */
    }
  }
  await saveCampaign(c);
  return moved;
}

/** Pause leftover hops and pull every Tools launch wallet we can sign into owner. */
export async function drainCampaignWalletsToOwner(opts?: { limit?: number; only?: string[] }): Promise<{ movedSol: number }> {
  const c = await loadCampaign();
  const movedSol = await closeOutCampaign(c, { limit: opts?.limit ?? 80, minSol: DUMP_MIN_SOL, only: opts?.only });
  return { movedSol };
}

function pendingDump(c: Campaign): CampaignToken | undefined {
  return c.tokens.find((t) => t.status === "live" && !t.dumped && Boolean(t.wallet));
}

function nextWorkAt(c: Campaign): number | undefined {
  const dump = pendingDump(c);
  const next = c.tokens.find((t) => t.status === "queued" || t.status === "funding" || t.status === "launching");
  const times = [dump?.dumpAt, next?.scheduledAt].filter((n): n is number => Boolean(n));
  return times.length ? Math.min(...times) : undefined;
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
    createdOn: "https://www.meteora.ag",
  });
  const pinnedUri = pinned?.uri || "";
  const uri =
    pinnedUri && isTokenMetaUri(pinnedUri) && !/spha-meta\.json/i.test(pinnedUri) ? pinnedUri : metaUrl(token.id);
  return { image: pinned?.image || image, uri };
}

async function launchOne(c: Campaign, token: CampaignToken): Promise<CampaignToken> {
  const treasury = await loadTreasuryKeypair();
  if (!treasury) {
    token.status = "failed";
    token.error = "Treasury cannot sign. Save the treasury project key in Wallets.";
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
      await returnWalletToOwner(c, walletKp, token);
      return token;
    }
    token.status = "failed";
    token.error = msg;
    return token;
  }

  token.status = "launching";
  const mintKp = Keypair.generate();
  const mintPk = mintKp.publicKey.toBase58();
  const art = await pinMeta(token);
  token.image = art.image;
  token.uri = art.uri;
  const dbc = await import("../launch/dbc");
  try {
    const built = await dbc.buildHookedDbcLaunchTx({
      payer: walletKp.publicKey.toBase58(),
      mint: mintPk,
      name: token.name,
      symbol: token.symbol,
      uri: token.uri.slice(0, 255),
      curveTokens: token.curveTokens,
      feeClaimer: owner,
      leftoverReceiver: owner,
      creatorTradingFeePercentage: 0,
    });
    const launchSig = await signSend(built.transaction, [
      walletKp,
      mintKp,
      Keypair.fromSecretKey(b64ToBytes(built.configSecret)),
    ]);
    token.sigs.push(launchSig);
    const landed = await waitForSignature(launchSig, 40);
    const pool = await dbc.waitForDbcPool(mintPk, 40, built.config);
    if (!pool?.publicKey) {
      throw new Error(
        landed.ok
          ? "Launch sent but the pair never appeared on-chain."
          : `Launch did not confirm (${landed.err || "timeout"}).`,
      );
    }
    token.mint = mintPk;
    token.config = built.config;
    try {
      token.pool = dbc.derivedDbcPoolAddress(mintPk, built.config);
    } catch {
      token.pool = pool.publicKey.toBase58();
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Launch failed.";
    const left = await conn.getBalance(walletKp.publicKey, "confirmed").catch(() => 0);
    if (isInsufficientFunds(msg)) {
      markDry(c, token, left / LAMPORTS_PER_SOL, msg);
      await returnWalletToOwner(c, walletKp, token);
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
    const firstBuy = {
      mint: token.mint!,
      owner: walletKp.publicKey.toBase58(),
      side: "buy" as const,
      sol: BATCH_FIRST_BUY_SOL,
      pool: token.pool,
      minOutLamports: 1,
    };
    let buy = await dbc.buildDbcTradeTx(firstBuy);
    for (let i = 0; i < 8 && !buy.ok; i++) {
      await new Promise((r) => setTimeout(r, 500));
      buy = await dbc.buildDbcTradeTx(firstBuy);
    }
    if (buy.ok) {
      const buySig = await signSend(buy.transaction, [walletKp]);
      token.sigs.push(buySig);
      await waitForSignature(buySig, 24);
    }
  } catch {
    /* Dexscreener indexes faster after a first swap; pool can still be live without it */
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
  token.dumpAt = token.launchedAt + DUMP_DELAY_MS;
  token.dumped = false;
  token.error = undefined;
  return token;
}

function nextQueued(c: Campaign, now: number): CampaignToken | undefined {
  return c.tokens
    .filter((t) => (t.status === "queued" || t.status === "funding" || t.status === "launching") && t.scheduledAt <= now)
    .sort((a, b) => a.scheduledAt - b.scheduledAt)[0];
}

async function finishTickState(c: Campaign) {
  const next = c.tokens.find((t) => t.status === "queued" || t.status === "funding" || t.status === "launching");
  const dump = pendingDump(c);
  c.nextAt = nextWorkAt(c);
  if (!next && !dump && c.status === "running") {
    c.status = "done";
    c.nextAt = undefined;
    await closeOutCampaign(c, { limit: 8 });
    return;
  }
  await saveCampaign(c);
}

export async function tickBatchLaunch(opts?: { limit?: number }): Promise<{
  ran: number;
  failed: number;
  status: CampaignStatus;
  nextAt?: number;
}> {
  const c0 = await loadCampaign();
  if (c0.status !== "running") {
    if (c0.status === "stopped" || c0.status === "done") {
      try {
        await withLaunchLock(async () => {
          const c = await loadCampaign();
          await closeOutCampaign(c, { limit: 6 });
        });
      } catch {
        /* desk still loads */
      }
    }
    return { ran: 0, failed: 0, status: c0.status, nextAt: c0.nextAt };
  }
  const locked = await withLaunchLock(async () => {
    let ran = 0;
    let failed = 0;
    const limit = Math.max(1, Math.min(3, opts?.limit ?? 2));
    for (let i = 0; i < limit; i++) {
      const c = await loadCampaign();
      if (c.status !== "running") break;
      const dump = pendingDump(c);
      if (dump) {
        const idx = c.tokens.findIndex((t) => t.id === dump.id);
        try {
          await dumpAndAdvance(c, dump);
          if (idx >= 0) c.tokens[idx] = dump;
        } catch (e) {
          dump.error = e instanceof Error ? e.message : "Dump failed.";
          dump.dumped = true;
          if (idx >= 0) c.tokens[idx] = dump;
        }
        await finishTickState(c);
        if (!dump.dumped) break;
        if (c.dry || c.status !== "running") break;
        continue;
      }
      const now = Date.now();
      const token = nextQueued(c, now);
      if (!token) {
        await finishTickState(c);
        break;
      }
      const idx = c.tokens.findIndex((t) => t.id === token.id);
      try {
        const live = await launchOne(c, token);
        if (idx >= 0) c.tokens[idx] = live;
        if (live.status === "live") {
          ran += 1;
          c.lastLaunchAt = Date.now();
          await saveCampaign(c);
        } else failed += 1;
        c.lastLaunchAt = Date.now();
        await finishTickState(c);
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
        txns?: { h24?: { buys?: number; sells?: number }; m5?: { buys?: number; sells?: number } };
        volume?: { h24?: number };
        priceUsd?: string | number;
        priceNative?: string | number;
      }[];
    };
    const pairs = Array.isArray(j.pairs) ? j.pairs : [];
    const pair =
      pairs.find((p) => String(p.chainId || "").toLowerCase().startsWith("sol")) || pairs[0];
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
    return {
      buys,
      sells,
      volumeSol,
      buySol: flow > 0 ? volumeSol * (buys / flow) : volumeSol,
    };
  } catch {
    return null;
  }
}

export async function refreshSnipers(limit = 12): Promise<number> {
  const c = await loadCampaign();
  const live = c.tokens.filter((t) => t.status === "live" && t.mint);
  if (!live.length) return 0;
  const s = await readyState();
  const book = s.launch;
  const dbc = await import("../launch/dbc").catch(() => null);
  const slice = live
    .slice()
    .sort((a, b) => (a.snipers.volumeSol || 0) - (b.snipers.volumeSol || 0) || (b.launchedAt || 0) - (a.launchedAt || 0))
    .slice(0, Math.max(1, Math.min(24, limit)));
  const keys = await loadKeys().catch(() => ({} as KeyPack));
  await Promise.all(
    slice.map(async (token) => {
      const coin = book?.coins?.find((x) => x.mint === token.mint);
      let curveSol = token.snipers.curveSol || 0;
      if (dbc && token.mint) {
        try {
          curveSol = await dbc.dbcPoolQuoteSol(token.mint);
        } catch {
          /* keep last */
        }
      }
      const local = sniperStats(coin, curveSol);
      const dex = token.mint ? await dexPairStats(token.mint) : null;
      token.snipers = {
        buys: Math.max(local.buys, dex?.buys || 0),
        sells: Math.max(local.sells, dex?.sells || 0),
        volumeSol: Math.max(local.volumeSol, dex?.volumeSol || 0),
        buySol: Math.max(local.buySol, dex?.buySol || 0),
        snipers: Math.max(local.snipers, (dex?.buys || 0) + (dex?.sells || 0) ? 1 : 0),
        curveSol,
      };
      if (!token.dumped && token.wallet && keys[token.wallet] && token.mint) {
        try {
          const bags = await listWalletBags(token.wallet);
          let quote = 0;
          for (const bag of bags) {
            const value = await quoteBagSol(bag.mint, bag.amount);
            if (value > quote) quote = value;
          }
          token.bagQuoteSol = quote;
        } catch {
          /* desk still loads */
        }
      }
    }),
  );
  await saveCampaign(c);
  return slice.length;
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
    returnedSol: Number(c.returnedSol) || 0,
  };
}
