"use client";

import { useState, type MouseEvent } from "react";

function shortCa(ca: string) {
  if (ca.length <= 12) return ca;
  return `${ca.slice(0, 4)}…${ca.slice(-4)}`;
}

async function writeClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const el = document.createElement("textarea");
      el.value = text;
      el.setAttribute("readonly", "");
      el.style.position = "fixed";
      el.style.left = "-9999px";
      document.body.appendChild(el);
      el.select();
      const ok = document.execCommand("copy");
      el.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

export function CopyCa({
  ca,
  compact = false,
}: {
  ca: string;
  compact?: boolean;
}) {
  const [ok, setOk] = useState(false);
  if (!ca) return null;

  async function copy(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const wrote = await writeClipboard(ca);
    if (!wrote) return;
    setOk(true);
    window.setTimeout(() => setOk(false), 1600);
  }

  if (compact) {
    return (
      <button
        type="button"
        onClick={copy}
        title="Copy contract address"
        className={`shrink-0 rounded-full border px-2 py-0.5 font-mono text-[10px] tracking-wide ${
          ok ? "border-acid text-acid" : "border-violet/40 text-mute hover:border-acid hover:text-acid"
        }`}
      >
        {ok ? "copied" : `CA ${shortCa(ca)}`}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={copy}
      title="Copy contract address"
      className={`flex min-h-[44px] w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left font-mono text-sm sm:w-auto ${
        ok ? "border-acid bg-acid/10 text-acid" : "border-acid/50 text-ghost hover:bg-acid/10"
      }`}
    >
      <span className="min-w-0">
        <span className="block text-[10px] tracking-[0.2em] text-mute">CA</span>
        <span className="block truncate">{ca}</span>
      </span>
      <span className="shrink-0 rounded-full bg-acid px-3 py-1 text-[11px] font-semibold tracking-wide text-void">
        {ok ? "COPIED" : "COPY"}
      </span>
    </button>
  );
}
