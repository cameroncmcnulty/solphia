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
  type TokenKind,
} from "./identities";
import {
  DEFAULT_SCRAMBLER,
  jitterDelayMs,
  jitterLamports,
  buildHopForest,
  mergeVault,
  normalizeScrambler,
  pickWarmupMint,
  vaultSecrets,
  warmupCycles,
  warmupSol,
  WARMUP_KEEP_SOL,
  type ScramblerOpts,
  type WalletVault,
} from "./scrambler";
import { quoteOpenSwap, buildSwapTx } from "../pair/jupiter";

export type CampaignStatus = "idle" | "running" | "paused" | "done" | "stopped";
export type TokenStatus = "queued" | "scrambling" | "warming" | "funding" | "launching" | "live" | "failed" | "stopped";

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
  stopped?: boolean;
  scramble?: TokenScramble;
};

export type ScrambleHop = {
  pk: string;
  role: "hop" | "final";
  hopIndex: number;
  shared?: boolean;
  delayUntil?: number;
  sentAt?: number;
  sig?: string;
  lamports?: number;
};

export type TokenScramble = {
  pathId: string;
  topology: "linear" | "branch";
  hops: ScrambleHop[];
  cursor: number;
  nextAt?: number;
  funded?: boolean;
  warmupEnabled?: boolean;
  warmupCycles?: number;
  warmupDone?: number;
  warmupMint?: string;
  warmupNextAt?: number;
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
  scrambler?: ScramblerOpts;
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
const FILE = path.join(process.cwd(), "data", "batch-launch-v2.json");
const KEYS_FILE = path.join(process.cwd(), "data", "batch-launch-v2-keys.json");
const TICKERS_FILE = path.join(process.cwd(), "data", "batch-launch-tickers.json");
const ARCHIVE_FILE = path.join(process.cwd(), "data", "batch-launch-v2-archive.json");
const ARCHIVE_MAX = 2000;

export type LaunchArchiveRow = {
  id: string;
  campaignId: string;
  kind: TokenKind;
  theme: string;
  name: string;
  symbol: string;
  mint: string;
  wallet?: string;
  pool?: string;
  config?: string;
  teamBps: number;
  launchedAt?: number;
  snipers: SniperStats;
  bagQuoteSol?: number;
  dumpSol?: number;
  returnedSol?: number;
  status: TokenStatus;
  error?: string;
  image?: string;
  blurb?: string;
};

function leftoverDest(): string {
  const treasury = treasuryAddress();
  if (isSolanaAddress(treasury)) return treasury;
  return ownerAddress();
}

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
    scrambler: DEFAULT_SCRAMBLER,
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
    const raw = await kvGetJson(KEYS.batchLaunchV2).catch(() => null);
    if (raw && typeof raw === "object") return normalizeCampaign(raw);
  }
  const file = await readJsonFile<Campaign>(FILE);
  if (file) return normalizeCampaign(file);
  return emptyCampaign();
}

export async function saveCampaign(c: Campaign): Promise<void> {
  const slim = publicCampaign(c);
  if (durableConfigured()) await kvSetJson(KEYS.batchLaunchV2, slim).catch(() => false);
  await writeJsonFile(FILE, slim).catch(() => undefined);
  await archiveCampaign(slim).catch(() => undefined);
}

function archiveRow(c: Campaign, t: CampaignToken): LaunchArchiveRow | null {
  if (!isSolanaAddress(t.mint || "")) return null;
  return {
    id: t.id,
    campaignId: c.id || "",
    kind: t.kind,
    theme: t.theme,
    name: t.name,
    symbol: t.symbol,
    mint: t.mint!,
    wallet: t.wallet,
    pool: t.pool,
    config: t.config,
    teamBps: t.teamBps,
    launchedAt: t.launchedAt,
    snipers: t.snipers || emptySnipers(),
    bagQuoteSol: t.bagQuoteSol,
    dumpSol: t.dumpSol,
    returnedSol: t.returnedSol,
    status: t.status,
    error: t.error,
    image: t.image,
    blurb: t.blurb,
  };
}

