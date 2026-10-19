import fs from "fs";
import path from "path";
import { durableConfigured, kvDel, kvGetJson, kvSetJson, KEYS } from "./persist";
import { IMAGE_DATA_MAX } from "./launch/validate";
import { isSolanaAddress } from "./security";

const DATA_DIR = process.env.DATA_DIR || (process.env.VERCEL ? "/tmp/solphia" : path.join(process.cwd(), "data"));
const mem = new Map<string, string>();

function pfpFile(pk: string) {
  return path.join(DATA_DIR, "pfp", `${pk}.json`);
}

function dataUrlOk(raw: string): string {
  const s = (raw || "").trim();
  if (!s.startsWith("data:image/") || s.length < 32 || s.length > IMAGE_DATA_MAX) return "";
  if (!/^data:image\/[a-zA-Z0-9.+-]+;base64,/i.test(s)) return "";
  return s;
}

export function pfpRowValue(raw: unknown): string {
  if (typeof raw === "string") return dataUrlOk(raw);
  if (raw && typeof raw === "object" && "v" in raw && typeof (raw as { v: unknown }).v === "string") {
    return dataUrlOk((raw as { v: string }).v);
  }
  return "";
}

export async function putPfp(pk: string, dataUrl: string): Promise<boolean> {
  if (!isSolanaAddress(pk)) return false;
  const v = dataUrlOk(dataUrl);
  if (!v) return false;
  mem.set(pk, v);
  const row = { v };
  if (durableConfigured()) {
    const ok = await kvSetJson(KEYS.pfp(pk), row);
    if (!ok) mem.delete(pk);
    return ok;
  }
  try {
    fs.mkdirSync(path.dirname(pfpFile(pk)), { recursive: true });
    fs.writeFileSync(pfpFile(pk), JSON.stringify(row));
    return true;
  } catch {
    mem.delete(pk);
    return false;
  }
}

export async function getPfp(pk: string): Promise<string> {
  if (!isSolanaAddress(pk)) return "";
  const hit = mem.get(pk);
  if (hit) return hit;
  if (durableConfigured()) {
    const v = pfpRowValue(await kvGetJson(KEYS.pfp(pk)));
    if (v) mem.set(pk, v);
    return v;
  }
  try {
    const raw = JSON.parse(fs.readFileSync(pfpFile(pk), "utf8")) as unknown;
    const v = pfpRowValue(raw);
    if (v) mem.set(pk, v);
    return v;
  } catch {
    return "";
  }
}

export async function delPfp(pk: string): Promise<void> {
  if (!isSolanaAddress(pk)) return;
  mem.delete(pk);
  if (durableConfigured()) {
    await kvDel(KEYS.pfp(pk));
    return;
  }
  try {
    fs.unlinkSync(pfpFile(pk));
  } catch {
    /* missing */
  }
}
