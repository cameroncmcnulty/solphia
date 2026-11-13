import { NextResponse } from "next/server";
import { readyState } from "@/lib/store";
import { SOLPHIA_TOKEN } from "@/lib/token/solphia";
import { SPHA_BLURB, SPHA_DECIMALS, SPHA_SLICES, SPHA_SUPPLY, SPHA_TELEGRAM, SPHA_WEBSITE, SPHA_X } from "@/lib/token/omics";
import { sealedPublicSphaCountdown } from "@/lib/token/countdown";
import { SPHA_DEFAULT_IMAGE } from "@/lib/token/sphaMeta";

export const dynamic = "force-dynamic";

export async function GET() {
  const s = await readyState();
  const socials = s.sphaSocials || {};
  const countdown = sealedPublicSphaCountdown();
  const launch = s.sphaLaunch || s.sphaCountdown?.pendingLaunch;
  return NextResponse.json({
    name: launch?.name || SOLPHIA_TOKEN.name,
    symbol: launch?.symbol || SOLPHIA_TOKEN.symbol,
    mint: "",
    phase: countdown.phase,
    countdown,
    supply: SPHA_SUPPLY,
    decimals: SPHA_DECIMALS,
    tokenomics: SPHA_SLICES,
    stats: [],
    extra: [],
    launch: null,
    image: launch?.image || SPHA_DEFAULT_IMAGE,
    blurb: launch?.blurb || SPHA_BLURB,
    socials: {
      x: socials.x || SPHA_X,
      telegram: socials.telegram || SPHA_TELEGRAM,
      discord: socials.discord || "",
      website: socials.website || SPHA_WEBSITE,
    },
  }, {
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}
