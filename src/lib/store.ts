import fs from "fs";
import path from "path";
import { DEFAULT_SETTINGS } from "./config";
import { emptyBook, emptyTrader } from "./auto";
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
import type { AppState, AuditEvent, TraderAccount } from "./types";

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
          pair: rawPaper.pair
            ? {
                solQty: rawPaper.pair.solQty || 0,
                spyxQty: rawPaper.pair.spyxQty || 0,
                qqqxQty: rawPaper.pair.qqqxQty || 0,
                gldxQty: rawPaper.pair.gldxQty || 0,
                usdcQty: rawPaper.pair.usdcQty ?? rawPaper.cashUsd ?? emptyBook().cashUsd,
                solCostUsd: rawPaper.pair.solCostUsd,
                spyxCostUsd: rawPaper.pair.spyxCostUsd,
                qqqxCostUsd: rawPaper.pair.qqqxCostUsd,
                gldxCostUsd: rawPaper.pair.gldxCostUsd,
                lastClipAt: rawPaper.pair.lastClipAt,
                stops: rawPaper.pair.stops || {},
              }
            : { solQty: 0, spyxQty: 0, qqqxQty: 0, gldxQty: 0, usdcQty: rawPaper.cashUsd ?? emptyBook().cashUsd },
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
  };
}

function opsView(state: AppState): AppState {
  return { ...state, traders: {} };
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

async function persistShards(next: AppState, owners: string[]) {
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
