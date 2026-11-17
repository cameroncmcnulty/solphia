import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { Keypair } from "@solana/web3.js";
import { isSolanaAddress } from "../../security";
import { SITE_URL } from "../../config";
import { durableConfigured, kvGetJson, kvSetJson, KEYS } from "../../persist";
import { bytesToB64, b64ToBytes } from "../../solana/wire";
import { emptySnipers, type SniperStats } from "../snipers";
import { SNIPER_CREATED_ON, nameOk, tickerOk } from "../identities";
import { SPHA_MINT_LEAD_MS } from "../../token/countdown";
import { buildV3Brand, type V3Brand, type V3Slice, type V3Theme } from "./idea";
import { buildV3SiteKit, enrichSiteKit, V3_FONTS, type V3Fonts, type V3Layout, type V3Motion, type V3SiteKit } from "./site";
import { generateV3Art } from "./imagine";
import { isReservedV3Host, v3HandleOf, v3WebsiteOf } from "./host";
import { dressSitePack, type WorldLabels } from "./world";

const FILE = path.join(process.cwd(), "data", "batch-launch-v3.json");
const KEYS_FILE = path.join(process.cwd(), "data", "batch-launch-v3-keys.json");
const ARCHIVE_FILE = path.join(process.cwd(), "data", "batch-launch-v3-archive.json");

export const V3_MIN_LAUNCH_SOL = 0.2;
export const V3_KEEP_LAMPORTS = 2_000_000;
export const V3_MINT_LEAD_MS = SPHA_MINT_LEAD_MS;

export type V3Status = "idle" | "drafted" | "armed" | "minting" | "minted" | "live" | "stopped" | "failed" | "deleted";

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
  heroImage: string;
  artCid?: string;
  heroCid?: string;
  uri: string;
  layout: V3Layout;
  motion: V3Motion;
  fonts: V3Fonts;
  tagline: string;
  manifesto: string;
  lore: string;
  community: string;
  warning: string;
  features: { title: string; body: string }[];
  faq: { q: string; a: string }[];
  buySteps: { n: string; title: string; body: string }[];
  stats: { k: string; v: string }[];
  labels: WorldLabels;
  worldId: string;
  identityLocked?: boolean;
  artPrompt: string;
  heroPrompt: string;
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
  return { bg: "#07070c", ink: "#f4f4f8", accent: "#7c5cff", muted: "#9aa0b8", card: "#12121a", glow: "#5ce1ff", line: "#2a2a38", glow2: "#7c5cff" };
}

function emptyLabels(): WorldLabels {
  return { story: "Manifest", split: "Allocation", buy: "Acquire", path: "Timeline", faq: "FAQ", lore: "Lore", join: "Crew", kicker: "PUBLIC MINT · T-0" };
}

function emptyFonts(): V3Fonts {
  return {
    display: "Syne",
    body: "DM Sans",
    mono: "IBM Plex Mono",
    href: "https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;600;800&family=IBM+Plex+Mono:wght@400;600&family=Syne:wght@500;700;800&display=swap",
  };
}

function emptyKit(): Pick<
  V3Project,
  | "layout"
  | "motion"
  | "fonts"
  | "tagline"
  | "manifesto"
  | "lore"
  | "community"
  | "warning"
  | "features"
  | "faq"
  | "buySteps"
  | "stats"
  | "labels"
  | "worldId"
  | "artPrompt"
  | "heroPrompt"
  | "heroImage"
> {
  return {
    layout: "glass",
    motion: "aurora",
    fonts: emptyFonts(),
    tagline: "",
    manifesto: "",
    lore: "",
    community: "",
    warning: "Memecoins can go to zero. This is not financial advice.",
    features: [],
    faq: [],
    buySteps: [],
    stats: [],
    labels: emptyLabels(),
    worldId: "generic",
    artPrompt: "",
    heroPrompt: "",
    heroImage: "",
  };
}

