import { NextRequest, NextResponse } from "next/server";
import { CRON_SECRET } from "@/lib/config";
import { runMarketTick } from "@/lib/tick";
import { loadState, mutateState, readyState } from "@/lib/store";
import { sphaLaunchMints } from "@/lib/token/omics";
import { queueEmail } from "@/lib/email/send";
import { alertEmailHtml } from "@/lib/email/templates";
import { maybeGeneratePromos } from "@/lib/admin/promo";
import { runHouseShill } from "@/lib/shill/house";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization") || "";
  const q = req.nextUrl.searchParams.get("secret") || "";
  const vercelCron = req.headers.get("x-vercel-cron") === "1";
  if (CRON_SECRET && !vercelCron && auth !== `Bearer ${CRON_SECRET}` && q !== CRON_SECRET) {
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
  let houseShares = 0;
  let houseVotes = 0;
  try {
    const house = await runHouseShill();
    houseShares = house.shares;
    houseVotes = house.votes;
  } catch {
    /* tick still counts */
  }
  let partnerClaims = 0;
  let partnerSol = 0;
  try {
    const s = await readyState();
    const mints = [...new Set([
      ...sphaLaunchMints(s),
      ...(s.launch?.coins || []).map((c) => c.mint || "").filter(Boolean),
    ])];
    const swept = await (await import("@/lib/launch/partnerSweep")).sweepPartnerFees({ mints, limit: 4 });
    partnerClaims = swept.claimed;
    partnerSol = swept.sol;
  } catch {
    /* tick still counts */
  }
  let sphaCountdown = null;
  try {
    sphaCountdown = await (await import("@/lib/token/sphaAutoLaunch")).tickSphaCountdown();
  } catch {
    /* tick still counts */
  }
  let batchLaunch = null;
  try {
    const tools = await import("@/lib/tools/batchLaunch");
    batchLaunch = await tools.tickBatchLaunch({ limit: 2 });
    await tools.refreshSnipers(8);
  } catch {
    /* tick still counts */
  }
  return NextResponse.json({
    ok: true,
    entries: tick.entries,
    exits: tick.exits,
    equity: tick.paper?.equityUsd ?? 0,
    promos,
    houseShares,
    houseVotes,
    partnerClaims,
    partnerSol,
    sphaCountdown,
    batchLaunch,
    lastTickAt: Date.now(),
    liveTrading: tick.liveTrading,
    liveFills: tick.liveFills,
  });
}
