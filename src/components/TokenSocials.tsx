"use client";

import type { MouseEvent, ReactNode } from "react";
import { DiscordMark, TelegramMark, XMark } from "@/components/SocialMarks";
import { socialHref, type SocialKind } from "@/lib/launch/links";

export type TokenLinks = {
  website?: string;
  x?: string;
  twitter?: string;
  telegram?: string;
  discord?: string;
};

function hrefOf(kind: SocialKind, raw?: string): string {
  return socialHref(kind, raw);
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

export function SocialInput({
  kind,
  value,
  onChange,
  placeholder,
  error,
  form,
}: {
  kind: "website" | "x" | "telegram" | "discord";
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  error?: string;
  form?: string;
}) {
  const Icon = kind === "website" ? Globe : kind === "x" ? XMark : kind === "telegram" ? TelegramMark : DiscordMark;
  return (
    <label
      data-field={kind}
      className={`flex items-center gap-2 rounded-2xl border bg-void px-3 py-2 text-sm text-ghost ${
        error ? "border-blood ring-1 ring-blood/60" : "border-violet/30"
      }`}
    >
      <span className={`h-4 w-4 shrink-0 ${error ? "text-blood" : "text-mute"}`}>
        <Icon />
      </span>
      <input
        type="text"
        inputMode="text"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        onInvalid={(e) => e.preventDefault()}
        value={value}
        form={form}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-invalid={Boolean(error)}
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
  const website = hrefOf("website", links.website);
  const x = hrefOf("x", links.x || links.twitter);
  const telegram = hrefOf("telegram", links.telegram);
  const discord = hrefOf("discord", links.discord);
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
          <XMark />
        </IconLink>
      )}
      {telegram && (
        <IconLink href={telegram} label="Telegram" size={size}>
          <TelegramMark />
        </IconLink>
      )}
      {discord && (
        <IconLink href={discord} label="Discord" size={size}>
          <DiscordMark />
        </IconLink>
      )}
    </span>
  );
}