export type V3Book = { activeId: string; sites: Record<string, V3Project> };

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
    ...emptyKit(),
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
    v === "failed" ||
    v === "deleted"
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
            id: (row.id === "project" || row.id === "dev" || row.id === "community" || row.id === "treasury" || row.id === "lp"
              ? row.id
              : "lp") as V3SliceRow["id"],
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
      glow: str(colors.glow) || str(colors.accent) || emptyColors().glow,
      line: str(colors.line) || emptyColors().line,
      glow2: str(colors.glow2) || undefined,
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
    heroImage: str(o.heroImage),
    artCid: str(o.artCid) || undefined,
    heroCid: str(o.heroCid) || undefined,
    uri: str(o.uri) || (handle ? metaUrl(handle) : ""),
    layout: (["cinema", "terminal", "studio", "neon", "glass", "brutal", "orbital", "pulse"].includes(str(o.layout))
      ? str(o.layout)
      : "glass") as V3Layout,
    motion: (["particles", "grid", "aurora", "orbit", "scan", "wave"].includes(str(o.motion)) ? str(o.motion) : "aurora") as V3Motion,
    fonts: o.fonts && typeof o.fonts === "object"
      ? {
          display: str((o.fonts as V3Fonts).display) || emptyFonts().display,
          body: str((o.fonts as V3Fonts).body) || emptyFonts().body,
          mono: str((o.fonts as V3Fonts).mono) || emptyFonts().mono,
          href: str((o.fonts as V3Fonts).href) || emptyFonts().href,
        }
      : emptyFonts(),
    tagline: str(o.tagline).slice(0, 160),
    manifesto: str(o.manifesto).slice(0, 1200),
    lore: str(o.lore).slice(0, 1200),
    community: str(o.community).slice(0, 700),
    warning: str(o.warning).slice(0, 280) || emptyKit().warning,
    features: Array.isArray(o.features)
      ? o.features
          .filter((f) => f && typeof f === "object")
          .map((f) => ({ title: str((f as { title?: string }).title).slice(0, 48), body: str((f as { body?: string }).body).slice(0, 280) }))
          .slice(0, 8)
      : [],
    faq: Array.isArray(o.faq)
      ? o.faq
          .filter((f) => f && typeof f === "object")
          .map((f) => ({ q: str((f as { q?: string }).q).slice(0, 100), a: str((f as { a?: string }).a).slice(0, 400) }))
          .slice(0, 10)
      : [],
    buySteps: Array.isArray(o.buySteps)
      ? o.buySteps
          .filter((f) => f && typeof f === "object")
          .map((f) => ({
            n: str((f as { n?: string }).n).slice(0, 4),
            title: str((f as { title?: string }).title).slice(0, 40),
            body: str((f as { body?: string }).body).slice(0, 220),
          }))
          .slice(0, 6)
      : [],
    stats: Array.isArray(o.stats)
      ? o.stats
          .filter((f) => f && typeof f === "object")
          .map((f) => ({ k: str((f as { k?: string }).k).slice(0, 24), v: str((f as { v?: string }).v).slice(0, 32) }))
          .slice(0, 8)
      : [],
    labels: o.labels && typeof o.labels === "object"
      ? {
          story: str((o.labels as WorldLabels).story) || emptyLabels().story,
          split: str((o.labels as WorldLabels).split) || emptyLabels().split,
          buy: str((o.labels as WorldLabels).buy) || emptyLabels().buy,
          path: str((o.labels as WorldLabels).path) || emptyLabels().path,
          faq: str((o.labels as WorldLabels).faq) || emptyLabels().faq,
          lore: str((o.labels as WorldLabels).lore) || emptyLabels().lore,
          join: str((o.labels as WorldLabels).join) || emptyLabels().join,
          kicker: str((o.labels as WorldLabels).kicker) || emptyLabels().kicker,
        }
      : emptyLabels(),
    worldId: str(o.worldId) || "generic",
    identityLocked: Boolean(o.identityLocked),
    artPrompt: str(o.artPrompt).slice(0, 500),
    heroPrompt: str(o.heroPrompt).slice(0, 500),
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

