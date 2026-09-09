import fs from "fs";
import path from "path";
import { DEFAULT_SETTINGS } from "./config";
import { emptyBook, emptyTrader } from "./auto";
import { emptyLaunchBook, mergeLaunch, slimLaunch, type LaunchBook } from "./launch/engine";
import { emptyLab, mergeLab } from "./desk/shadow";
import { emptyMind, mergeMind } from "./mind/engine";
import {
  durableConfigured,
  durableKind,
  kvGetJson,
  kvMGetJson,
  kvSadd,
  kvSetJson,
  kvSmembers,
  pullRemoteState,
  KEYS,
} from "./persist";
import type { AppState, AuditEvent, BacktestReport, PairHoldings, TraderAccount } from "./types";

export const DATA_DIR = process.env.DATA_DIR || (process.env.VERCEL ? "/tmp/solphia" : path.join(process.cwd(), "data"));
const FILE = path.join(DATA_DIR, "state.json");

let mem: AppState | null = null;
let memMtime = 0;
let writing = Promise.resolve();
let hydrated = false;
let boot: Promise<AppState> | null = null;
let knownTraderOwners: string[] = [];

export const HOT_MS = 6 * 60_000;
export const MAX_TICK_TRADERS = 48;

export function emptyState(): AppState {
  return {
    paper: emptyBook(),
    lab: emptyLab(),
    mind: emptyMind(),
    settings: { ...DEFAULT_SETTINGS },
    users: [],
    alerts: [],
    emails: [],
    audit: [],
    creators: {},
    watchWallets: [],
    adminWallets: [],
    traders: {},
    liveOwners: [],
    hotAt: {},
    feedHealth: [],
    curveWatch: {},
    lastTickAt: 0,
    lastSnapshots: [],
    pairSamples: [],
    treasuryWallet: "",
    liveTrading: undefined,
    promos: [],
    promoPending: null,
    lastPromoDay: "",
    backtest: null,
    backtestLev2: null,
    backtestLev3: null,
    launch: emptyLaunchBook(),
    ownerWallet: "",
    sphaSocials: { x: "", telegram: "", discord: "" },
  };
}

function ensureDir() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function isLegacyBook(book: { fills?: { strategy: string }[] }) {
  const fills = book.fills || [];
  if (!fills.length) return false;
  return fills.some((f) => f.strategy !== "sol_spyx");
}

function hydrateFromRaw(raw: AppState): AppState {
  const rawPaper = raw.paper || emptyBook();
  return {
    ...emptyState(),
    ...raw,
    settings: { ...DEFAULT_SETTINGS, ...(raw.settings || {}) },
    paper: isLegacyBook(rawPaper)
      ? emptyBook()
      : {
          ...emptyBook(rawPaper.startingUsd || undefined),
          ...rawPaper,
          startedAt: rawPaper.startedAt || rawPaper.fills?.[0]?.at || Date.now(),
          pairLearn: rawPaper.pairLearn,
          pair: restorePair(rawPaper.pair, rawPaper.cashUsd ?? emptyBook().cashUsd),
          tape: rawPaper.tape || [],
          skipped: rawPaper.skipped || 0,
        },
    lab: mergeLab(raw.lab),
    mind: mergeMind(raw.mind),
    curveWatch: raw.curveWatch || {},
    traders: raw.traders || {},
    liveOwners: Array.isArray(raw.liveOwners) ? raw.liveOwners : [],
    hotAt: raw.hotAt && typeof raw.hotAt === "object" ? raw.hotAt : {},
    adminWallets: raw.adminWallets || [],
    treasuryWallet: raw.treasuryWallet || "",
    liveTrading: typeof raw.liveTrading === "boolean" ? raw.liveTrading : undefined,
    promos: Array.isArray(raw.promos) ? raw.promos : [],
    promoPending: raw.promoPending || null,
    lastPromoDay: raw.lastPromoDay || "",
    backtest: raw.backtest || null,
    backtestLev2: raw.backtestLev2 || null,
    backtestLev3: raw.backtestLev3 || null,
    launch: raw.launch && Array.isArray(raw.launch.coins) ? raw.launch : emptyLaunchBook(),
    ownerWallet: raw.ownerWallet || raw.launch?.ownerWallet || "",
    sphaSocials: {
      x: raw.sphaSocials?.x || "",
      telegram: raw.sphaSocials?.telegram || "",
      discord: raw.sphaSocials?.discord || "",
    },
  };
}

