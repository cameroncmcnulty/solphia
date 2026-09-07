import { NextRequest, NextResponse } from "next/server";
import { CRON_SECRET } from "@/lib/config";
import { runMarketTick } from "@/lib/tick";
import { loadState, mutateState } from "@/lib/store";
import { queueEmail } from "@/lib/email/send";
import { alertEmailHtml } from "@/lib/email/templates";
import { maybeGeneratePromos } from "@/lib/admin/promo";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization") || "";
  const q = req.nextUrl.searchParams.get("secret") || "";
  if (CRON_SECRET && auth !== `Bearer ${CRON_SECRET}` && q !== CRON_SECRET) {
    return NextResponse.json({ error: "denied" }, { status: 401 });
  }
  const tick = await runMarketTick();
  const state = loadState();
  const fresh = state.alerts.filter((a) => Date.now() - a.at < 70_000);
  if (fresh.length) {
    await mutateState(async (s) => {
      for (const user of s.users) {
        if (!user.email || !user.alertsEnabled) continue;
        if (user.subscribedUntil && user.subscribedUntil < Date.now()) continue;
        for (const alert of fresh.slice(0, 3)) {
          await queueEmail(s, user.email, alert.title, alertEmailHtml(alert));
        }
      }
    });
  }
  let promos = 0;
  try {
    const pack = await maybeGeneratePromos();
    promos = pack.made;
  } catch {
    /* tick still counts */
  }
  return NextResponse.json({ ok: true, entries: tick.entries, exits: tick.exits, equity: tick.paper.equityUsd, promos });
}