function livingId(sites: Record<string, V3Project>, preferred = ""): string {
  if (preferred && sites[preferred] && sites[preferred]!.status !== "deleted") return preferred;
  const next = Object.values(sites).find((p) => p.id && p.status !== "deleted");
  return next?.id || "";
}

function asBook(raw: unknown): V3Book {
  if (raw && typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    if (o.sites && typeof o.sites === "object" && !Array.isArray(o.sites)) {
      const sites: Record<string, V3Project> = {};
      for (const [k, v] of Object.entries(o.sites as Record<string, unknown>)) {
        const p = normalizeProject(v);
        if (p.id) sites[p.id] = p;
        else if (k) sites[k] = p;
      }
      return { activeId: livingId(sites, str(o.activeId)), sites };
    }
    if (str(o.id) || str(o.symbol)) {
      const p = normalizeProject(raw);
      if (p.id && p.status !== "deleted") return { activeId: p.id, sites: { [p.id]: p } };
      if (p.id) return { activeId: "", sites: { [p.id]: p } };
    }
  }
  return { activeId: "", sites: {} };
}

export async function loadBook(): Promise<V3Book> {
  if (durableConfigured()) {
    const raw = await kvGetJson(KEYS.batchLaunchV3).catch(() => null);
    if (raw && typeof raw === "object") return asBook(raw);
  }
  const file = await readJsonFile<unknown>(FILE);
  if (file) return asBook(file);
  return { activeId: "", sites: {} };
}

async function writeBook(book: V3Book): Promise<void> {
  if (durableConfigured()) await kvSetJson(KEYS.batchLaunchV3, book).catch(() => false);
  await writeJsonFile(FILE, book).catch(() => undefined);
}

export async function loadProject(): Promise<V3Project> {
  const book = await loadBook();
  const p = book.sites[book.activeId];
  if (!p || p.status === "deleted") return emptyProject();
  return p;
}

