"use client";

import { useCallback, useEffect, useState } from "react";
import { SphaMark } from "@/components/SphaMark";
import { SphaSocials } from "@/components/SphaSocials";
import { SolphiaConstellation } from "@/components/SolphiaConstellation";
import { solphiaTokenDesk, type TokenStat } from "@/lib/token/solphia";
import { Reveal } from "@/components/Reveal";
import { JoinFoundersButton } from "@/components/JoinFoundersButton";
import { SphaCountdown } from "@/components/SphaCountdown";
import { SPHA_MINT_LEAD_MS, mergeSphaPublicPack, type SphaPublicCountdown, type SphaPublicPhase } from "@/lib/token/countdown";
import { SPHA_BLURB, SPHA_DEFAULT_IMAGE, SPHA_TELEGRAM, SPHA_WEBSITE, SPHA_X } from "@/lib/token/omics";

function tick(symbol: string) {
  const s = symbol.replace(/^\$+/, "").replace(/\*+$/, "").trim();
  return s ? `$${s}` : "";
}

export type SphaPack = {
  mint: string;
  name: string;
  symbol: string;
  phase: SphaPublicPhase;
  countdown: SphaPublicCountdown;
  stats: TokenStat[];
  extra: TokenStat[];
  image: string;
  blurb: string;
  socials: { x: string; telegram: string; discord: string; website: string };
};

function emptyPack(): SphaPack {
  const desk = solphiaTokenDesk();
  return {
    mint: "",
    name: desk.name,
    symbol: desk.symbol,
    phase: "soon",
    countdown: { phase: "soon", launchAt: 0, remainingMs: 0, mintLeadMs: SPHA_MINT_LEAD_MS, serverNow: Date.now() },
    stats: [],
    extra: [],
    image: SPHA_DEFAULT_IMAGE,
    blurb: SPHA_BLURB,
    socials: { x: SPHA_X, telegram: SPHA_TELEGRAM, discord: "", website: SPHA_WEBSITE },
  };
}

export function TokenDesk({ initial }: { initial?: SphaPack }) {
  const [pack, setPack] = useState<SphaPack>(() => initial || emptyPack());
  const t = solphiaTokenDesk();
  const symbol = pack.symbol || t.symbol;
  const live = false;
  const stats = pack.stats || [];
  const extra = pack.extra || [];

  const load = useCallback(() => {
    fetch("/api/spha", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        const desk = solphiaTokenDesk();
        const phase: SphaPublicPhase = "soon";
        const next: SphaPack = {
          mint: "",
          name: typeof j?.name === "string" && j.name.trim() ? j.name.trim() : desk.name,
          symbol: typeof j?.symbol === "string" && j.symbol.trim() ? j.symbol.trim().replace(/^\$+/, "") : desk.symbol,
          phase,
          countdown: {
            phase: "soon",
            launchAt: 0,
            remainingMs: 0,
            mintLeadMs: Number(j?.countdown?.mintLeadMs) || SPHA_MINT_LEAD_MS,
            serverNow: Number(j?.countdown?.serverNow) || Date.now(),
          },
          stats: [],
          extra: [],
          image: j?.image || SPHA_DEFAULT_IMAGE,
          blurb: j?.blurb || SPHA_BLURB,
          socials: {
            x: j?.socials?.x || SPHA_X,
            telegram: j?.socials?.telegram || SPHA_TELEGRAM,
            discord: j?.socials?.discord || "",
            website: j?.socials?.website || SPHA_WEBSITE,
          },
        };
        setPack((prev) => mergeSphaPublicPack(prev, next));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    const id = window.setInterval(() => {
      if (document.hidden) return;
      load();
    }, live ? 8_000 : 2_000);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.clearInterval(id);
    };
  }, [load, live]);

  return (
    <main className="relative min-h-screen overflow-x-hidden pb-24">
      <SolphiaConstellation />
      <div className="relative z-10 mx-auto max-w-6xl px-4 pt-8 md:px-8 md:pt-14">
        <p className="font-mono text-[11px] tracking-[0.28em] text-acid">PROTOCOL TOKEN</p>
        <div className="mt-3 flex items-center gap-4">
          {pack.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={pack.image} alt="" className="h-14 w-14 rounded-2xl object-cover sm:h-16 sm:w-16" />
          ) : (
            <SphaMark className="h-14 w-14 sm:h-16 sm:w-16" />
          )}
          <h1 className="font-display text-5xl text-ghost sm:text-7xl">{tick(symbol)}</h1>
        </div>
        <p className="mt-5 max-w-2xl text-lg text-mute sm:text-xl">
          {pack.blurb || `Swaps fund listings, buybacks, and ${tick(symbol)} burns.`}
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-5">
          <SphaSocials x={pack.socials.x} telegram={pack.socials.telegram} discord={pack.socials.discord} website={pack.socials.website} />
        </div>

        <SphaCountdown
          pack={{
            mint: "",
            name: pack.name,
            symbol,
            phase: "soon",
            countdown: pack.countdown,
            stats,
            extra,
            image: pack.image,
            blurb: pack.blurb,
          }}
          onNeedRefresh={load}
        />

        <div className="mt-12 grid gap-4 sm:grid-cols-3">
          <Reveal delay={40} from="left">
            <Story
              t="Listings"
              d="A share is saved for future listings."
            />
          </Reveal>
          <Reveal delay={120}>
            <Story
              t="Buybacks"
              d="A share buys $SPHA on the open market."
            />
          </Reveal>
          <Reveal delay={200} from="right">
            <Story
              t="Burns"
              d="A share is taken out of supply."
            />
          </Reveal>
        </div>

        <div className="mt-14">
          <JoinFoundersButton />
        </div>
      </div>
    </main>
  );
}

function Story({ t, d }: { t: string; d: string }) {
  return (
    <div className="card-lift panel-bubble rounded-3xl p-6">
      <div className="font-display text-2xl text-ghost">{t}</div>
      <p className="mt-3 text-sm leading-relaxed text-mute sm:text-base">{d}</p>
    </div>
  );
}


