"use client";

import type { ReactNode } from "react";
import { DiscordMark, TelegramMark, XMark } from "@/components/SocialMarks";
import { socialHref } from "@/lib/launch/links";

const TEAL = "#14F195";

function TealIcon({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={label}
      title={label}
      className="group relative inline-flex h-12 w-12 items-center justify-center rounded-full text-[#14F195] transition duration-200 hover:text-[#04000a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#14F195] sm:h-14 sm:w-14"
    >
      <span
        aria-hidden
        className="absolute inset-0 rounded-full border border-[#14F195]/65 bg-[linear-gradient(180deg,rgba(20,241,149,0.22),rgba(20,241,149,0.08))] shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_0_22px_rgba(20,241,149,0.22)] transition duration-200 group-hover:border-[#14F195] group-hover:bg-[#14F195] group-hover:shadow-[0_0_28px_rgba(20,241,149,0.55)]"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-px rounded-full bg-[radial-gradient(circle_at_32%_22%,rgba(255,255,255,0.32),transparent_46%)]"
      />
      <span className="relative flex items-center justify-center">{children}</span>
    </a>
  );
}

export function SphaSocials({
  x,
  telegram,
  discord,
}: {
  x?: string;
  telegram?: string;
  discord?: string;
}) {
  const links = [
    { href: socialHref("x", x), label: "X", node: <XMark className="h-[17px] w-[17px] sm:h-[19px] sm:w-[19px]" /> },
    { href: socialHref("telegram", telegram), label: "Telegram", node: <TelegramMark className="h-[22px] w-[22px] sm:h-[26px] sm:w-[26px]" /> },
    { href: socialHref("discord", discord), label: "Discord", node: <DiscordMark className="h-[22px] w-[22px] sm:h-[26px] sm:w-[26px]" /> },
  ].filter((l) => l.href);
  if (!links.length) return null;
  return (
    <div className="flex items-center gap-3" style={{ color: TEAL }}>
      {links.map((l) => (
        <TealIcon key={l.label} href={l.href} label={l.label}>
          {l.node}
        </TealIcon>
      ))}
    </div>
  );
}