export async function listSites(): Promise<V3Project[]> {
  const book = await loadBook();
  return Object.values(book.sites)
    .filter((p) => p.id && p.status !== "deleted")
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

export async function listTickableSites(): Promise<V3Project[]> {
  const book = await loadBook();
  return Object.values(book.sites).filter(
    (p) => p.id && p.status !== "deleted" && p.status !== "idle" && (p.launchAt > 0 || p.status === "live" || p.status === "armed" || p.status === "minting" || p.status === "minted"),
  );
}

export async function openSite(id: string): Promise<V3Project> {
  const book = await loadBook();
  if (!book.sites[id] || book.sites[id]!.status === "deleted") {
    const live = book.sites[livingId(book.sites, book.activeId)];
    return live && live.status !== "deleted" ? live : emptyProject();
  }
  book.activeId = id;
  await writeBook(book);
  return book.sites[id]!;
}

function tombstoneOf(p: V3Project): V3Project {
  return {
    ...emptyProject(),
    id: p.id,
    launchWallet: p.launchWallet,
    slices: p.slices.map((s) => ({ ...s, label: "", note: "", pct: "0%", tokens: 0, bps: 0 })),
    status: "deleted",
    createdAt: p.createdAt,
    at: Date.now(),
  };
}

export async function deleteSite(id: string): Promise<{ ok: boolean; project: V3Project; error?: string }> {
  const book = await loadBook();
  const p = book.sites[id];
  if (!p) return { ok: false, project: book.sites[livingId(book.sites, book.activeId)] || emptyProject(), error: "Site not found." };
  book.sites[id] = tombstoneOf(p);
  book.activeId = livingId(book.sites, book.activeId === id ? "" : book.activeId);
  await writeBook(book);
  const rows = (await loadArchive().catch(() => [])) as V3ArchiveRow[];
  const next = rows.filter((r) => r.id !== id);
  if (durableConfigured()) await kvSetJson(KEYS.batchLaunchV3Archive, next).catch(() => false);
  await writeJsonFile(ARCHIVE_FILE, next).catch(() => undefined);
  const live = book.sites[book.activeId];
  return { ok: true, project: live && live.status !== "deleted" ? live : emptyProject() };
}

export async function withActiveId<T>(id: string, fn: () => Promise<T>): Promise<T> {
  const book = await loadBook();
  const prev = book.activeId;
  book.activeId = id;
  await writeBook(book);
  try {
    return await fn();
  } finally {
    const after = await loadBook();
    if (after.sites[prev] && after.sites[prev]!.status !== "deleted") after.activeId = prev;
    await writeBook(after);
  }
}

/** Isolated V3 launch or project-holdings wallet, including deleted-site tombstones. Skip house 1%. */
export async function isV3LaunchWallet(pk: string): Promise<boolean> {
  const clean = (pk || "").trim();
  if (!isSolanaAddress(clean)) return false;
  try {
    const book = await loadBook();
    return Object.values(book.sites).some((p) => p.launchWallet === clean || teamWalletsOf(p).includes(clean));
  } catch {
    return false;
  }
}

export async function saveProject(p: V3Project): Promise<void> {
  const slim = publicProject(p);
  slim.at = Date.now();
  const book = await loadBook();
  if (slim.id) {
    const prev = book.sites[slim.id];
    if (prev?.status === "deleted" && slim.status !== "deleted") return;
    book.sites[slim.id] = slim.status === "deleted" ? tombstoneOf(slim) : slim;
    book.activeId = livingId(book.sites, slim.status === "deleted" ? book.activeId : slim.id || book.activeId);
  }
  await writeBook(book);
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
  const rows = await loadArchive();
  if (!p.id || p.status === "deleted") {
    const next = rows.filter((r) => r.id !== p.id);
    if (durableConfigured()) await kvSetJson(KEYS.batchLaunchV3Archive, next).catch(() => false);
    await writeJsonFile(ARCHIVE_FILE, next).catch(() => undefined);
    return next;
  }
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

function applyBrand(p: V3Project, brand: V3Brand, kit: V3SiteKit, launchPk: string, holdingsPk: string): V3Project {
  const slices: V3SliceRow[] = brand.slices.map((s) => ({
    ...s,
    wallet: s.id === "lp" ? "" : holdingsPk || launchPk,
  }));
  return {
    ...p,
    idea: brand.idea,
    name: brand.name,
    symbol: brand.symbol,
    handle: brand.handle,
    blurb: brand.blurb,
    about: kit.manifesto || brand.about,
    howToBuy: brand.howToBuy,
    roadmap: brand.roadmap,
    themeId: brand.themeId,
    colors: kit.colors,
    website: brand.website,
    createdOn: SNIPER_CREATED_ON,
    supply: brand.supply,
    decimals: brand.decimals,
    slices,
    curveTokens: brand.curveTokens,
    teamTokens: brand.teamTokens,
    launchWallet: launchPk,
    image: artUrl(brand.handle),
    heroImage: "",
    uri: metaUrl(brand.handle),
    layout: kit.layout,
    motion: kit.motion,
    fonts: kit.fonts,
    tagline: kit.tagline,
    manifesto: kit.manifesto,
    lore: kit.lore,
    community: kit.community,
    warning: kit.warning,
    features: kit.features,
    faq: kit.faq,
    buySteps: kit.buySteps,
    stats: kit.stats,
    labels: kit.labels,
    worldId: kit.worldId,
    artPrompt: kit.artPrompt,
    heroPrompt: kit.heroPrompt,
    status: "drafted",
    error: undefined,
  };
}

export async function draftProject(idea: string): Promise<{ ok: true; project: V3Project } | { ok: false; error: string; project: V3Project }> {
  const book = await loadBook();
  const used = Object.values(book.sites)
    .filter((s) => s.status !== "deleted")
    .map((s) => s.symbol);
  const brand = buildV3Brand(idea, used);
  let kit = buildV3SiteKit(brand);
  kit = await enrichSiteKit(brand, kit).catch(() => kit);
  const launch = freshWallet();
  const holdings = freshWallet();
  const now = Date.now();
  let project: V3Project = applyBrand(
    {
      ...emptyProject(),
      id: `v3_${now.toString(36)}_${hexId()}`,
      createdAt: now,
      at: now,
    },
    brand,
    kit,
    launch.pk,
    holdings.pk,
  );
  await saveKeys({
    [launch.pk]: launch.secret,
    [holdings.pk]: holdings.secret,
  });
  const art = await generateV3Art({ artPrompt: kit.artPrompt, heroPrompt: kit.heroPrompt, handle: brand.handle }).catch(
    () => ({ image: "", heroImage: "" as string, artCid: undefined as string | undefined, heroCid: undefined as string | undefined }),
  );
  if (art.image) {
    project.image = art.image;
    project.artCid = art.artCid;
  }
  if (art.heroImage) {
    project.heroImage = art.heroImage;
    project.heroCid = art.heroCid;
  }
  book.sites[project.id] = project;
  book.activeId = project.id;
  await writeBook(book);
  await archiveProject(project).catch(() => undefined);
  return { ok: true, project };
}

export async function patchSocials(opts: { x?: string; telegram?: string }): Promise<V3Project> {
  const out = await patchBrand(opts);
  return out.project;
}

function rewriteIdentity(text: string, fromName: string, fromTick: string, toName: string, toTick: string): string {
  let s = text || "";
  if (fromTick && fromTick !== toTick) {
    s = s.split(`$${fromTick}`).join(`$${toTick}`);
    s = s.replace(new RegExp(`\\b${fromTick}\\b`, "g"), toTick);
  }
  if (fromName && fromName !== toName) s = s.split(fromName).join(toName);
  return s;
}

export async function patchBrand(opts: {
  name?: string;
  symbol?: string;
  x?: string;
  telegram?: string;
  image?: string;
}): Promise<{ ok: true; project: V3Project } | { ok: false; error: string; project: V3Project }> {
  const p = await loadProject();
  if (!p.id || p.status === "deleted") return { ok: false, error: "no_project", project: p };
  const prevName = p.name;
  const prevSym = p.symbol;
  if (opts.name != null) {
    const n = String(opts.name).trim().slice(0, 32);
    if (!nameOk(n)) return { ok: false, error: "bad_name", project: p };
    p.name = n;
  }
  if (opts.symbol != null) {
    const minted = Boolean(p.mint || p.pendingMint);
    if (minted && opts.symbol.replace(/^\$/, "").trim().toUpperCase() !== p.symbol) {
      return { ok: false, error: "ticker_locked", project: p };
    }
    const s = String(opts.symbol).replace(/^\$/, "").trim().toUpperCase().slice(0, 10);
    if (!tickerOk(s)) return { ok: false, error: "bad_ticker", project: p };
    const handle = v3HandleOf(s);
    if (isReservedV3Host(handle)) return { ok: false, error: "reserved_host", project: p };
    const book = await loadBook();
    const taken = Object.values(book.sites).some(
      (row) => row.id !== p.id && row.status !== "deleted" && (row.handle === handle || row.symbol === s),
    );
    if (taken) return { ok: false, error: "ticker_taken", project: p };
    p.symbol = s;
    p.handle = handle;
    p.website = v3WebsiteOf(s);
    p.uri = metaUrl(handle);
  }
  if (prevName !== p.name || prevSym !== p.symbol) {
    const swap = (s: string) => rewriteIdentity(s, prevName, prevSym, p.name, p.symbol);
    p.blurb = swap(p.blurb);
    p.about = swap(p.about);
    p.tagline = swap(p.tagline);
    p.manifesto = swap(p.manifesto);
    p.lore = swap(p.lore);
    p.community = swap(p.community);
    p.howToBuy = swap(p.howToBuy);
    p.features = p.features.map((f) => ({ title: swap(f.title), body: swap(f.body) }));
    p.faq = p.faq.map((f) => ({ q: swap(f.q), a: swap(f.a) }));
    p.buySteps = p.buySteps.map((f) => ({ ...f, title: swap(f.title), body: swap(f.body) }));
    p.roadmap = p.roadmap.map((f) => ({ title: swap(f.title), body: swap(f.body) }));
  }
  if (opts.x != null) p.x = String(opts.x).trim().slice(0, 120);
  if (opts.telegram != null) p.telegram = String(opts.telegram).trim().slice(0, 120);
  if (opts.image != null) {
    const img = String(opts.image).trim();
    if (img && (img.startsWith("http") || img.startsWith("data:image") || img.startsWith("/"))) {
      p.image = img.startsWith("data:image") ? img.slice(0, 1_400_000) : img.slice(0, 4000);
    }
  }
  p.identityLocked = true;
  await saveProject(p);
  return { ok: true, project: p };
}

export function teamWalletsOf(p: V3Project): string[] {
  return [...new Set(p.slices.filter((s) => s.id !== "lp" && isSolanaAddress(s.wallet)).map((s) => s.wallet))];
}

export function holdingsWalletOf(p: V3Project): string {
  const project = p.slices.find((s) => s.id === "project" && isSolanaAddress(s.wallet));
  if (project) return project.wallet;
  return teamWalletsOf(p)[0] || "";
}

export function allWalletsOf(p: V3Project): string[] {
  return [...new Set([p.launchWallet, ...teamWalletsOf(p)].filter((pk) => isSolanaAddress(pk)))];
}

export function publicSitePack(p: V3Project, now = Date.now()) {
  const live = p.status === "live" && isSolanaAddress(p.mint || "");
  const launchAt = p.launchAt > 0 ? p.launchAt : 0;
  const remainingMs = live ? 0 : launchAt > 0 ? Math.max(0, launchAt - now) : 0;
  const phase: "live" | "counting" | "soon" = live ? "live" : launchAt > 0 ? "counting" : "soon";
  const dressed = dressSitePack({
    idea: p.idea,
    name: p.name,
    symbol: p.symbol,
    blurb: p.blurb,
    about: p.about,
    howToBuy: p.howToBuy,
    roadmap: p.roadmap,
    colors: p.colors,
    layout: p.layout,
    motion: p.motion,
    tagline: p.tagline,
    manifesto: p.manifesto,
    lore: p.lore,
    community: p.community,
    warning: p.warning,
    features: p.features,
    faq: p.faq,
    buySteps: p.buySteps,
    labels: p.labels,
    worldId: p.worldId,
    identityLocked: p.identityLocked,
  });
  return {
    name: dressed.name,
    symbol: p.symbol,
    handle: p.handle,
    blurb: dressed.blurb,
    about: dressed.about,
    howToBuy: dressed.howToBuy,
    roadmap: dressed.roadmap,
    colors: dressed.colors,
    website: p.website,
    x: p.x,
    telegram: p.telegram,
    image: p.image,
    heroImage: p.heroImage,
    layout: dressed.layout,
    motion: dressed.motion,
    fonts: V3_FONTS[(["cinema", "terminal", "studio", "neon", "glass", "brutal", "orbital", "pulse"].includes(dressed.layout) ? dressed.layout : p.layout) as V3Layout] || p.fonts,
    tagline: dressed.tagline,
    manifesto: dressed.manifesto,
    lore: dressed.lore,
    community: dressed.community,
    warning: dressed.warning,
    features: dressed.features,
    faq: dressed.faq,
    buySteps: dressed.buySteps,
    stats: p.stats,
    labels: dressed.labels,
    worldId: dressed.worldId,
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
  const book = await loadBook();
  const hit = Object.values(book.sites).find(
    (p) => p.status !== "deleted" && (p.handle === h || p.symbol.toLowerCase() === h),
  );
  return hit || null;
}
