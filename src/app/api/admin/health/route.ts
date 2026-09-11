import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin/auth";
import { SERVICES, nextTier, tierOf, type ServiceId } from "@/lib/health/catalog";
import { mergeTiers, probeHealth, recordHealthSample, windowSamples } from "@/lib/health/probe";
import { mutateState, readyState } from "@/lib/store";
import { liveTradingEnabled } from "@/lib/liveFlag";
import { signerConfigured } from "@/lib/live/crypto";
import { pinataConfigured } from "@/lib/pinata";
import { durableKind } from "@/lib/persist";
import { HELIUS_API_KEY, XAI_API_KEY } from "@/lib/config";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const Patch = z.object({
  tiers: z
    .object({
      vercel: z.string().optional(),
      upstash: z.string().optional(),
      helius: z.string().optional(),
      pinata: z.string().optional(),
      xai: z.string().optional(),
      smtp: z.string().optional(),
      signer: z.string().optional(),
    })
    .optional(),
});

export async function GET(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  const state = await readyState();
  const probed = await probeHealth(state);
  await mutateState((s) => {
    recordHealthSample(s, probed.sample);
    if (probed.pinata.ok) {
      const last = s.healthLog?.[s.healthLog.length - 1];
      if (last) {
        last.pinataBytes = probed.pinata.bytes;
        last.pinataFiles = probed.pinata.files;
      }
    }
  });
  const log = (await readyState()).healthLog || [];
  const tiers = mergeTiers(state.healthTiers);
  return NextResponse.json({
    ok: true,
    at: Date.now(),
    liveTrading: liveTradingEnabled(),
    durableKind: durableKind(),
    keys: {
      helius: Boolean(HELIUS_API_KEY),
      xai: Boolean(XAI_API_KEY),
      pinata: pinataConfigured(),
      signer: signerConfigured(),
      smtp: Boolean(process.env.SMTP_HOST),
    },
    speeds: probed.speeds,
    pinata: probed.pinata,
    storeBytes: probed.storeBytes,
    tickAgeMs: probed.tickAgeMs,
    tiers,
    services: SERVICES.map((svc) => {
      const cur = tierOf(svc, tiers[svc.id]);
      const nxt = nextTier(svc, tiers[svc.id]);
      return {
        id: svc.id,
        name: svc.name,
        why: svc.why,
        tier: cur,
        next: nxt,
        options: svc.tiers.map((t) => ({ id: t.id, label: t.label, price: t.price })),
      };
    }),
    log24h: windowSamples(log, 24 * 3600_000),
    log7d: windowSamples(log, 7 * 24 * 3600_000),
    cronTicks24h: windowSamples(log, 24 * 3600_000).filter((s) => s.source === "tick").length,
  });
}

export async function POST(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  const parsed = Patch.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const ids = new Set(SERVICES.map((s) => s.id));
  await mutateState((s) => {
    s.healthTiers = { ...(s.healthTiers || {}) };
    for (const [k, v] of Object.entries(parsed.data.tiers || {})) {
      if (!ids.has(k as ServiceId) || !v) continue;
      const svc = SERVICES.find((x) => x.id === k);
      if (!svc?.tiers.some((t) => t.id === v)) continue;
      s.healthTiers[k as ServiceId] = v;
    }
  });
  return NextResponse.json({ ok: true });
}
