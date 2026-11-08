import { NextResponse } from "next/server";
import { readyState } from "@/lib/store";
import { SOLPHIA_TOKEN, sphaMintOf } from "@/lib/token/solphia";
import { SPHA_BLURB, SPHA_DECIMALS, SPHA_SLICES, SPHA_SUPPLY, SPHA_TELEGRAM, SPHA_WEBSITE, SPHA_X } from "@/lib/token/omics";
import { publicSphaCountdown } from "@/lib/token/countdown";
import { loadSphaLiveStats, sphaDeskStats } from "@/lib/token/sphaDesk";
import { SPHA_DEFAULT_IMAGE } from "@/lib/token/sphaMeta";

export const dynamic = "force-dynamic";

export async function GET() {
  const s = await readyState();
  const socials = s.sphaSocials || {};
  const mint = sphaMintOf(s.sphaMint);
  const now = Date.now();
  const countdown = publicSphaCountdown(s.sphaCountdown, mint, now);
  const pending = s.sphaCountdown?.pendingLaunch;
  const launch = mint && s.sphaLaunch ? s.sphaLaunch : pending?.symbol ? pending : s.sphaLaunch;
  const live = mint ? await loadSphaLiveStats(mint).catch(() => null) : null;
  const desk = sphaDeskStats(mint, live);
  return NextResponse.json({
    name: launch?.name || SOLPHIA_TOKEN.name,
    symbol: launch?.symbol || SOLPHIA_TOKEN.symbol,
    mint,
    phase: countdown.phase,
    countdown,
    supply: SPHA_SUPPLY,
    decimals: SPHA_DECIMALS,
    tokenomics: SPHA_SLICES,
    stats: desk.stats,
    extra: desk.extra,
    launch: mint && s.sphaLaunch
      ? {
          mint: s.sphaLaunch.mint,
          network: s.sphaLaunch.network,
          launchedAt: s.sphaLaunch.launchedAt,
          name: s.sphaLaunch.name,
          symbol: s.sphaLaunch.symbol,
          image: s.sphaLaunch.image || "",
          blurb: s.sphaLaunch.blurb || "",
        }
      : null,
    image: launch?.image || (countdown.phase === "counting" || countdown.phase === "live" ? SPHA_DEFAULT_IMAGE : ""),
    blurb: launch?.blurb || (countdown.phase === "counting" || countdown.phase === "live" ? SPHA_BLURB : ""),
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
