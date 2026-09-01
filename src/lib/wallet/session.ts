import { NextRequest } from "next/server";
import { verifyToken } from "../security";

const secret = process.env.ADMIN_SECRET || "solphia-dev-only";

export function readSession(req: NextRequest): string | null {
  const raw = req.cookies.get("solphia_session")?.value;
  if (!raw) return null;
  const payload = verifyToken(raw, secret);
  if (!payload?.startsWith("user:")) return null;
  return payload.split(":")[1] || null;
}
