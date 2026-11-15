import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { Keypair } from "@solana/web3.js";
import { isSolanaAddress } from "../../security";
import { SITE_URL } from "../../config";
import { durableConfigured, kvGetJson, kvSetJson, KEYS } from "../../persist";
import { bytesToB64, b64ToBytes } from "../../solana/wire";
import { emptySnipers, type SniperStats } from "../snipers";
import { SNIPER_CREATED_ON } from "../identities";
import { SPHA_MINT_LEAD_MS } from "../../token/countdown";
import { buildV3Brand, type V3Brand, type V3Slice, type V3Theme } from "./idea";
import { v3HandleOf, v3WebsiteOf } from "./host";

const FILE = path.join(process.cwd(), "data", "batch-launch-v3.json");
const KEYS_FILE = path.join(process.cwd(), "data", "batch-launch-v3-keys.json");
const ARCHIVE_FILE = path.join(process.cwd(), "data", "batch-launch-v3-archive.json");

export const V3_FIRST_BUY_SOL = 0.05;
export const V3_MIN_LAUNCH_SOL = 0.2;
export const V3_KEEP_LAMPORTS = 2_000_000;
export const V3_MINT_LEAD_MS = SPHA_MINT_LEAD_MS;

export type V3Status = "idle" | "drafted" | "armed" | "minting" | "minted" | "live" | "stopped" | "failed";

export type V3SliceRow = V3Slice & { wallet: string };

export type V3Project = {
  id: string;
  idea: string;
  name: string;
  symbol: string;
  handle: string;
  blurb: string;
  about: string;
  howToBuy: string;
  roadmap: { title: string; body: string }[];
  themeId: string;
  colors: V3Theme;
  website: string;
  x: string;
  telegram: string;
  createdOn: string;
  supply: number;
  decimals: number;
  slices: V3SliceRow[];
  curveTokens: number;
  teamTokens: number;
  launchWallet: string;
  image: string;
  uri: string;
  launchAt: number;
  mintLeadMs: number;
  armedAt: number;
  status: V3Status;
  pendingMint?: string;
  mint?: string;
  config?: string;
  pool?: string;
  sigs: string[];
  error?: string;
  snipers: SniperStats;
  bagQuoteSol?: number;
  returnedSol?: number;
  createdAt: number;
  mintedAt?: number;
  revealedAt?: number;
  stoppedAt?: number;
  at: number;
};

export type V3KeyPack = Record<string, string>;

export type V3ArchiveRow = {
  id: string;
  name: string;
  symbol: string;
  mint?: string;
  launchWallet: string;
  website: string;
  supply: number;
  status: V3Status;
  snipers: SniperStats;
  launchedAt?: number;
  at: number;
};

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

function hexId(): string {
  return Math.random().toString(16).slice(2, 10);
}

export function artUrl(handle: string): string {
  return `${SITE_URL.replace(/\/$/, "")}/api/m/${encodeURIComponent(handle)}/art`;
}

export function metaUrl(handle: string): string {
  return `${SITE_URL.replace(/\/$/, "")}/api/m/${encodeURIComponent(handle)}/meta?ext=json`;
}

function emptyColors(): V3Theme {
  return { bg: "#0a0a0c", ink: "#f5f5f0", accent: "#e8ff47", muted: "#9a9a90", card: "#141418" };
}

