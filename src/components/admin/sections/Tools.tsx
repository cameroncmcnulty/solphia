"use client";

import { useEffect, useState } from "react";
import { DataLauncherV1 } from "./DataLauncherV1";
import { DataLauncherV2 } from "./DataLauncherV2";

type LauncherVersion = "v1" | "v2";
const STORAGE = "solphia-tools-launcher";

export function ToolsSection() {
  const [version, setVersion] = useState<LauncherVersion | null>(null);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE);
      if (saved === "v1" || saved === "v2") setVersion(saved);
    } catch {
      /* picker stays */
    }
  }, []);

  function pick(next: LauncherVersion) {
    setVersion(next);
    try {
      window.localStorage.setItem(STORAGE, next);
    } catch {
      /* session still holds it */
    }
  }

  if (!version) {
    return (
      <div className="tools-desk space-y-6">
        <section className="panel relative overflow-hidden rounded-2xl p-6">
          <div className="tools-scan" aria-hidden />
          <div className="font-mono text-[10px] tracking-[0.3em] text-acid">LAB · TOOLS</div>
          <h2 className="mt-1 font-display text-3xl text-ghost">Select a data launcher</h2>
          <p className="mt-2 max-w-2xl text-sm text-mute">
            V1 is the live launcher and stays untouched so current progress cannot be lost. V2 is a copy with the
            scrambler. Hop and final wallet secrets in V2 are append-only and can never be wiped.
          </p>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <button
              type="button"
              onClick={() => pick("v1")}
              className="rounded-2xl border border-line bg-void/50 p-5 text-left hover:border-acid/50"
            >
              <div className="font-mono text-[10px] tracking-[0.3em] text-mute">CURRENT</div>
              <div className="mt-1 font-display text-2xl text-ghost">DATA LAUNCHER V1</div>
              <p className="mt-2 text-sm text-mute">
                Wallet-to-wallet 0.5 SOL relay, 30s hop, dump at 1 SOL sniper buys. Leave this running if you are
                mid-test.
              </p>
            </button>
            <button
              type="button"
              onClick={() => pick("v2")}
              className="rounded-2xl border border-acid/40 bg-acid/5 p-5 text-left hover:border-acid"
            >
              <div className="font-mono text-[10px] tracking-[0.3em] text-acid">SCRAMBLER</div>
              <div className="mt-1 font-display text-2xl text-ghost">DATA LAUNCHER V2</div>
              <p className="mt-2 text-sm text-mute">
                Same launches plus multi-hop funding, jittered amounts and delays, optional warmup, and STOP on each
                token slot that liquidates to treasury.
              </p>
            </button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="font-mono text-[10px] tracking-[0.3em] text-mute">DATA LAUNCHER</div>
        <button
          type="button"
          onClick={() => pick("v1")}
          className={`rounded-full px-4 py-1.5 font-mono text-[11px] tracking-[0.2em] ${
            version === "v1" ? "bg-acid/15 text-acid" : "border border-line text-mute"
          }`}
        >
          V1
        </button>
        <button
          type="button"
          onClick={() => pick("v2")}
          className={`rounded-full px-4 py-1.5 font-mono text-[11px] tracking-[0.2em] ${
            version === "v2" ? "bg-acid/15 text-acid" : "border border-line text-mute"
          }`}
        >
          V2
        </button>
        <button type="button" onClick={() => setVersion(null)} className="font-mono text-[10px] text-mute underline">
          choose again
        </button>
      </div>
      {version === "v1" ? <DataLauncherV1 /> : <DataLauncherV2 />}
    </div>
  );
}
