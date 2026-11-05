import { NextResponse } from "next/server";
import { readyState } from "@/lib/store";
import { SOLPHIA_TOKEN, sphaMintOf } from "@/lib/token/solphia";
import { SPHA_DECIMALS, SPHA_SLICES, SPHA_SUPPLY } from "@/lib/token/omics";
import { publicSphaCountdown } from "@/lib/token/countdown";
import { loadSphaLiveStats, sphaDeskStats } from "@/lib/token/sphaDesk";

export const dynamic = "force-dynamic";

export async function GET() {
  const s = await readyState();
  const socials = s.sphaSocials || {};
  const mint = sphaMintOf(s.sphaMint);
  const now = Date.now();
  const countdown = publicSphaCountdown(s.sphaCountdown, mint, now);
  const live = mint ? await loadSphaLiveStats(mint).catch(() => null) : null;
  const desk = sphaDeskStats(mint, live);
  return NextResponse.json({
    name: SOLPHIA_TOKEN.name,
    symbol: SOLPHIA_TOKEN.symbol,
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
    image: mint ? s.sphaLaunch?.image || "" : "",
    blurb: s.sphaLaunch?.blurb || "",
    socials: {
      x: socials.x || "",
      telegram: socials.telegram || "",
      discord: socials.discord || "",
      website: socials.website || "",
    },
  }, {
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}