export function restorePair(p?: PairHoldings | null, cashUsd = 0): PairHoldings {
  if (!p) return { solQty: 0, spyxQty: 0, qqqxQty: 0, gldxQty: 0, usdcQty: cashUsd };
  return {
    solQty: p.solQty || 0,
    spyxQty: p.spyxQty || 0,
    qqqxQty: p.qqqxQty || 0,
    gldxQty: p.gldxQty || 0,
    usdcQty: p.usdcQty ?? cashUsd,
    solCostUsd: p.solCostUsd,
    spyxCostUsd: p.spyxCostUsd,
    qqqxCostUsd: p.qqqxCostUsd,
    gldxCostUsd: p.gldxCostUsd,
    lastClipAt: p.lastClipAt,
    stops: p.stops || {},
    solPerp: p.solPerp || null,
  };
}

function slimBacktest(report?: BacktestReport | null): BacktestReport | null {
  if (!report || !Array.isArray(report.curve) || !report.curve.length) return null;
  const fills = Array.isArray(report.fills) ? report.fills.slice(-80) : [];
  return { ...report, fills };
}

function opsView(state: AppState): AppState {
  return {
    ...state,
    traders: {},
    backtest: null,
    backtestLev2: null,
    backtestLev3: null,
    launch: slimLaunch(state.launch || emptyLaunchBook()),
  };
}

async function overlayLaunch(state: AppState) {
  if (!durableConfigured()) return;
  try {
    const raw = await kvGetJson(KEYS.launch);
    if (raw && typeof raw === "object" && Array.isArray((raw as LaunchBook).coins)) {
      state.launch = mergeLaunch(state.launch || emptyLaunchBook(), raw as LaunchBook);
    }
  } catch {
    /* keep mem */
  }
}

async function persistLaunch(state: AppState) {
  if (!durableConfigured()) return;
  await kvSetJson(KEYS.launch, slimLaunch(state.launch || emptyLaunchBook()));
}

export function touchHot(state: AppState, owner: string, at = Date.now()) {
  if (!state.hotAt) state.hotAt = {};
  state.hotAt[owner] = at;
  const t = state.traders[owner];
  if (t) t.updatedAt = at;
  for (const k of Object.keys(state.hotAt)) {
    if (at - (state.hotAt[k] || 0) > HOT_MS * 4) delete state.hotAt[k];
  }
}

export function setLiveOwner(state: AppState, owner: string, live: boolean) {
  if (!state.liveOwners) state.liveOwners = [];
  if (live && !state.liveOwners.includes(owner)) state.liveOwners.push(owner);
  if (!live) state.liveOwners = state.liveOwners.filter((o) => o !== owner);
}

export function hotOwners(state: AppState, now = Date.now()): string[] {
  const live = state.liveOwners || [];
  const recent = Object.entries(state.hotAt || {})
    .filter(([, at]) => now - (at || 0) <= HOT_MS)
    .sort((a, b) => (b[1] || 0) - (a[1] || 0))
    .map(([owner]) => owner);
  const out: string[] = [];
  for (const owner of [...live, ...recent]) {
    if (out.length >= MAX_TICK_TRADERS) break;
    if (!out.includes(owner)) out.push(owner);
  }
  return out;
}

export function loadState(): AppState {
  try {
    ensureDir();
    if (fs.existsSync(FILE)) {
      const mtime = fs.statSync(FILE).mtimeMs;
      if (mem && mtime <= memMtime) {
        if (isLegacyBook(mem.paper)) mem.paper = emptyBook();
        return mem;
      }
      mem = hydrateFromRaw(JSON.parse(fs.readFileSync(FILE, "utf8")) as AppState);
      memMtime = mtime;
      return mem;
    }
  } catch {
    // fall through to empty
  }
  mem = emptyState();
  memMtime = Date.now();
  return mem;
}

