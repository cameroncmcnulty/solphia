"use client";

import type { ReactNode } from "react";

const TEAL = "#14F195";

function XLogo() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden>
      <path d="M18.9 2.4h3.2l-7 8.1 8.3 11.1h-6.5l-5.1-6.7-5.8 6.7H2.8l7.5-8.7L2.2 2.4h6.7l4.6 6.1 5.4-6.1zm-1.1 17.3h1.8L6.4 4.2H4.5l13.3 15.5z" />
    </svg>
  );
}

function Telegram() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden>
      <path d="M21.7 4.3 18.4 20c-.2 1-1.2 1.4-2 .9l-5.5-4.2-2.7 2.6c-.3.3-.7.4-1.1.2l.4-6.1 10.9-9.8c.5-.4 1 .2.7.7L8.6 13.4 4 11.9c-1-.3-1-1.3.1-1.7l16.4-6.3c.9-.3 1.6.5 1.2 1.4z" />
    </svg>
  );
}

function Discord() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden>
      <path d="M19.3 4.8A17 17 0 0 0 14.9 3.6l-.5 1c-1.5-.2-3-.2-4.5 0l-.5-1A17 17 0 0 0 4.7 4.8C2.3 8.4 1.7 11.9 2 15.4a17.4 17.4 0 0 0 5.3 2.7l.8-1.3a11 11 0 0 1-1.6-.8l.4-.3c3.1 1.5 6.5 1.5 9.6 0l.4.3c-.5.3-1 .6-1.6.8l.8 1.3a17.4 17.4 0 0 0 5.3-2.7c.4-4 .1-7.4-1.1-10.6zM9.2 13.8c-.8 0-1.5-.8-1.5-1.7s.7-1.7 1.5-1.7 1.5.8 1.5 1.7-.6 1.7-1.5 1.7zm5.6 0c-.8 0-1.5-.8-1.5-1.7s.7-1.7 1.5-1.7 1.5.8 1.5 1.7-.7 1.7-1.5 1.7z" />
    </svg>
  );
}

function TealIcon({
  href,
  label,
  children,
}: {
  href?: string;
  label: string;
  children: ReactNode;
}) {
  const live = Boolean(href);
  const cls = `inline-flex h-12 w-12 items-center justify-center rounded-full border sm:h-14 sm:w-14 ${
    live
      ? "border-[#14F195]/50 bg-[#14F195]/12 text-[#14F195] shadow-[0_0_18px_rgba(20,241,149,0.18)] transition hover:bg-[#14F195] hover:text-[#04000a]"
      : "cursor-default border-[#14F195]/25 bg-[#14F195]/8 text-[#14F195]/45"
  }`;
  if (live) {
    return (
      <a href={href} target="_blank" rel="noreferrer" aria-label={label} title={label} className={cls}>
        {children}
      </a>
    );
  }
  return (
    <span aria-label={`${label} coming soon`} title={`${label} — link not set`} className={cls}>
      {children}
    </span>
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
  return (
    <div className="flex items-center gap-3" style={{ color: TEAL }}>
      <TealIcon href={x} label="X">
        <XLogo />
      </TealIcon>
      <TealIcon href={telegram} label="Telegram">
        <Telegram />
      </TealIcon>
      <TealIcon href={discord} label="Discord">
        <Discord />
      </TealIcon>
    </div>
  );
}
