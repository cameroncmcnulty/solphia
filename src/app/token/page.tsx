"use client";

import { useEffect, useState } from "react";
import { CopyCa } from "@/components/CopyCa";
import { SphaMark } from "@/components/SphaMark";
import { SphaSocials } from "@/components/SphaSocials";
import { SolphiaConstellation } from "@/components/SolphiaConstellation";
import { solphiaTokenDesk } from "@/lib/token/solphia";
import { Reveal } from "@/components/Reveal";
import { Tokenomics } from "@/components/Tokenomics";
import { SphaRoadmap } from "@/components/SphaRoadmap";
import { JoinFoundersButton } from "@/components/JoinFoundersButton";

function tick(symbol: string) {
  const s = symbol.replace(/^\$+/, "").replace(/\*+$/, "").trim();
  return s ? `$${s}` : "";
}

export default function TokenPage() {
  const [t, setT] = useState(() => solphiaTokenDesk());
  const [socials, setSocials] = useState({ x: "", telegram: "", discord: "" });
  const [art, setArt] = useState("");
  const [blurb, setBlurb] = useState("");

  useEffect(() => {
    fetch("/api/spha", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        if (j?.socials) setSocials({ x: j.socials.x || "", telegram: j.socials.telegram || "", discord: j.socials.discord || "" });
        if (typeof j?.mint === "string") setT(solphiaTokenDesk(j.mint));
        if (j?.image) setArt(j.image);
        if (j?.blurb) setBlurb(j.blurb);
      })
      .catch(() => {});
  }, []);

  return (
    <main className="pump-shell">
      <div className="pump-wrap md:!max-w-3xl">
        <p className="text-[13px] font-medium text-[#14f195]">Protocol token</p>
        <div className="mt-3 flex items-center gap-4">
          {art ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={art} alt="" className="h-14 w-14 rounded-[18px] object-cover sm:h-16 sm:w-16" />
          ) : (
            <SphaMark className="h-14 w-14 sm:h-16 sm:w-16" />
          )}
          <h1 className="pump-h1 text-[40px] sm:text-6xl">{tick(t.symbol)}</h1>
        </div>
        <p className="pump-p mt-4 max-w-2xl sm:text-[17px]">
          {blurb || `Swaps fund listings, buybacks, and ${tick(t.symbol)} burns.`}
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-5">
          <SphaSocials x={socials.x} telegram={socials.telegram} discord={socials.discord} />
          <CopyCa ca={t.mint || undefined} />
        </div>

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

        <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {t.stats.map((s) => (
            <Bubble key={s.k} k={s.k} v={s.v} hint={s.hint} />
          ))}
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {t.extra.map((s) => (
            <Bubble key={s.k} k={s.k} v={s.v} />
          ))}
        </div>

        <div className="mt-10">
          <Tokenomics />
        </div>

        <div className="mt-16 md:mt-24">
          <SphaRoadmap />
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
    <div className="border-b border-white/[0.06] py-4 sm:rounded-[22px] sm:border sm:border-white/10 sm:bg-black/30 sm:p-6">
      <div className="text-[17px] font-semibold tracking-tight text-white">{t}</div>
      <p className="mt-1 text-[15px] leading-relaxed text-white/45">{d}</p>
    </div>
  );
}

function Bubble({ k, v, hint }: { k: string; v: string; hint?: string }) {
  return (
    <div className="rounded-[22px] border border-white/10 bg-black/30 px-4 py-4">
      <div className="text-[12px] font-medium text-white/40">{k}</div>
      <div className="mt-1 text-[22px] font-semibold tabular-nums tracking-tight text-white sm:text-3xl">{v}</div>
      {hint && <div className="mt-1 font-mono text-[10px] text-mute">{hint}</div>}
    </div>
  );
}
