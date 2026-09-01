import fs from "fs";
import path from "path";
import { PAPER_STARTING_USD, DEFAULT_SETTINGS } from "./config";
import type { AppState, AuditEvent, PaperBook } from "./types";

const DATA_DIR = process.env.DATA_DIR || (process.env.VERCEL ? "/tmp/solphia" : path.join(process.cwd(), "data"));
const FILE = path.join(DATA_DIR, "state.json");

let mem: AppState | null = null;
let writing = Promise.resolve();

function emptyBook(): PaperBook {
  const now = Date.now();
  return {
    startingUsd: PAPER_STARTING_USD,
    startedAt: now,
    cashUsd: PAPER_STARTING_USD,
    equityUsd: PAPER_STARTING_USD,
    realizedPnlUsd: 0,
    feesPaidUsd: 0,
    slippagePaidUsd: 0,
    winCount: 0,
    lossCount: 0,
    positions: [],
    fills: [],
    curve: [{ t: now, equity: PAPER_STARTING_USD }],
  };
}

export function emptyState(): AppState {
  return {
    paper: emptyBook(),
    settings: { ...DEFAULT_SETTINGS },
    users: [],
    alerts: [],
    emails: [],
    audit: [],
    creators: {},
    watchWallets: [],
    feedHealth: [],
    lastTickAt: 0,
    lastSnapshots: [],
  };
}

function ensureDir() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export function loadState(): AppState {
  if (mem) return mem;
  try {
    ensureDir();
    if (fs.existsSync(FILE)) {
      const raw = JSON.parse(fs.readFileSync(FILE, "utf8")) as AppState;
      mem = {
        ...emptyState(),
        ...raw,
        settings: { ...DEFAULT_SETTINGS, ...(raw.settings || {}) },
        paper: { ...emptyBook(), ...(raw.paper || {}) },
      };
      return mem;
    }
  } catch {
    // fall through to empty
  }
  mem = emptyState();
  return mem;
}

export async function saveState(next: AppState): Promise<void> {
  mem = next;
  writing = writing.then(() => {
    ensureDir();
    const tmp = FILE + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify(next, null, 2));
    fs.renameSync(tmp, FILE);
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
