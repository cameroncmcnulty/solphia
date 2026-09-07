import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin/auth";
import { buildAdminDesk } from "@/lib/admin/desk";
import { generatePromoPack, settlePendingPromo } from "@/lib/admin/promo";
import { grantFounder, revokeFounder } from "@/lib/access";
import { isSolanaAddress, clientIp } from "@/lib/security";
import { mutateState, audit, pushBounded } from "@/lib/store";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  try {
    await settlePendingPromo(0);
  } catch {
    /* still serve the desk */
  }
  return NextResponse.json(buildAdminDesk());
}

const Patch = z.object({
  adminWallet: z.string().optional(),
  removeAdminWallet: z.string().optional(),
  treasuryWallet: z.string().nullable().optional(),
  liveTrading: z.boolean().optional(),
  generatePromo: z.boolean().optional(),
  contentHint: z.string().max(280).optional(),
});

export async function POST(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  const parsed = Patch.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const body = parsed.data;
  const ip = clientIp(req);

  if (body.adminWallet) {
    if (!isSolanaAddress(body.adminWallet)) return NextResponse.json({ error: "bad_wallet" }, { status: 400 });
    await mutateState((s) => {
      grantFounder(s, body.adminWallet!);
      pushBounded(s.audit, audit("admin", "admin_wallet", body.adminWallet!, ip), 400);
    });
  }
  if (body.removeAdminWallet) {
    if (!isSolanaAddress(body.removeAdminWallet)) return NextResponse.json({ error: "bad_wallet" }, { status: 400 });
    await mutateState((s) => {
      revokeFounder(s, body.removeAdminWallet!);
      pushBounded(s.audit, audit("admin", "admin_wallet_remove", body.removeAdminWallet!, ip), 400);
    });
  }
  if (body.treasuryWallet !== undefined) {
    const next = (body.treasuryWallet || "").trim();
    if (next && !isSolanaAddress(next)) return NextResponse.json({ error: "bad_treasury" }, { status: 400 });
    await mutateState((s) => {
      s.treasuryWallet = next;
      pushBounded(s.audit, audit("admin", "treasury", next ? next : "cleared", ip), 400);
    });
  }
  if (typeof body.liveTrading === "boolean") {
    await mutateState((s) => {
      s.liveTrading = body.liveTrading;
      pushBounded(s.audit, audit("admin", "live_flag", String(body.liveTrading), ip), 400);
    });
  }
  if (body.generatePromo) {
    const result = await generatePromoPack({ force: true, hint: body.contentHint });
    if (result.error && result.made === 0) {
      return NextResponse.json({ error: result.error, note: result.note, desk: buildAdminDesk() }, { status: 400 });
    }
    return NextResponse.json({ ok: true, made: result.made, note: result.note, desk: buildAdminDesk() });
  }
  return NextResponse.json({ ok: true, desk: buildAdminDesk() });
}
