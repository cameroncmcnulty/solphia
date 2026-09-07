import fs from "fs";
import path from "path";
import { DEFAULT_SETTINGS } from "./config";
import { emptyBook } from "./auto";
import { emptyLab, mergeLab } from "./desk/shadow";
import { emptyMind, mergeMind } from "./mind/engine";
import { durableConfigured, durableKind, pullRemoteState, pushRemoteState } from "./persist";
import type { AppState, AuditEvent } from "./types";

export const DATA_DIR = process.env.DATA_DIR || (process.env.VERCEL ? "/tmp/solphia" : path.join(process.cwd(), "data"));
const FILE = path.join(DATA_DIR, "state.json");

let mem: AppState | null = null;
let memMtime = 0;
let writing = Promise.resolve();
let hydrated = false;
let boot: Promise<AppState> | null = null;

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
    adminWallets: raw.adminWallets || [],
    treasuryWallet: raw.treasuryWallet || "",
    liveTrading: typeof raw.liveTrading === "boolean" ? raw.liveTrading : undefined,
    promos: Array.isArray(raw.promos) ? raw.promos : [],
    promoPending: raw.promoPending || null,
    lastPromoDay: raw.lastPromoDay || "",
    backtest: raw.backtest || null,
  };
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

export async function saveState(next: AppState): Promise<void> {
  mem = next;
  writing = writing.then(async () => {
    writeFs(next);
    if (durableConfigured()) {
      try {
        await pushRemoteState(next);
      } catch {
        /* local write still counts */
      }
    }
  });
  await writing;
}

async function hydrate(): Promise<AppState> {
  if (durableConfigured()) {
    try {
      const remote = await pullRemoteState();
      if (remote && typeof remote === "object") {
        mem = hydrateFromRaw(remote as AppState);
        memMtime = Date.now();
        try {
          writeFs(mem);
        } catch {
          /* /tmp may be missing on the edge */
        }
        hydrated = true;
        return mem;
      }
    } catch {
      /* fall through to disk */
    }
  }
  const local = loadState();
  hydrated = true;
  return local;
}

/** Pull Upstash/Blob (if configured) before reads/writes so Vercel cold starts see the last save. */
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