function writeFs(next: AppState) {
  ensureDir();
  const tmp = FILE + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(next, null, 2));
  fs.renameSync(tmp, FILE);
  try {
    memMtime = fs.statSync(FILE).mtimeMs;
  } catch {
    memMtime = Date.now();
  }
}

async function persistBacktests(next: AppState) {
  const jobs: Promise<boolean>[] = [];
  const b1 = slimBacktest(next.backtest);
  const b2 = slimBacktest(next.backtestLev2);
  const b3 = slimBacktest(next.backtestLev3);
  if (b1) jobs.push(kvSetJson(KEYS.backtest(1), b1));
  if (b2) jobs.push(kvSetJson(KEYS.backtest(2), b2));
  if (b3) jobs.push(kvSetJson(KEYS.backtest(3), b3));
  if (jobs.length) await Promise.all(jobs);
}

async function overlayBacktests(state: AppState) {
  const rows = await kvMGetJson([KEYS.backtest(1), KEYS.backtest(2), KEYS.backtest(3)]);
  const [b1, b2, b3] = rows;
  if (b1 && typeof b1 === "object") state.backtest = b1 as AppState["backtest"];
  if (b2 && typeof b2 === "object") state.backtestLev2 = b2 as AppState["backtestLev2"];
  if (b3 && typeof b3 === "object") state.backtestLev3 = b3 as AppState["backtestLev3"];
}

async function persistShards(next: AppState, owners: string[]) {
  await persistBacktests(next);
  await persistLaunch(next);
  await kvSetJson(KEYS.ops, opsView(next));
  const uniq = [...new Set(owners.filter(Boolean))];
  await Promise.all(
    uniq.map(async (owner) => {
      const t = next.traders[owner];
      if (!t) return;
      t.rev = (t.rev || 0) + 1;
      await kvSetJson(KEYS.trader(owner), t);
      await kvSadd(KEYS.traders, owner);
    }),
  );
  knownTraderOwners = [...new Set([...knownTraderOwners, ...uniq, ...Object.keys(next.traders || {})])];
}

export async function saveState(next: AppState): Promise<void> {
  mem = next;
  writing = writing.then(async () => {
    writeFs(next);
    if (durableConfigured()) {
      try {
        await persistShards(next, Object.keys(next.traders || {}));
      } catch {
        /* local write still counts */
      }
    }
  });
  await writing;
}

export async function saveOps(next: AppState): Promise<void> {
  mem = next;
  writing = writing.then(async () => {
    writeFs(next);
    if (durableConfigured()) {
      try {
        await persistBacktests(next);
        await persistLaunch(next);
        await kvSetJson(KEYS.ops, opsView(next));
      } catch {
        /* ignore */
      }
    }
  });
  await writing;
}

export async function saveTrader(t: TraderAccount): Promise<void> {
  const state = mem || emptyState();
  t.updatedAt = Date.now();
  t.rev = (t.rev || 0) + 1;
  state.traders[t.owner] = t;
  mem = state;
  if (durableConfigured()) {
    await kvSetJson(KEYS.trader(t.owner), t);
    await kvSadd(KEYS.traders, t.owner);
  } else {
    writeFs(state);
  }
  if (!knownTraderOwners.includes(t.owner)) knownTraderOwners.push(t.owner);
}

export async function loadTrader(owner: string): Promise<TraderAccount | null> {
  if (mem?.traders[owner]) return mem.traders[owner];
  if (durableConfigured()) {
    const raw = await kvGetJson(KEYS.trader(owner));
    if (raw && typeof raw === "object") {
      const t = raw as TraderAccount;
      if (mem) mem.traders[owner] = t;
      return t;
    }
  }
  return null;
}

export async function mutateTrader<T>(owner: string, fn: (t: TraderAccount, state: AppState) => T | Promise<T>): Promise<T> {
  const state = await readyState();
  const t = state.traders[owner] || (await loadTrader(owner)) || emptyTrader(owner);
  state.traders[owner] = t;
  const result = await fn(t, state);
  t.updatedAt = Date.now();
  await saveTrader(t);
  if (durableConfigured()) await kvSetJson(KEYS.ops, opsView(state));
  else writeFs(state);
  return result;
}