export async function loadLaunchArchive(): Promise<LaunchArchiveRow[]> {
  let rows: LaunchArchiveRow[] = [];
  if (durableConfigured()) {
    const raw = await kvGetJson(KEYS.batchLaunchV2Archive).catch(() => null);
    if (Array.isArray(raw)) rows = raw as LaunchArchiveRow[];
  }
  if (!rows.length) {
    const file = await readJsonFile<LaunchArchiveRow[]>(ARCHIVE_FILE);
    if (Array.isArray(file)) rows = file;
  }
  return rows.filter((r) => r && isSolanaAddress(r.mint || ""));
}

async function saveLaunchArchive(rows: LaunchArchiveRow[]): Promise<void> {
  const slim = rows.slice(0, ARCHIVE_MAX);
  if (durableConfigured()) await kvSetJson(KEYS.batchLaunchV2Archive, slim).catch(() => false);
  await writeJsonFile(ARCHIVE_FILE, slim).catch(() => undefined);
}

export async function archiveCampaign(c: Campaign): Promise<LaunchArchiveRow[]> {
  const incoming = (c.tokens || []).map((t) => archiveRow(c, t)).filter((r): r is LaunchArchiveRow => Boolean(r));
  if (!incoming.length) return loadLaunchArchive();
  const prev = await loadLaunchArchive();
  const map = new Map<string, LaunchArchiveRow>();
  for (const row of prev) map.set(row.mint, row);
  for (const row of incoming) {
    const old = map.get(row.mint);
    map.set(row.mint, {
      ...old,
      ...row,
      snipers: row.snipers?.buys || row.snipers?.volumeSol ? row.snipers : old?.snipers || row.snipers,
      launchedAt: row.launchedAt || old?.launchedAt,
    });
  }
  const next = [...map.values()].sort((a, b) => (b.launchedAt || 0) - (a.launchedAt || 0)).slice(0, ARCHIVE_MAX);
  await saveLaunchArchive(next);
  return next;
}

function asVault(raw: unknown): WalletVault {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: WalletVault = {};
  for (const [pk, row] of Object.entries(raw as Record<string, unknown>)) {
    if (!pk) continue;
    if (typeof row === "string" && row) {
      out[pk] = { secret: row, role: "final", createdAt: Date.now() };
      continue;
    }
    if (row && typeof row === "object" && typeof (row as { secret?: string }).secret === "string") {
      const r = row as WalletVault[string];
      out[pk] = {
        secret: r.secret,
        role: r.role === "hop" ? "hop" : "final",
        createdAt: Number(r.createdAt) || Date.now(),
        campaignId: r.campaignId,
        tokenId: r.tokenId,
        pathId: r.pathId,
        hopIndex: Number(r.hopIndex) || 0,
      };
    }
  }
  return out;
}

async function loadVault(): Promise<WalletVault> {
  const fromKv = durableConfigured() ? await kvGetJson(KEYS.batchLaunchV2Keys).catch(() => null) : null;
  const fromFile = await readJsonFile<unknown>(KEYS_FILE);
  return mergeVault(asVault(fromFile), asVault(fromKv));
}

async function loadKeys(): Promise<KeyPack> {
  return vaultSecrets(await loadVault());
}

/** Append-only. Existing secrets always win. Empty packs cannot wipe hop wallets. */
async function saveVault(pack: WalletVault): Promise<void> {
  const prev = await loadVault();
  const merged = mergeVault(prev, pack);
  if (durableConfigured()) await kvSetJson(KEYS.batchLaunchV2Keys, merged).catch(() => false);
  await writeJsonFile(KEYS_FILE, merged).catch(() => undefined);
}

async function saveKeys(pack: KeyPack): Promise<void> {
  const incoming: WalletVault = {};
  for (const [pk, secret] of Object.entries(pack || {})) {
    if (pk && secret) incoming[pk] = { secret, role: "final", createdAt: Date.now() };
  }
  await saveVault(incoming);
}

