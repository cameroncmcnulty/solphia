import { NextResponse } from "next/server";
import { readyState } from "@/lib/store";
import { SOLPHIA_TOKEN, sphaMintOf } from "@/lib/token/solphia";
import { SPHA_DECIMALS, SPHA_SLICES, SPHA_SUPPLY } from "@/lib/token/omics";

export const dynamic = "force-dynamic";

export async function GET() {
  const s = await readyState();
  const socials = s.sphaSocials || {};
  return NextResponse.json({
    name: SOLPHIA_TOKEN.name,
    symbol: SOLPHIA_TOKEN.symbol,
    mint: sphaMintOf(s.sphaMint),
    supply: SPHA_SUPPLY,
    decimals: SPHA_DECIMALS,
    tokenomics: SPHA_SLICES,
    launch: s.sphaLaunch
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
    image: s.sphaLaunch?.image || "",
    blurb: s.sphaLaunch?.blurb || "",
    socials: {
      x: socials.x || "",
      telegram: socials.telegram || "",
      discord: socials.discord || "",
      website: socials.website || "",
    },
  });
}
