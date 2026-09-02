import fs from "fs";
import path from "path";
import { DEFAULT_SETTINGS } from "./config";
import { emptyBook } from "./auto";
import { emptyLab, mergeLab } from "./desk/shadow";
import type { AppState, AuditEvent } from "./types";

const DATA_DIR = process.env.DATA_DIR || (process.env.VERCEL ? "/tmp/solphia" : path.join(process.cwd(), "data"));
const FILE = path.join(DATA_DIR, "state.json");

let mem: AppState | null = null;
let writing = Promise.resolve();

export function emptyState(): AppState {
  return {
    paper: emptyBook(),
    lab: emptyLab(),
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
    lastTickAt: 0,
    lastSnapshots: [],
  };
}

function ensureDir() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function isScalpDemo(book: { fills?: { strategy: string }[] }) {
  const fills = book.fills || [];
  return fills.length > 0 && !fills.some((f) => f.strategy === "copy_trade");
}

export function loadState(): AppState {
  if (mem) {
    if (isScalpDemo(mem.paper)) mem.paper = emptyBook();
    return mem;
  }
  try {
    ensureDir();
    if (fs.existsSync(FILE)) {
      const raw = JSON.parse(fs.readFileSync(FILE, "utf8")) as AppState;
      const rawPaper = raw.paper || emptyBook();
      mem = {
        ...emptyState(),
        ...raw,
        settings: { ...DEFAULT_SETTINGS, ...(raw.settings || {}) },
        paper: isScalpDemo(rawPaper) ? emptyBook() : { ...emptyBook(), ...rawPaper },
        lab: mergeLab(raw.lab),
        traders: raw.traders || {},
        adminWallets: raw.adminWallets || [],
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
