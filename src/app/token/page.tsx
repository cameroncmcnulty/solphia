import { TokenDesk } from "@/components/TokenDesk";
import { readyState } from "@/lib/store";
import { publicSphaCountdown } from "@/lib/token/countdown";
import { SPHA_BLURB, SPHA_DEFAULT_IMAGE, SPHA_TELEGRAM, SPHA_WEBSITE, SPHA_X } from "@/lib/token/omics";
import { sphaMintOf, solphiaTokenDesk } from "@/lib/token/solphia";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function TokenPage() {
  const s = await readyState();
  const mint = sphaMintOf(s.sphaMint);
  const now = Date.now();
  const countdown = publicSphaCountdown(s.sphaCountdown, mint, now);
  const pending = s.sphaCountdown?.pendingLaunch;
  const launch = mint && s.sphaLaunch ? s.sphaLaunch : pending?.symbol ? pending : s.sphaLaunch;
  const desk = solphiaTokenDesk(mint);
  const socials = s.sphaSocials || {};
  return (
    <TokenDesk
      initial={{
        mint,
        name: launch?.name || desk.name,
        symbol: (launch?.symbol || desk.symbol).replace(/^\$+/, ""),
        phase: countdown.phase,
        countdown,
        stats: desk.stats,
        extra: desk.extra,
        image: launch?.image || SPHA_DEFAULT_IMAGE,
        blurb: launch?.blurb || SPHA_BLURB,
        socials: {
          x: socials.x || SPHA_X,
          telegram: socials.telegram || SPHA_TELEGRAM,
          discord: socials.discord || "",
          website: socials.website || SPHA_WEBSITE,
        },
      }}
    />
  );
}
