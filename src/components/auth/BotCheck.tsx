"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type BotFields = {
  website: string;
  challengeToken: string;
  challengeAnswer: string;
  turnstile: string;
};

const empty: BotFields = { website: "", challengeToken: "", challengeAnswer: "", turnstile: "" };

export function BotCheck({
  onChange,
}: {
  onChange: (fields: BotFields) => void;
}) {
  const [prompt, setPrompt] = useState("");
  const [siteKey, setSiteKey] = useState<string | null>(null);
  const [fields, setFields] = useState<BotFields>(empty);
  const [loadErr, setLoadErr] = useState("");
  const box = useRef<HTMLDivElement>(null);
  const widget = useRef<string | null>(null);
  const live = useRef<BotFields>(empty);
  const seq = useRef(0);

  const emit = useCallback(
    (patch: Partial<BotFields>) => {
      const next = { ...live.current, ...patch };
      live.current = next;
      setFields(next);
      onChange(next);
    },
    [onChange],
  );

  const load = useCallback(() => {
    const n = ++seq.current;
    setLoadErr("");
    fetch("/api/auth/challenge", { cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw new Error("challenge");
        return r.json();
      })
      .then((j) => {
        if (n !== seq.current) return;
        const token = typeof j.token === "string" ? j.token : "";
        const nextPrompt = typeof j.prompt === "string" ? j.prompt : "";
        if (!token || !nextPrompt) throw new Error("challenge");
        setPrompt(nextPrompt);
        setSiteKey(typeof j.turnstileSiteKey === "string" && j.turnstileSiteKey ? j.turnstileSiteKey : null);
        emit({ challengeToken: token, challengeAnswer: "", turnstile: "" });
      })
      .catch(() => {
        if (n !== seq.current) return;
        setPrompt("");
        setLoadErr("Could not load the bot check. Tap retry.");
      });
  }, [emit]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!siteKey || !box.current) return;
    const w = window as Window & {
      turnstile?: {
        render: (el: HTMLElement, opts: { sitekey: string; callback: (t: string) => void; "expired-callback": () => void }) => string;
        remove: (id: string) => void;
      };
    };
    function mount() {
      if (!box.current || !w.turnstile) return;
      if (widget.current) {
        try {
          w.turnstile.remove(widget.current);
        } catch {
          /* ignore */
        }
        widget.current = null;
      }
      widget.current = w.turnstile.render(box.current, {
        sitekey: siteKey!,
        callback: (t) => emit({ turnstile: t }),
        "expired-callback": () => emit({ turnstile: "" }),
      });
    }
    if (w.turnstile) {
      mount();
      return;
    }
    const existing = document.querySelector("script[data-solphia-turnstile]");
    if (existing) {
      existing.addEventListener("load", mount);
      return () => existing.removeEventListener("load", mount);
    }
    const s = document.createElement("script");
    s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    s.async = true;
    s.setAttribute("data-solphia-turnstile", "1");
    s.addEventListener("load", mount);
    document.head.appendChild(s);
    return () => s.removeEventListener("load", mount);
  }, [siteKey, emit]);

  return (
    <div className="mt-3">
      <label className="sr-only">
        Website
        <input
          tabIndex={-1}
          autoComplete="off"
          value={fields.website}
          onChange={(e) => emit({ website: e.target.value })}
          className="absolute left-[-9999px] h-0 w-0 opacity-0"
        />
      </label>
      {siteKey ? (
        <div ref={box} className="min-h-[65px]" />
      ) : (
        <label className="block">
          <span className="font-mono text-[11px] tracking-[0.16em] text-white/40">BOT CHECK</span>
          <p className="mt-1 text-[15px] text-ghost">{prompt || (loadErr ? loadErr : "Loading…")}</p>
          <input
            inputMode="numeric"
            autoComplete="off"
            value={fields.challengeAnswer}
            onChange={(e) => emit({ challengeAnswer: e.target.value.replace(/[^\d]/g, "").slice(0, 4) })}
            placeholder="Answer"
            className="mt-2 min-h-[44px] w-full rounded-2xl border border-white/10 bg-white/[0.06] px-3 font-mono text-[16px] text-white outline-none"
          />
          {loadErr ? (
            <button type="button" className="mt-2 text-[13px] text-acid" onClick={() => load()}>
              Retry
            </button>
          ) : null}
        </label>
      )}
    </div>
  );
}
