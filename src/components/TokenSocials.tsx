"use client";

import type { MouseEvent, ReactNode } from "react";

export type TokenLinks = {
  website?: string;
  x?: string;
  twitter?: string;
  telegram?: string;
  discord?: string;
};

function hrefOf(raw?: string): string {
  const s = (raw || "").trim();
  if (!s) return "";
  if (/^https?:\/\//i.test(s)) return s;
  return "";
}

function IconLink({
  href,
  label,
  size,
  children,
}: {
  href: string;
  label: string;
  size: "sm" | "md";
  children: ReactNode;
}) {
  const box = size === "sm" ? "h-8 w-8" : "h-10 w-10";
  const svg = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      title={label}
      aria-label={label}
      onClick={(e: MouseEvent) => e.stopPropagation()}
      className={`inline-flex ${box} shrink-0 items-center justify-center rounded-full border border-violet/40 text-mute transition hover:border-acid hover:text-acid`}
    >
      <span className={svg}>{children}</span>
    </a>
  );
}

function Globe() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-full w-full">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.8 2.6 4.2 6 4.2 9s-1.4 6.4-4.2 9c-2.8-2.6-4.2-6-4.2-9s1.4-6.4 4.2-9z" />
    </svg>
  );
}

function XLogo() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-full w-full">
      <path d="M18.9 2.4h3.2l-7 8.1 8.3 11.1h-6.5l-5.1-6.7-5.8 6.7H2.8l7.5-8.7L2.2 2.4h6.7l4.6 6.1 5.4-6.1zm-1.1 17.3h1.8L6.4 4.2H4.5l13.3 15.5z" />
    </svg>
  );
}

function Telegram() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-full w-full">
      <path d="M21.7 4.3 18.4 20c-.2 1-1.2 1.4-2 .9l-5.5-4.2-2.7 2.6c-.3.3-.7.4-1.1.2l.4-6.1 10.9-9.8c.5-.4 1 .2.7.7L8.6 13.4 4 11.9c-1-.3-1-1.3.1-1.7l16.4-6.3c.9-.3 1.6.5 1.2 1.4z" />
    </svg>
  );
}

function Discord() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-full w-full">
      <path d="M19.3 4.8A17 17 0 0 0 14.9 3.6l-.5 1c-1.5-.2-3-.2-4.5 0l-.5-1A17 17 0 0 0 4.7 4.8C2.3 8.4 1.7 11.9 2 15.4a17.4 17.4 0 0 0 5.3 2.7l.8-1.3a11 11 0 0 1-1.6-.8l.4-.3c3.1 1.5 6.5 1.5 9.6 0l.4.3c-.5.3-1 .6-1.6.8l.8 1.3a17.4 17.4 0 0 0 5.3-2.7c.4-4 .1-7.4-1.1-10.6zM9.2 13.8c-.8 0-1.5-.8-1.5-1.7s.7-1.7 1.5-1.7 1.5.8 1.5 1.7-.6 1.7-1.5 1.7zm5.6 0c-.8 0-1.5-.8-1.5-1.7s.7-1.7 1.5-1.7 1.5.8 1.5 1.7-.7 1.7-1.5 1.7z" />
    </svg>
  );
}

export function SocialInput({
  kind,
  value,
  onChange,
  placeholder,
}: {
  kind: "website" | "x" | "telegram" | "discord";
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  const Icon = kind === "website" ? Globe : kind === "x" ? XLogo : kind === "telegram" ? Telegram : Discord;
  return (
    <label className="flex items-center gap-2 rounded-2xl border border-violet/30 bg-void px-3 py-2 text-sm text-ghost">
      <span className="h-4 w-4 shrink-0 text-mute">
        <Icon />
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-transparent outline-none"
      />
    </label>
  );
}

export function TokenSocials({
  links,
  size = "sm",
}: {
  links?: TokenLinks | null;
  size?: "sm" | "md";
}) {
  if (!links) return null;
  const website = hrefOf(links.website);
  const x = hrefOf(links.x || links.twitter);
  const telegram = hrefOf(links.telegram);
  const discord = hrefOf(links.discord);
  if (!website && !x && !telegram && !discord) return null;
  return (
    <span className="inline-flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
      {website && (
        <IconLink href={website} label="Website" size={size}>
          <Globe />
        </IconLink>
      )}
      {x && (
        <IconLink href={x} label="X" size={size}>
          <XLogo />
        </IconLink>
      )}
      {telegram && (
        <IconLink href={telegram} label="Telegram" size={size}>
          <Telegram />
        </IconLink>
      )}
      {discord && (
        <IconLink href={discord} label="Discord" size={size}>
          <Discord />
        </IconLink>
      )}
    </span>
  );
}
