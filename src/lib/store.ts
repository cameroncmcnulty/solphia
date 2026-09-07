import fs from "fs";
import path from "path";
import { DEFAULT_SETTINGS } from "./config";
import { emptyBook } from "./auto";
import { emptyLab, mergeLab } from "./desk/shadow";
import { emptyMind, mergeMind } from "./mind/engine";
import type { AppState, AuditEvent } from "./types";

export const DATA_DIR = process.env.DATA_DIR || (process.env.VERCEL ? "/tmp/solphia" : path.join(process.cwd(), "data"));
const FILE = path.join(DATA_DIR, "state.json");

let mem: AppState | null = null;
let memMtime = 0;
let writing = Promise.resolve();

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

export function loadState(): AppState {
  try {
    ensureDir();
    if (fs.existsSync(FILE)) {
      const mtime = fs.statSync(FILE).mtimeMs;
      if (mem && mtime <= memMtime) {
        if (isLegacyBook(mem.paper)) mem.paper = emptyBook();
        return mem;
      }
      const raw = JSON.parse(fs.readFileSync(FILE, "utf8")) as AppState;
      const rawPaper = raw.paper || emptyBook();
      mem = {
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
      };
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

export async function saveState(next: AppState): Promise<void> {
  mem = next;
  writing = writing.then(() => {
    ensureDir();
    const tmp = FILE + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify(next, null, 2));
    fs.renameSync(tmp, FILE);
    try {
      memMtime = fs.statSync(FILE).mtimeMs;
    } catch {
      memMtime = Date.now();
    }
  });
  await writing;
}

export async function mutateState<T>(fn: (state: AppState) => T | Promise<T>): Promise<T> {
  const state = loadState();
  const result = await fn(state);
  await saveState(state);
  return result;
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
