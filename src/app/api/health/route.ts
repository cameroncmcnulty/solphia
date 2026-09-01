import { NextResponse } from "next/server";
import { HELIUS_API_KEY, LIVE_TRADING, SITE_URL } from "@/lib/config";
import { loadState } from "@/lib/store";
import { heliusEnabled } from "@/lib/solana/connection";

export const dynamic = "force-dynamic";

export async function GET() {
  const state = loadState();
  return NextResponse.json({
    ok: true,
    site: SITE_URL,
    mode: LIVE_TRADING ? "LIVE" : "PAPER",
    helius: heliusEnabled(),
    xai: Boolean(process.env.XAI_API_KEY),
    smtp: Boolean(process.env.SMTP_HOST),
    lastTickAt: state.lastTickAt,
    equity: state.paper.equityUsd,
    feeds: state.feedHealth,
    heliusKeyPresent: Boolean(HELIUS_API_KEY),
  });
}