async function loadTraderMap(owners: string[]): Promise<Record<string, TraderAccount>> {
  const out: Record<string, TraderAccount> = {};
  const missing: string[] = [];
  for (const owner of owners) {
    if (mem?.traders[owner]) out[owner] = mem.traders[owner];
    else missing.push(owner);
  }
  if (missing.length && durableConfigured()) {
    const rows = await kvMGetJson(missing.map((o) => KEYS.trader(o)));
    rows.forEach((raw, i) => {
      if (raw && typeof raw === "object") {
        const t = raw as TraderAccount;
        out[missing[i]] = t;
        if (mem) mem.traders[missing[i]] = t;
      }
    });
  }
  return out;
}

export async function loadHotTraders(state: AppState): Promise<TraderAccount[]> {
  const ids = hotOwners(state);
  const extra = await loadTraderMap(ids.filter((o) => !state.traders[o]));
  Object.assign(state.traders, extra);
  return ids.map((o) => state.traders[o]).filter(Boolean);
}

export async function loadAllTraders(state: AppState): Promise<void> {
  let owners = knownTraderOwners;
  if (durableConfigured()) {
    const remote = await kvSmembers(KEYS.traders);
    owners = [...new Set([...owners, ...remote, ...Object.keys(state.traders || {})])];
    knownTraderOwners = owners;
  }
  const extra = await loadTraderMap(owners.filter((o) => !state.traders[o]));
  Object.assign(state.traders, extra);
}

async function hydrate(): Promise<AppState> {
  if (durableConfigured()) {
    try {
      const ops = await kvGetJson(KEYS.ops);
      if (ops && typeof ops === "object") {
        mem = hydrateFromRaw(ops as AppState);
        mem.traders = mem.traders || {};
        await overlayBacktests(mem);
        await overlayLaunch(mem);
        knownTraderOwners = await kvSmembers(KEYS.traders);
        memMtime = Date.now();
        hydrated = true;
        return mem;
      }
      const remote = await pullRemoteState();
      if (remote && typeof remote === "object") {
        mem = hydrateFromRaw(remote as AppState);
        const owners = Object.keys(mem.traders || {});
        knownTraderOwners = owners;
        await overlayBacktests(mem);
        await overlayLaunch(mem);
        await persistShards(mem, owners);
        memMtime = Date.now();
        hydrated = true;
        return mem;
      }
    } catch {
      /* fall through to disk */
    }
  }
  const local = loadState();
  knownTraderOwners = Object.keys(local.traders || {});
  if (durableConfigured()) {
    try {
      await overlayBacktests(local);
      await overlayLaunch(local);
    } catch {
      /* disk still usable */
    }
  }
  hydrated = true;
  return local;
}

/** Pull durable shards (if configured) before reads/writes. */
export async function readyState(): Promise<AppState> {
  if (hydrated && mem) return mem;
  if (!boot) boot = hydrate();
  return boot;
}

export async function mutateState<T>(fn: (state: AppState) => T | Promise<T>): Promise<T> {
  const state = await readyState();
  const result = await fn(state);
  await saveState(state);
  return result;
}

/** Launch tape is its own shard so coins survive across serverless instances. */
export async function withLaunch<T>(fn: (state: AppState) => T | Promise<T>, write = false): Promise<T> {
  const state = await readyState();
  await overlayLaunch(state);
  if (!state.launch) state.launch = emptyLaunchBook();
  const result = await fn(state);
  if (write) await saveState(state);
  return result;
}

export function storeInfo() {
  return { durable: durableConfigured(), kind: durableKind() };
}

export function audit(actor: string, action: string, detail: string, ip?: string): AuditEvent {
  return {
    id: `aud_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    at: Date.now(),
    actor,
    action,
    detail,
    ip,
  };
}

export function pushBounded<T>(arr: T[], item: T, max: number): T[] {
  arr.push(item);
  if (arr.length > max) arr.splice(0, arr.length - max);
  return arr;
}
