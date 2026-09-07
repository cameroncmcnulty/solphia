import fs from "fs";
import path from "path";
import { ADMIN_SECRET } from "../config";
import { signToken, verifyToken } from "../security";
import { DATA_DIR } from "../store";

export function promoDir() {
  const dir = path.join(DATA_DIR, "promos");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function promoPath(file: string) {
  return path.join(promoDir(), file);
}

export function promoViewToken(id: string) {
  return signToken(`promo:${id}`, ADMIN_SECRET);
}

export function promoViewOk(id: string, token: string) {
  if (!ADMIN_SECRET || !id || !token) return false;
  return verifyToken(token, ADMIN_SECRET) === `promo:${id}`;
}

export function promoDataUrl(file: string, mime: string): string | undefined {
  try {
    const buf = fs.readFileSync(promoPath(file));
    if (!buf.length || buf.length > 1_200_000) return undefined;
    return `data:${mime || "image/png"};base64,${buf.toString("base64")}`;
  } catch {
    return undefined;
  }
}
