import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin/auth";
import { loadState, mutateState, audit, pushBounded } from "@/lib/store";
import { publicBook } from "@/lib/tick";
import { DEFAULT_SETTINGS, LIVE_TRADING } from "@/lib/config";
import { heliusEnabled } from "@/lib/solana/connection";
import { clientIp } from "@/lib/security";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  const s = loadState();
  return NextResponse.json({
    paper: publicBook(s.paper),
    settings: s.settings,
    users: s.users,
    emails: s.emails.slice(-50).reverse().map((e) => ({ ...e, html: undefined, htmlBytes: e.html.length })),
    alerts: s.alerts.slice(-50).reverse(),
    audit: s.audit.slice(-80).reverse(),
    feedHealth: s.feedHealth,
    creators: Object.values(s.creators).sort((a, b) => b.tokens - a.tokens).slice(0, 40),
    liveTrading: LIVE_TRADING,
    helius: heliusEnabled(),
    defaults: DEFAULT_SETTINGS,
  });
}

const Patch = z.object({
  settings: z.record(z.number()).optional(),
  watchWallet: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  const parsed = Patch.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  await mutateState((s) => {
    if (parsed.data.settings) {
      s.settings = { ...s.settings, ...parsed.data.settings };
      pushBounded(s.audit, audit("admin", "settings", JSON.stringify(parsed.data.settings), clientIp(req)), 400);
    }
    if (parsed.data.watchWallet) {
      if (!s.watchWallets.includes(parsed.data.watchWallet)) s.watchWallets.push(parsed.data.watchWallet);
      pushBounded(s.audit, audit("admin", "watch", parsed.data.watchWallet, clientIp(req)), 400);
    }
  });
  return NextResponse.json({ ok: true, settings: loadState().settings });
}
