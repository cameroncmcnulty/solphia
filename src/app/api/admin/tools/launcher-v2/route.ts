import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin, withAdminSession } from "@/lib/admin/auth";
import {
  archiveCampaign,
  campaignFuel,
  campaignSummary,
  extractV2ToTreasury,
  loadCampaign,
  loadLaunchArchive,
  pauseCampaign,
  previewV2Extract,
  publicCampaign,
  refreshSnipers,
  resetCampaign,
  resumeCampaign,
  startCampaign,
  stopCampaign,
  stopToken,
  tickBatchLaunch,
} from "@/lib/tools/batchLaunchV2";
import {
  DEFAULT_NARRATIVE,
  DEFAULT_NARRATIVE_PCT,
  DEFAULT_RANDOM,
  splitMix,
  windowMsFromBody,
} from "@/lib/tools/identities";
import { DEFAULT_SCRAMBLER, DELAY_MS_MAX, DELAY_MS_MIN, normalizeScrambler } from "@/lib/tools/scrambler";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const Body = z.object({
  action: z.enum(["start", "pause", "resume", "stop", "reset", "tick", "extractLaunched", "stopToken"]),
  tokenId: z.string().min(1).max(80).optional(),
  narrative: z.number().int().min(0).max(400).optional(),
  random: z.number().int().min(0).max(400).optional(),
  total: z.number().int().min(1).max(400).optional(),
  narrativePct: z.number().min(0).max(100).optional(),
  windowHours: z.number().min(0.05).max(24).optional(),
  windowMinutes: z.number().min(1).max(1440).optional(),
  hopsMin: z.number().int().min(1).max(12).optional(),
  hopsMax: z.number().int().min(1).max(12).optional(),
  delayMinSec: z.number().min(1).max(1800).optional(),
  delayMaxSec: z.number().min(1).max(1800).optional(),
  branch: z.boolean().optional(),
  warmup: z.boolean().optional(),
  warmupMints: z.array(z.string().min(32).max(44)).max(24).optional(),
});

async function desk() {
  const campaign = publicCampaign(await loadCampaign());
  let archive = await loadLaunchArchive().catch(() => []);
  try {
    archive = await archiveCampaign(campaign);
  } catch {
    /* persisted archive still loads */
  }
  const fuel = await campaignFuel(campaign);
  const sweep = await previewV2Extract().catch(() => null);
  return { campaign, fuel, summary: campaignSummary(campaign), sweep, archive, version: "v2" as const };
}

export async function GET(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  try {
    await refreshSnipers(16);
  } catch {
    /* desk still loads */
  }
  return withAdminSession(NextResponse.json({ ok: true, ...(await desk()) }));
}

export async function POST(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const b = parsed.data;
  try {
    if (b.action === "start") {
      const mix = b.total
        ? splitMix(b.total, b.narrativePct ?? DEFAULT_NARRATIVE_PCT)
        : { narrative: b.narrative ?? DEFAULT_NARRATIVE, random: b.random ?? DEFAULT_RANDOM };
      const started = await startCampaign({
        narrative: mix.narrative,
        random: mix.random,
        windowMs: windowMsFromBody({ windowMinutes: b.windowMinutes, windowHours: b.windowHours }),
        scrambler: normalizeScrambler({
          hopsMin: b.hopsMin ?? DEFAULT_SCRAMBLER.hopsMin,
          hopsMax: b.hopsMax ?? DEFAULT_SCRAMBLER.hopsMax,
          delayMinMs: b.delayMinSec != null ? Math.floor(b.delayMinSec * 1000) : DELAY_MS_MIN,
          delayMaxMs: b.delayMaxSec != null ? Math.floor(b.delayMaxSec * 1000) : DELAY_MS_MAX,
          branch: b.branch,
          warmup: b.warmup,
          warmupMints: b.warmupMints,
        }),
      });
      if (!started.ok) {
        return NextResponse.json({ error: "start_failed", message: started.error, fuel: started.fuel }, { status: 400 });
      }
      try {
        await tickBatchLaunch({ limit: 1 });
      } catch {
        /* cron continues the rest */
      }
      return withAdminSession(NextResponse.json({ ok: true, ...(await desk()) }));
    }
    if (b.action === "pause") await pauseCampaign();
    else if (b.action === "resume") {
      await resumeCampaign();
      try {
        await tickBatchLaunch({ limit: 1 });
      } catch {
        /* cron continues */
      }
    } else if (b.action === "stop") await stopCampaign();
    else if (b.action === "reset") await resetCampaign();
    else if (b.action === "tick") await tickBatchLaunch({ limit: 1 });
    else if (b.action === "stopToken") {
      if (!b.tokenId) return NextResponse.json({ error: "bad_request", message: "tokenId required" }, { status: 400 });
      await stopToken(b.tokenId);
    } else if (b.action === "extractLaunched") {
      const result = await extractV2ToTreasury();
      if (!result.ok) {
        return NextResponse.json(
          { error: "sweep_failed", message: result.error, sweepResult: result, ...(await desk()) },
          { status: 400 },
        );
      }
      return withAdminSession(NextResponse.json({ ok: true, sweepResult: result, ...(await desk()) }));
    }
    return withAdminSession(NextResponse.json({ ok: true, ...(await desk()) }));
  } catch (e) {
    const message = e instanceof Error ? e.message : "Tools launcher V2 failed.";
    return NextResponse.json({ error: "tools_failed", message }, { status: 400 });
  }
}