async function rememberWallet(opts: {
  kp: Keypair;
  role: "hop" | "final";
  campaignId?: string;
  tokenId?: string;
  pathId?: string;
  hopIndex?: number;
}): Promise<string> {
  const pk = opts.kp.publicKey.toBase58();
  await saveVault({
    [pk]: {
      secret: bytesToB64(opts.kp.secretKey),
      role: opts.role,
      createdAt: Date.now(),
      campaignId: opts.campaignId,
      tokenId: opts.tokenId,
      pathId: opts.pathId,
      hopIndex: opts.hopIndex,
    },
  });
  return pk;
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

/** Tools launch wallets we hold secrets for. Used by EXTRACT TO TREASURY. */
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
    scrambler: normalizeScrambler(o.scrambler),
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
    status: (
      ["queued", "scrambling", "warming", "funding", "launching", "live", "failed", "stopped"] as const
    ).includes(o.status as TokenStatus)
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
    stopped: Boolean(o.stopped),
    scramble: normalizeScramble(o.scramble),
  };
}

function normalizeScramble(raw: unknown): TokenScramble | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const o = raw as Partial<TokenScramble>;
  const hops = Array.isArray(o.hops)
    ? o.hops
        .filter((h) => h && typeof h.pk === "string")
        .map((h) => ({
          pk: h.pk,
          role: h.role === "final" ? ("final" as const) : ("hop" as const),
          hopIndex: Number(h.hopIndex) || 0,
          shared: Boolean(h.shared),
          delayUntil: Number(h.delayUntil) || undefined,
          sentAt: Number(h.sentAt) || undefined,
          sig: typeof h.sig === "string" ? h.sig : undefined,
          lamports: Number(h.lamports) || undefined,
        }))
    : [];
  if (!hops.length && !o.pathId) return undefined;
  return {
    pathId: typeof o.pathId === "string" ? o.pathId : "",
    topology: o.topology === "branch" ? "branch" : "linear",
    hops,
    cursor: Math.max(0, Number(o.cursor) || 0),
    nextAt: Number(o.nextAt) || undefined,
    funded: Boolean(o.funded),
    warmupEnabled: Boolean(o.warmupEnabled),
    warmupCycles: Number(o.warmupCycles) || 0,
    warmupDone: Number(o.warmupDone) || 0,
    warmupMint: typeof o.warmupMint === "string" ? o.warmupMint : undefined,
    warmupNextAt: Number(o.warmupNextAt) || undefined,
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
  const remaining =
    camp.tokens.filter((t) =>
      t.status === "queued" ||
      t.status === "scrambling" ||
      t.status === "warming" ||
      t.status === "funding" ||
      t.status === "launching",
    ).length || (camp.status === "idle" ? camp.narrative + camp.random || DEFAULT_NARRATIVE + DEFAULT_RANDOM : 0);
  const needSol = camp.relayFunded ? 0 : BATCH_RELAY_SOL * 1.16;
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
  scrambler?: Partial<ScramblerOpts>;
}): Promise<{ ok: true; campaign: Campaign; fuel: CampaignFuel } | { ok: false; error: string; fuel: CampaignFuel }> {
  const live = await loadCampaign();
  if (live.status === "running") {
    return { ok: false, error: "A campaign is already running. Pause or stop it first.", fuel: await campaignFuel(live) };
  }
  try {
    await archiveCampaign(live);
  } catch {
    /* archive is best-effort */
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
    scrambler: normalizeScrambler(opts?.scrambler),
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
      error: `Treasury needs about ${(BATCH_RELAY_SOL * 1.16).toFixed(3)} SOL plus ${fuel.keepSol.toFixed(3)} SOL kept to seed the scrambler (0.5 SOL ±15%). It holds ${fuel.treasurySol.toFixed(3)} SOL. Remainder hops through new keypairs to the next wallet until a launch fails on insufficient funds.`,
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
  try {
    await archiveCampaign(c);
  } catch {
    /* keep keys so leftover SOL can still be extracted */
  }
  const empty = emptyCampaign();
  await saveCampaign(empty);
  return empty;
}

async function withLaunchLock<T>(fn: () => Promise<T>): Promise<T | { skipped: true }> {
  const got = await kvSetNxEx(KEYS.batchLaunchV2Lock, { at: Date.now() }, LOCK_TTL_S);
  if (got === false && durableConfigured()) return { skipped: true };
  try {
    return await fn();
  } finally {
    await kvDel(KEYS.batchLaunchV2Lock).catch(() => undefined);
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

async function ensureWallet(token: CampaignToken, keys: KeyPack, campaignId?: string): Promise<Keypair> {
  if (token.wallet && keys[token.wallet]) return walletOf(keys[token.wallet]!);
  const kp = Keypair.generate();
  const pk = await rememberWallet({
    kp,
    role: "final",
    campaignId,
    tokenId: token.id,
    hopIndex: token.scramble?.hops.length || 0,
  });
  token.wallet = pk;
  keys[pk] = bytesToB64(kp.secretKey);
  return kp;
}

async function kpOf(pk: string, keys: KeyPack): Promise<Keypair | null> {
  const secret = keys[pk];
  if (!secret) {
    const vault = await loadVault();
    if (!vault[pk]?.secret) return null;
    keys[pk] = vault[pk]!.secret;
  }
  try {
    const kp = walletOf(keys[pk]!);
    return kp.publicKey.toBase58() === pk ? kp : null;
  } catch {
    return null;
  }
}

function usedLamportsOf(token: CampaignToken): Set<number> {
  const used = new Set<number>();
  for (const hop of token.scramble?.hops || []) {
    if (hop.lamports) used.add(hop.lamports);
  }
  return used;
}

async function armScramble(c: Campaign, token: CampaignToken, keys: KeyPack): Promise<TokenScramble> {
  if (token.scramble?.hops.length) return token.scramble;
  const opts = normalizeScrambler(c.scrambler);
  const plans = buildHopForest([token.id], {
    hopsMin: opts.hopsMin,
    hopsMax: opts.hopsMax,
    branch: Boolean(opts.branch && c.tokens.length > 1),
  });
  const plan = plans[0]!;
  const hops: ScrambleHop[] = [];
  for (const node of plan.nodes) {
    if (node.role === "final") {
      const kp = await ensureWallet(token, keys, c.id);
      hops.push({ pk: kp.publicKey.toBase58(), role: "final", hopIndex: node.hopIndex, shared: false });
    } else {
      const kp = Keypair.generate();
      const pk = await rememberWallet({
        kp,
        role: "hop",
        campaignId: c.id,
        tokenId: token.id,
        pathId: plan.pathId,
        hopIndex: node.hopIndex,
      });
      keys[pk] = bytesToB64(kp.secretKey);
      hops.push({ pk, role: "hop", hopIndex: node.hopIndex, shared: node.shared });
    }
  }
  const scramble: TokenScramble = {
    pathId: plan.pathId,
    topology: plan.topology,
    hops,
    cursor: 0,
    nextAt: Date.now(),
    funded: false,
    warmupEnabled: opts.warmup,
    warmupCycles: opts.warmup ? warmupCycles() : 0,
    warmupDone: 0,
    warmupMint: opts.warmup ? pickWarmupMint(opts.warmupMints) || undefined : undefined,
  };
  token.scramble = scramble;
  token.status = "scrambling";
  return scramble;
}

async function hopTransfer(from: Keypair, to: PublicKey, used: Set<number>): Promise<{ sig: string; lamports: number }> {
  const bal = await connection().getBalance(from.publicKey, "confirmed");
  const maxSend = bal - RELAY_FEE_LAMPORTS;
  if (maxSend < 1) return { sig: "", lamports: Math.max(0, bal) };
  let amount = Math.min(maxSend, jitterLamports(maxSend, { used }));
  if (amount < 1) amount = maxSend;
  const sig = await sendSol(from, to, amount);
  return { sig, lamports: amount };
}

async function sourceForHop(
  c: Campaign,
  token: CampaignToken,
  keys: KeyPack,
): Promise<Keypair | null> {
  const scramble = token.scramble;
  if (!scramble) return null;
  if (scramble.cursor <= 0) {
    if (c.relayFunded) {
      const prevs = c.tokens.filter(
        (t) =>
          t.wallet &&
          t.wallet !== token.wallet &&
          keys[t.wallet] &&
          (t.status === "live" || t.status === "failed" || t.status === "stopped") &&
          t.dumped,
      );
      for (const prev of [...prevs].reverse()) {
        const prevKp = await kpOf(prev.wallet!, keys);
        if (!prevKp) continue;
        const prevBal = await connection().getBalance(prevKp.publicKey, "confirmed");
        if (prevBal > RELAY_FEE_LAMPORTS + 1_000_000) return prevKp;
      }
      return null;
    }
    return loadTreasuryKeypair();
  }
  const prevHop = scramble.hops[scramble.cursor - 1];
  if (!prevHop?.pk) return null;
  return kpOf(prevHop.pk, keys);
}

async function advanceScramble(c: Campaign, token: CampaignToken): Promise<boolean> {
  const keys = await loadKeys();
  const scramble = await armScramble(c, token, keys);
  if (scramble.funded) return true;
  if ((scramble.nextAt || 0) > Date.now()) return false;
  const dest = scramble.hops[scramble.cursor];
  if (!dest) {
    scramble.funded = true;
    return true;
  }
  const from = await sourceForHop(c, token, keys);
  if (!from) {
    token.error = "Scrambler cannot sign the next hop.";
    return false;
  }
  const to = new PublicKey(dest.pk);
  if (from.publicKey.equals(to)) {
    scramble.cursor += 1;
    scramble.nextAt = Date.now();
    return scramble.cursor >= scramble.hops.length;
  }
  const used = usedLamportsOf(token);
  try {
    let relayed: { sig: string; lamports: number };
    if (scramble.cursor <= 0 && from.publicKey.toBase58() === treasuryAddress()) {
      const treasBal = await connection().getBalance(from.publicKey, "confirmed");
      const cap = treasBal - TREASURY_KEEP_LAMPORTS - RELAY_FEE_LAMPORTS;
      if (cap < 20_000_000) {
        markDry(c, token, treasBal / LAMPORTS_PER_SOL, "Treasury cannot seed the scrambler.");
        return false;
      }
      const seed = Math.min(cap, jitterLamports(BATCH_RELAY_LAMPORTS, { used }));
      const sig = await sendSol(from, to, seed);
      relayed = { sig, lamports: seed };
      c.relayFunded = true;
    } else {
      relayed = await hopTransfer(from, to, used);
    }
    dest.sig = relayed.sig;
    dest.lamports = relayed.lamports;
    dest.sentAt = Date.now();
    if (relayed.sig) token.sigs.push(relayed.sig);
    measureRelay(c, relayed.lamports / LAMPORTS_PER_SOL);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Hop failed.";
    const left = await connection().getBalance(from.publicKey, "confirmed").catch(() => 0);
    if (isInsufficientFunds(msg)) {
      markDry(c, token, left / LAMPORTS_PER_SOL, msg);
      await returnWalletToOwner(c, from, token);
      return false;
    }
    token.error = msg;
    return false;
  }
  scramble.cursor += 1;
  const opts = normalizeScrambler(c.scrambler);
  const delays = new Set<number>();
  for (const hop of scramble.hops) if (hop.delayUntil) delays.add(hop.delayUntil);
  if (scramble.cursor >= scramble.hops.length) {
    scramble.funded = true;
    scramble.nextAt = Date.now();
    if (scramble.warmupEnabled && (scramble.warmupCycles || 0) > 0) {
      token.status = "warming";
      scramble.warmupNextAt = Date.now() + jitterDelayMs(8_000, 45_000, delays);
    } else {
      token.status = "funding";
    }
    return true;
  }
  const wait = jitterDelayMs(opts.delayMinMs, opts.delayMaxMs, delays);
  scramble.nextAt = Date.now() + wait;
  dest.delayUntil = scramble.nextAt;
  token.status = "scrambling";
  return false;
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
  const dest = leftoverDest();
  if (!isSolanaAddress(dest) || from.publicKey.toBase58() === dest) {
    const left = await connection().getBalance(from.publicKey, "confirmed").catch(() => 0);
    measureRelay(c, left / LAMPORTS_PER_SOL);
    return;
  }
  try {
    const relayed = await relayAll(from, new PublicKey(dest));
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
  const next = c.tokens.find(
    (t) =>
      (t.status === "queued" || t.status === "scrambling" || t.status === "funding" || t.status === "warming") &&
      t.id !== token.id &&
      !t.stopped,
  );
  if (!next) {
    await returnWalletToOwner(c, from, token);
    return;
  }
  await armScramble(c, next, keys);
  const first = next.scramble?.hops[0];
  const destPk = first?.pk || next.wallet;
  if (!destPk || destPk === from.publicKey.toBase58()) {
    await returnWalletToOwner(c, from, token);
    return;
  }
  try {
    const used = usedLamportsOf(token);
    const relayed = await hopTransfer(from, new PublicKey(destPk), used);
    if (relayed.sig) token.sigs.push(relayed.sig);
    if (first) {
      first.sig = relayed.sig;
      first.lamports = relayed.lamports;
      first.sentAt = Date.now();
    }
    if (next.scramble && (next.scramble.cursor || 0) === 0) {
      next.scramble.cursor = 1;
      const opts = normalizeScrambler(c.scrambler);
      next.scramble.nextAt = Date.now() + jitterDelayMs(opts.delayMinMs, opts.delayMaxMs);
      next.status = "scrambling";
    }
    c.relayFunded = true;
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
        if (minSol > 0 && value < minSol) continue;
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

function tokenWalletPks(token: CampaignToken): string[] {
  const pks = new Set<string>();
  if (token.wallet) pks.add(token.wallet);
  for (const hop of token.scramble?.hops || []) if (hop.pk) pks.add(hop.pk);
  return [...pks];
}

async function randomWarmupMint(): Promise<string | null> {
  try {
    const r = await fetch("https://api.dexscreener.com/token-boosts/top/v1", {
      cache: "no-store",
      signal: AbortSignal.timeout(6_000),
      headers: { accept: "application/json" },
    });
    if (!r.ok) return null;
    const rows = (await r.json()) as { tokenAddress?: string; chainId?: string }[];
    const sol = (Array.isArray(rows) ? rows : [])
      .map((row) => row?.tokenAddress || "")
      .filter((m) => isSolanaAddress(m) && m !== SOL_MINT);
    if (!sol.length) return null;
    return sol[Math.floor(Math.random() * Math.min(sol.length, 12))] || null;
  } catch {
    return null;
  }
}

async function swapOpen(kp: Keypair, inputMint: string, outputMint: string, amount: number): Promise<string | null> {
  const quote = await quoteOpenSwap({ inputMint, outputMint, amount, slippageBps: DUMP_SLIPPAGE_BPS });
  if (!quote.ok) return null;
  const built = await buildSwapTx(quote.quote, kp.publicKey.toBase58(), { asLegacy: true, priority: "high" });
  if (!built.ok) return null;
  const sig = await broadcastB64(signPackedB64(built.transaction, [kp]), { skipPreflight: true });
  await waitForSignature(sig, 24);
  return sig;
}

async function runWarmupCycle(c: Campaign, token: CampaignToken): Promise<boolean> {
  const scramble = token.scramble;
  if (!scramble?.warmupEnabled) {
    token.status = "funding";
    return true;
  }
  if ((scramble.warmupNextAt || 0) > Date.now()) return false;
  const keys = await loadKeys();
  const kp = token.wallet ? await kpOf(token.wallet, keys) : null;
  if (!kp) {
    token.status = "funding";
    scramble.funded = true;
    return true;
  }
  const cycles = scramble.warmupCycles || 0;
  if ((scramble.warmupDone || 0) >= cycles) {
    token.status = "funding";
    return true;
  }
  const bal = await connection().getBalance(kp.publicKey, "confirmed");
  const keep = Math.floor(WARMUP_KEEP_SOL * LAMPORTS_PER_SOL) + RELAY_FEE_LAMPORTS;
  const spend = warmupSol();
  if (bal < keep + Math.floor(spend * LAMPORTS_PER_SOL)) {
    token.status = "funding";
    return true;
  }
  let mint = scramble.warmupMint || "";
  if (!isSolanaAddress(mint)) {
    mint = pickWarmupMint(normalizeScrambler(c.scrambler).warmupMints) || (await randomWarmupMint()) || "";
    scramble.warmupMint = mint || undefined;
  }
  if (!isSolanaAddress(mint)) {
    token.status = "funding";
    return true;
  }
  try {
    const buy = await swapOpen(kp, SOL_MINT, mint, spend);
    if (buy) token.sigs.push(buy);
    const bags = await listWalletBags(kp.publicKey.toBase58());
    const bag = bags.find((b) => b.mint === mint);
    if (bag && bag.amount > 0) {
      const sell = await swapOpen(kp, mint, SOL_MINT, bag.amount);
      if (sell) token.sigs.push(sell);
    }
  } catch {
    /* skip this cycle; never strand the launch wallet */
  }
  scramble.warmupDone = (scramble.warmupDone || 0) + 1;
  if ((scramble.warmupDone || 0) >= cycles) {
    token.status = "funding";
    return true;
  }
  scramble.warmupNextAt = Date.now() + jitterDelayMs(8_000, 45_000);
  token.status = "warming";
  return false;
}

/** Instantly dump this token's bags at 99% slippage and send every hop + final wallet to treasury. */
export async function stopToken(tokenId: string): Promise<Campaign> {
  const c = await loadCampaign();
  const token = c.tokens.find((t) => t.id === tokenId);
  if (!token) throw new Error("Token not found.");
  token.stopped = true;
  token.dumped = true;
  if (token.status !== "live") token.status = "stopped";
  await closeOutCampaign(c, { limit: 80, minSol: 0, only: tokenWalletPks(token) });
  return loadCampaign();
}

async function closeOutCampaign(c: Campaign, opts?: { limit?: number; minSol?: number; only?: string[] }): Promise<number> {
  const keys = await loadKeys();
  const dest = leftoverDest();
  if (!isSolanaAddress(dest)) return 0;
  const to = new PublicKey(dest);
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
    if (!pk || !secret || pk === dest) continue;
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

/** Pause leftover hops and pull every Tools launch wallet we can sign into treasury. */
export async function drainCampaignWalletsToTreasury(opts?: { limit?: number; only?: string[] }): Promise<{ movedSol: number }> {
  const c = await loadCampaign();
  const movedSol = await closeOutCampaign(c, { limit: opts?.limit ?? 80, minSol: DUMP_MIN_SOL, only: opts?.only });
  return { movedSol };
}

/** @deprecated leftover SOL goes to treasury. */
export const drainCampaignWalletsToOwner = drainCampaignWalletsToTreasury;

function pendingDump(c: Campaign): CampaignToken | undefined {
  return c.tokens.find((t) => t.status === "live" && !t.dumped && !t.stopped && Boolean(t.wallet));
}

function pendingScramble(c: Campaign, now: number): CampaignToken | undefined {
  return c.tokens.find((t) => {
    if (t.stopped) return false;
    if (t.status === "scrambling" && (t.scramble?.nextAt || 0) <= now && !t.scramble?.funded) return true;
    if (t.status === "warming" && (t.scramble?.warmupNextAt || 0) <= now) return true;
    if (t.status === "queued" && t.scheduledAt <= now && !t.scramble?.funded) return true;
    return false;
  });
}

function nextWorkAt(c: Campaign): number | undefined {
  const dump = pendingDump(c);
  const next = c.tokens.find(
    (t) =>
      !t.stopped &&
      (t.status === "queued" ||
        t.status === "scrambling" ||
        t.status === "warming" ||
        t.status === "funding" ||
        t.status === "launching"),
  );
  const times = [
    dump?.dumpAt,
    next?.scheduledAt,
    next?.scramble?.nextAt,
    next?.scramble?.warmupNextAt,
    ...c.tokens.map((t) => t.scramble?.nextAt),
    ...c.tokens.map((t) => t.scramble?.warmupNextAt),
  ].filter((n): n is number => Boolean(n));
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
  });
  const pinnedUri = pinned?.uri || "";
  const uri =
    pinnedUri && isTokenMetaUri(pinnedUri) && !/spha-meta\.json/i.test(pinnedUri) ? pinnedUri : metaUrl(token.id);
  return { image: pinned?.image || image, uri };
}

async function launchOne(c: Campaign, token: CampaignToken): Promise<CampaignToken> {
  if (!token.scramble?.funded) {
    const treasury = await loadTreasuryKeypair();
    if (!treasury) {
      token.status = "failed";
      token.error = "Treasury cannot sign. Save the treasury project key in Wallets.";
      return token;
    }
  }
  const owner = ownerAddress();
  if (!isSolanaAddress(owner)) {
    token.status = "failed";
    token.error = "Set the owner wallet so this launcher can send the 1% swap fee to owner.";
    return token;
  }
  const conn = connection();
  const keys = await loadKeys();
  if (!token.scramble?.funded) {
    await armScramble(c, token, keys);
    await advanceScramble(c, token);
    return token;
  }
  const walletKp = await ensureWallet(token, keys, c.id);
  const bal = await conn.getBalance(walletKp.publicKey, "confirmed");
  if (bal < 20_000_000) {
    token.status = "scrambling";
    token.error = "Final wallet is still waiting on the scrambler.";
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
    .filter(
      (t) =>
        !t.stopped &&
        (t.status === "queued" || t.status === "funding" || t.status === "launching" || t.scramble?.funded) &&
        t.scheduledAt <= now &&
        t.status !== "scrambling" &&
        t.status !== "warming" &&
        t.status !== "live" &&
        t.status !== "failed" &&
        t.status !== "stopped",
    )
    .sort((a, b) => a.scheduledAt - b.scheduledAt)[0];
}

async function finishTickState(c: Campaign) {
  const next = c.tokens.find(
    (t) =>
      !t.stopped &&
      (t.status === "queued" ||
        t.status === "scrambling" ||
        t.status === "warming" ||
        t.status === "funding" ||
        t.status === "launching"),
  );
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
      const hopTok = pendingScramble(c, now);
      if (hopTok) {
        const idx = c.tokens.findIndex((t) => t.id === hopTok.id);
        try {
          if (hopTok.status === "warming") await runWarmupCycle(c, hopTok);
          else await advanceScramble(c, hopTok);
          if (idx >= 0) c.tokens[idx] = hopTok;
        } catch (e) {
          hopTok.error = e instanceof Error ? e.message : "Scramble failed.";
          if (idx >= 0) c.tokens[idx] = hopTok;
        }
        await finishTickState(c);
        if (c.dry || c.status !== "running") break;
        continue;
      }
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

export async function previewV2Extract(): Promise<{
  dest: string;
  launchSol: number;
  movableSol: number;
  remainingSends: number;
  legs: { role: string; from: string; sol: number; keepSol: number; sendSol: number; hot: boolean; skip?: string }[];
  note: string;
}> {
  const dest = leftoverDest();
  const signers = await listCampaignSigners();
  const conn = connection();
  const legs: { role: string; from: string; sol: number; keepSol: number; sendSol: number; hot: boolean; skip?: string }[] = [];
  let launchSol = 0;
  for (const w of signers) {
    const lamports = await conn.getBalance(w.kp.publicKey, "confirmed").catch(() => 0);
    const sol = lamports / LAMPORTS_PER_SOL;
    const sendSol = Math.max(0, (lamports - RELAY_FEE_LAMPORTS) / LAMPORTS_PER_SOL);
    launchSol += sol;
    if (sol > 0.002 && w.pk !== dest) {
      legs.push({ role: "v2-wallet", from: w.pk, sol, keepSol: 0.002, sendSol, hot: true });
    }
  }
  legs.sort((a, b) => b.sendSol - a.sendSol);
  return {
    dest,
    launchSol,
    movableSol: legs.reduce((s, l) => s + l.sendSol, 0),
    remainingSends: legs.length,
    legs: legs.slice(0, 80),
    note: "V2 hop + final wallets only. Secrets stay saved for the incinerator. User PIN wallets stay.",
  };
}

export async function extractV2ToTreasury(): Promise<{ ok: boolean; movedSol: number; signatures: string[]; error?: string }> {
  const c = await loadCampaign();
  if (c.status === "running") {
    c.status = "paused";
    await saveCampaign(c);
  }
  try {
    const movedSol = (await drainCampaignWalletsToTreasury({ limit: 80 })).movedSol;
    return { ok: true, movedSol, signatures: [] };
  } catch (e) {
    return { ok: false, movedSol: 0, signatures: [], error: e instanceof Error ? e.message : "Extract failed." };
  }
}

export function campaignSummary(c: Campaign) {
  const live = c.tokens.filter((t) => t.status === "live").length;
  const failed = c.tokens.filter((t) => t.status === "failed").length;
  const queued = c.tokens.filter(
    (t) =>
      t.status === "queued" ||
      t.status === "scrambling" ||
      t.status === "warming" ||
      t.status === "funding" ||
      t.status === "launching",
  ).length;
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
