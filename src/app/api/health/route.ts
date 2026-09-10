import { NextResponse } from "next/server";
import { HELIUS_API_KEY, SITE_URL } from "@/lib/config";
import { liveTradingEnabled } from "@/lib/liveFlag";
import { readyState, storeInfo } from "@/lib/store";
import { heliusEnabled } from "@/lib/solana/connection";
import { treasuryAddress } from "@/lib/treasury";

export const dynamic = "force-dynamic";

export async function GET() {
  const state = await readyState();
  const store = storeInfo();
  const treasury = treasuryAddress();
  return NextResponse.json({
    ok: true,
    site: SITE_URL,
    mode: liveTradingEnabled() ? "LIVE" : "PAPER",
    helius: heliusEnabled(),
    xai: Boolean(process.env.XAI_API_KEY),
    smtp: Boolean(process.env.SMTP_HOST),
    lastTickAt: state.lastTickAt,
    tickAgeMs: state.lastTickAt ? Date.now() - state.lastTickAt : null,
    engine: Date.now() - (state.lastTickAt || 0) < 3 * 60_000 ? "live" : "stale",
    equity: state.paper.equityUsd,
    feeds: state.feedHealth,
    heliusKeyPresent: Boolean(HELIUS_API_KEY),
    durable: store.durable,
    durableKind: store.kind,
    treasurySet: Boolean(treasury),
    treasuryTail: treasury ? treasury.slice(-4) : null,
  });
}