export function emptyProject(): V3Project {
  return {
    id: "",
    idea: "",
    name: "",
    symbol: "",
    handle: "",
    blurb: "",
    about: "",
    howToBuy: "",
    roadmap: [],
    themeId: "meme",
    colors: emptyColors(),
    website: "",
    x: "",
    telegram: "",
    createdOn: SNIPER_CREATED_ON,
    supply: 0,
    decimals: 6,
    slices: [],
    curveTokens: 0,
    teamTokens: 0,
    launchWallet: "",
    image: "",
    uri: "",
    launchAt: 0,
    mintLeadMs: V3_MINT_LEAD_MS,
    armedAt: 0,
    status: "idle",
    sigs: [],
    snipers: emptySnipers(),
    createdAt: 0,
    at: 0,
  };
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function statusOf(v: unknown): V3Status {
  if (
    v === "idle" ||
    v === "drafted" ||
    v === "armed" ||
    v === "minting" ||
    v === "minted" ||
    v === "live" ||
    v === "stopped" ||
    v === "failed"
  ) {
    return v;
  }
  return "idle";
}

export function normalizeProject(raw: unknown): V3Project {
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const slices = Array.isArray(o.slices)
    ? o.slices
        .filter((s) => s && typeof s === "object")
        .map((s) => {
          const row = s as Record<string, unknown>;
          return {
            id: (row.id === "dev" || row.id === "community" || row.id === "treasury" || row.id === "lp" ? row.id : "lp") as V3SliceRow["id"],
            label: str(row.label) || "Slice",
            pct: str(row.pct) || "0%",
            bps: Math.max(0, Math.floor(num(row.bps))),
            tokens: Math.max(0, Math.floor(num(row.tokens))),
            note: str(row.note),
            wallet: str(row.wallet),
          };
        })
    : [];
  const colors = o.colors && typeof o.colors === "object" ? (o.colors as V3Theme) : emptyColors();
  const roadmap = Array.isArray(o.roadmap)
    ? o.roadmap
        .filter((r) => r && typeof r === "object")
        .map((r) => ({ title: str((r as { title?: string }).title), body: str((r as { body?: string }).body) }))
    : [];
  const snipers = o.snipers && typeof o.snipers === "object" ? { ...emptySnipers(), ...(o.snipers as SniperStats) } : emptySnipers();
  const symbol = str(o.symbol).replace(/^\$+/, "").toUpperCase().slice(0, 10);
  const handle = str(o.handle) || v3HandleOf(symbol);
  return {
    ...emptyProject(),
    id: str(o.id),
    idea: str(o.idea).slice(0, 280),
    name: str(o.name).slice(0, 32),
    symbol,
    handle,
    blurb: str(o.blurb).slice(0, 280),
    about: str(o.about).slice(0, 800),
    howToBuy: str(o.howToBuy).slice(0, 400),
    roadmap,
    themeId: str(o.themeId) || "meme",
    colors: {
      bg: str(colors.bg) || emptyColors().bg,
      ink: str(colors.ink) || emptyColors().ink,
      accent: str(colors.accent) || emptyColors().accent,
      muted: str(colors.muted) || emptyColors().muted,
      card: str(colors.card) || emptyColors().card,
    },
    website: str(o.website) || (symbol ? v3WebsiteOf(symbol) : ""),
    x: str(o.x),
    telegram: str(o.telegram),
    createdOn: SNIPER_CREATED_ON,
    supply: Math.max(0, Math.floor(num(o.supply))),
    decimals: 6,
    slices,
    curveTokens: Math.max(0, Math.floor(num(o.curveTokens))),
    teamTokens: Math.max(0, Math.floor(num(o.teamTokens))),
    launchWallet: str(o.launchWallet),
    image: str(o.image) || (handle ? artUrl(handle) : ""),
    uri: str(o.uri) || (handle ? metaUrl(handle) : ""),
    launchAt: num(o.launchAt),
    mintLeadMs: num(o.mintLeadMs) || V3_MINT_LEAD_MS,
    armedAt: num(o.armedAt),
    status: statusOf(o.status),
    pendingMint: str(o.pendingMint) || undefined,
    mint: str(o.mint) || undefined,
    config: str(o.config) || undefined,
    pool: str(o.pool) || undefined,
    sigs: Array.isArray(o.sigs) ? o.sigs.map((s) => str(s)).filter(Boolean).slice(0, 40) : [],
    error: str(o.error) || undefined,
    snipers,
    bagQuoteSol: num(o.bagQuoteSol) || undefined,
    returnedSol: num(o.returnedSol) || undefined,
    createdAt: num(o.createdAt),
    mintedAt: num(o.mintedAt) || undefined,
    revealedAt: num(o.revealedAt) || undefined,
    stoppedAt: num(o.stoppedAt) || undefined,
    at: num(o.at),
  };
}

export function publicProject(p: V3Project): V3Project {
  return normalizeProject(p);
}

export async function loadProject(): Promise<V3Project> {
  if (durableConfigured()) {
    const raw = await kvGetJson(KEYS.batchLaunchV3).catch(() => null);
    if (raw && typeof raw === "object") return normalizeProject(raw);
  }
  const file = await readJsonFile<V3Project>(FILE);
  if (file) return normalizeProject(file);
  return emptyProject();
}

/** True when this pubkey is the isolated V3 launch wallet. Skip house 1% so swaps do not skim into protocol. */
export async function isV3LaunchWallet(pk: string): Promise<boolean> {
  const clean = (pk || "").trim();
  if (!isSolanaAddress(clean)) return false;
  try {
    const p = await loadProject();
    return p.launchWallet === clean;
  } catch {
    return false;
  }
}

export async function saveProject(p: V3Project): Promise<void> {
  const slim = publicProject(p);
  slim.at = Date.now();
  if (durableConfigured()) await kvSetJson(KEYS.batchLaunchV3, slim).catch(() => false);
  await writeJsonFile(FILE, slim).catch(() => undefined);
  await archiveProject(slim).catch(() => undefined);
}

export async function loadKeys(): Promise<V3KeyPack> {
  let pack: V3KeyPack = {};
  if (durableConfigured()) {
    const raw = await kvGetJson(KEYS.batchLaunchV3Keys).catch(() => null);
    if (raw && typeof raw === "object") pack = { ...(raw as V3KeyPack) };
  }
  const file = await readJsonFile<V3KeyPack>(KEYS_FILE);
  if (file && typeof file === "object") pack = { ...file, ...pack };
  return pack;
}

/** Append-only. Existing secrets are never overwritten or wiped. */
export async function saveKeys(pack: V3KeyPack): Promise<void> {
  const prev = await loadKeys();
  const merged: V3KeyPack = { ...prev };
  for (const [pk, secret] of Object.entries(pack)) {
    if (!pk || !secret || merged[pk]) continue;
    merged[pk] = secret;
  }
  if (durableConfigured()) await kvSetJson(KEYS.batchLaunchV3Keys, merged).catch(() => false);
  await writeJsonFile(KEYS_FILE, merged).catch(() => undefined);
}

export function walletOf(secret: string): Keypair {
  return Keypair.fromSecretKey(b64ToBytes(secret));
}

function freshWallet(): { pk: string; secret: string } {
  const kp = Keypair.generate();
  return { pk: kp.publicKey.toBase58(), secret: bytesToB64(kp.secretKey) };
}

export async function loadArchive(): Promise<V3ArchiveRow[]> {
  if (durableConfigured()) {
    const raw = await kvGetJson(KEYS.batchLaunchV3Archive).catch(() => null);
    if (Array.isArray(raw)) return raw.filter((r) => r && typeof r === "object") as V3ArchiveRow[];
  }
  const file = await readJsonFile<V3ArchiveRow[]>(ARCHIVE_FILE);
  return Array.isArray(file) ? file : [];
}

export async function archiveProject(p: V3Project): Promise<V3ArchiveRow[]> {
  if (!p.id) return loadArchive();
  const rows = await loadArchive();
  const row: V3ArchiveRow = {
    id: p.id,
    name: p.name,
    symbol: p.symbol,
    mint: p.mint || p.pendingMint,
    launchWallet: p.launchWallet,
    website: p.website,
    supply: p.supply,
    status: p.status,
    snipers: p.snipers,
    launchedAt: p.mintedAt || p.revealedAt,
    at: Date.now(),
  };
  const next = [row, ...rows.filter((r) => r.id !== p.id)].slice(0, 200);
  if (durableConfigured()) await kvSetJson(KEYS.batchLaunchV3Archive, next).catch(() => false);
  await writeJsonFile(ARCHIVE_FILE, next).catch(() => undefined);
  return next;
}

function applyBrand(p: V3Project, brand: V3Brand, launchPk: string, team: Record<Exclude<V3Slice["id"], "lp">, string>): V3Project {
  const slices: V3SliceRow[] = brand.slices.map((s) => ({
    ...s,
    wallet: s.id === "lp" ? "" : team[s.id as Exclude<V3Slice["id"], "lp">] || launchPk,
  }));
  return {
    ...p,
    idea: brand.idea,
    name: brand.name,
    symbol: brand.symbol,
    handle: brand.handle,
    blurb: brand.blurb,
    about: brand.about,
    howToBuy: brand.howToBuy,
    roadmap: brand.roadmap,
    themeId: brand.themeId,
    colors: brand.colors,
    website: brand.website,
    createdOn: SNIPER_CREATED_ON,
    supply: brand.supply,
    decimals: brand.decimals,
    slices,
    curveTokens: brand.curveTokens,
    teamTokens: brand.teamTokens,
    launchWallet: launchPk,
    image: artUrl(brand.handle),
    uri: metaUrl(brand.handle),
    status: "drafted",
    error: undefined,
  };
}

export async function draftProject(idea: string): Promise<{ ok: true; project: V3Project } | { ok: false; error: string; project: V3Project }> {
  const live = await loadProject();
  if (live.status === "armed" || live.status === "minting" || live.status === "minted") {
    return { ok: false, error: "A countdown is already armed. Stop or wait for T-0 before drafting a new site.", project: live };
  }
  if (live.status === "live") {
    return { ok: false, error: "This launch is live. STOP it first, then draft a new site.", project: live };
  }
  const brand = buildV3Brand(idea, live.symbol ? [live.symbol] : []);
  const launch = freshWallet();
  const dev = freshWallet();
  const community = freshWallet();
  const treasury = freshWallet();
  const now = Date.now();
  const project: V3Project = applyBrand(
    {
      ...emptyProject(),
      id: `v3_${now.toString(36)}_${hexId()}`,
      createdAt: now,
      at: now,
    },
    brand,
    launch.pk,
    { dev: dev.pk, community: community.pk, treasury: treasury.pk },
  );
  await saveKeys({
    [launch.pk]: launch.secret,
    [dev.pk]: dev.secret,
    [community.pk]: community.secret,
    [treasury.pk]: treasury.secret,
  });
  await saveProject(project);
  return { ok: true, project };
}

export async function patchSocials(opts: { x?: string; telegram?: string }): Promise<V3Project> {
  const p = await loadProject();
  if (opts.x != null) p.x = String(opts.x).trim().slice(0, 120);
  if (opts.telegram != null) p.telegram = String(opts.telegram).trim().slice(0, 120);
  await saveProject(p);
  return p;
}

export function teamWalletsOf(p: V3Project): string[] {
  return [...new Set(p.slices.filter((s) => s.id !== "lp" && isSolanaAddress(s.wallet)).map((s) => s.wallet))];
}

export function allWalletsOf(p: V3Project): string[] {
  return [...new Set([p.launchWallet, ...teamWalletsOf(p)].filter((pk) => isSolanaAddress(pk)))];
}

export function publicSitePack(p: V3Project, now = Date.now()) {
  const live = p.status === "live" && isSolanaAddress(p.mint || "");
  const launchAt = p.launchAt > 0 ? p.launchAt : 0;
  const remainingMs = live ? 0 : launchAt > 0 ? Math.max(0, launchAt - now) : 0;
  const phase: "live" | "counting" | "soon" = live ? "live" : launchAt > 0 ? "counting" : "soon";
  return {
    name: p.name,
    symbol: p.symbol,
    handle: p.handle,
    blurb: p.blurb,
    about: p.about,
    howToBuy: p.howToBuy,
    roadmap: p.roadmap,
    colors: p.colors,
    website: p.website,
    x: p.x,
    telegram: p.telegram,
    image: p.image,
    supply: p.supply,
    slices: p.slices.map((s) => ({
      id: s.id,
      label: s.label,
      pct: s.pct,
      bps: s.bps,
      tokens: s.tokens,
      note: s.note,
    })),
    mint: live && p.mint ? p.mint : "",
    phase,
    countdown: {
      phase,
      launchAt,
      remainingMs,
      mintLeadMs: p.mintLeadMs || V3_MINT_LEAD_MS,
      serverNow: now,
    },
  };
}

export async function findProjectByHandle(handle: string): Promise<V3Project | null> {
  const h = v3HandleOf(handle);
  if (!h) return null;
  const live = await loadProject();
  if (live.handle === h || live.symbol.toLowerCase() === h) return live;
  const archive = await loadArchive();
  const hit = archive.find((r) => v3HandleOf(r.symbol) === h);
  if (!hit) return null;
  if (live.id === hit.id) return live;
  return null;
}
