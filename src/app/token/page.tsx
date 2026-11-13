import { TokenDesk } from "@/components/TokenDesk";
import { readyState } from "@/lib/store";
import { sealedPublicSphaCountdown } from "@/lib/token/countdown";
import { SPHA_BLURB, SPHA_DEFAULT_IMAGE, SPHA_TELEGRAM, SPHA_WEBSITE, SPHA_X } from "@/lib/token/omics";
import { solphiaTokenDesk } from "@/lib/token/solphia";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function TokenPage() {
  const s = await readyState();
  const countdown = sealedPublicSphaCountdown();
  const launch = s.sphaLaunch || s.sphaCountdown?.pendingLaunch;
  const desk = solphiaTokenDesk();
  const socials = s.sphaSocials || {};
  return (
    <TokenDesk
      initial={{
        mint: "",
        name: launch?.name || desk.name,
        symbol: (launch?.symbol || desk.symbol).replace(/^\$+/, ""),
        phase: countdown.phase,
        countdown,
        stats: [],
        extra: [],
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
