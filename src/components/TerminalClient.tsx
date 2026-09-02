"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useMarket } from "@/lib/hooks";
import { TokenTable } from "./TokenTable";
import type { Strategy } from "@/lib/types";

const TABS = [
  { id: "all", label: "All" },
  { id: "likes", label: "She likes" },
  { id: "book", label: "Book" },
] as const;

function deskToTab(desk: string): "all" | "likes" | "book" {
  if (desk === "book") return "book";
  if (desk === "likes" || desk === "picks" || desk === "launch" || desk === "migrate" || desk === "snipers") {
    return "likes";
  }
  return "all";
}

function deskStrategy(desk: string): Strategy | undefined {
  if (desk === "picks") return "solphia_pick";
  if (desk === "launch" || desk === "snipers") return "launch_snipe";
  if (desk === "migrate") return "migration_snipe";
  return undefined;
}

export function TerminalClient({ forcedDesk }: { forcedDesk?: string }) {
  const params = useSearchParams();
  const fromUrl = forcedDesk || params.get("desk") || "all";
  const [tab, setTab] = useState<"all" | "likes" | "book">(deskToTab(fromUrl));
  const [focus, setFocus] = useState<Strategy | undefined>(deskStrategy(fromUrl));
  const { data, err, loading, refresh } = useMarket(12000);
  const [msg, setMsg] = useState("");
  const paper = data?.paper;

  useEffect(() => {
    setTab(deskToTab(fromUrl));
    setFocus(deskStrategy(fromUrl));
  }, [fromUrl]);

  const rows = useMemo(() => {
    const list = data?.tokens || [];
    if (tab === "book") return [];
    if (focus) return list.filter((r: any) => r.report?.allowedStrategies?.includes(focus));
    if (tab === "likes") return list.filter((r: any) => r.report?.verdict === "trade");
    return list;
  }, [data, tab, focus]);

  const openMints = (paper?.positions || []).map((p: any) => p.mint);

  async function act(action: "buy" | "sell", mint: string, strat?: string) {
    const r = await fetch("/api/paper", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action, mint, strategy: strat || focus }),
    });
    const j = await r.json();
    setMsg(j.error === "refused" ? "She refused that one." : j.error || (action === "buy" ? "Bought (paper)" : "Sold"));
    refresh();
  }

  const hint =
    tab === "book"
      ? "Open coins and recent fills."
      : tab === "likes"
        ? focus === "solphia_pick"
          ? "Picks only. Often empty — that’s the point."
          : focus === "launch_snipe"
            ? "Launch names that cleared P(grad)."
            : focus === "migration_snipe"
              ? "Near graduation."
              : "Only names that cleared safety."
        : "The tape. Most names she will skip.";

  return (
    <main className="mx-auto max-w-2xl px-4 pb-8 pt-4 md:px-8">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-ghost">The tape</h1>
          <p className="mt-1 text-sm text-mute">Paper until live. She skips more than she buys.</p>
        </div>
        {paper && (
          <div className="text-right">
            <div className={`font-display text-2xl ${paper.pnlPct >= 0 ? "text-acid" : "text-blood"}`}>
              {paper.pnlPct >= 0 ? "+" : ""}
              {(paper.pnlPct * 100).toFixed(1)}%
            </div>
            <div className="font-mono text-[11px] text-mute">
              ${paper.equityUsd.toFixed(0)} · {paper.open} open
            </div>
          </div>
        )}
      </div>

      <div className="mt-5 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {TABS.map((d) => (
          <button
            key={d.id}
            onClick={() => {
              setTab(d.id);
              if (d.id !== "likes") setFocus(undefined);
            }}
            className={`shrink-0 rounded-full px-5 py-2.5 font-mono text-[12px] ${
              tab === d.id ? "btn-on" : "btn-ghost"
            }`}
          >
            {d.label}
          </button>
        ))}
      </div>
      <p className="mt-3 text-sm text-mute">{loading ? "Loading the tape…" : hint}</p>

      <div className="mt-4">
        {tab === "book" ? (
          <Book paper={paper} onSell={(m) => act("sell", m)} />
        ) : (
          <TokenTable
            rows={rows}
            openMints={openMints}
            onBuy={(m, s) => act("buy", m, s)}
            onSell={(m) => act("sell", m)}
          />
        )}
      </div>

      {err && <p className="mt-3 text-sm text-blood">Couldn’t load the tape. Pull to refresh.</p>}
      {msg && <p className="mt-3 text-sm text-acid">{msg}</p>}

      <div className="mt-8 flex gap-2">
        <Link href="/trading" className="btn-acid inline-flex min-h-[44px] flex-1 items-center justify-center rounded-full px-4 py-2 text-center font-mono text-[11px]">
          LAUNCH BOT
        </Link>
        <Link href="/copy" className="btn-ghost inline-flex min-h-[44px] flex-1 items-center justify-center rounded-full px-4 py-2 text-center font-mono text-[11px]">
          Who she copies
        </Link>
      </div>
    </main>
  );
}

function Book({ paper, onSell }: { paper: any; onSell: (mint: string) => void }) {
  const positions = paper?.positions || [];
  const fills = (paper?.fills || []).slice(0, 16);
  if (!paper) {
    return <p className="text-sm text-mute">No book yet.</p>;
  }
  return (
    <div className="space-y-3">
      {positions.length === 0 && <p className="text-sm text-mute">No open coins. That’s fine.</p>}
      {positions.map((p: any) => (
        <div key={p.id} className="panel flex items-center justify-between gap-3 rounded-2xl p-4">
          <div>
            <div className="font-display text-lg text-ghost">{p.symbol}</div>
            <div className={`font-mono text-[12px] ${p.unrealizedUsd >= 0 ? "text-acid" : "text-blood"}`}>
              {p.unrealizedUsd >= 0 ? "+" : ""}
              ${Number(p.unrealizedUsd || 0).toFixed(2)}
            </div>
          </div>
          <button onClick={() => onSell(p.mint)} className="btn-ghost min-h-[44px] rounded-full px-4 font-mono text-[11px]">
            Sell
          </button>
        </div>
      ))}
      {fills.length > 0 && (
        <div className="panel rounded-2xl p-4">
          <div className="mb-3 font-mono text-[10px] tracking-[0.2em] text-mute">RECENT</div>
          <div className="space-y-2">
            {fills.map((f: any) => (
              <div key={f.id} className="flex justify-between gap-2 text-sm">
                <span className={f.side === "buy" ? "text-acid" : "text-blood"}>{f.side === "buy" ? "Buy" : "Sell"}</span>
                <span className="text-ghost">{f.symbol}</span>
                <span className={f.pnlUsd == null ? "text-mute" : f.pnlUsd >= 0 ? "text-acid" : "text-blood"}>
                  {f.pnlUsd == null ? "—" : `${f.pnlUsd >= 0 ? "+" : ""}${Number(f.pnlUsd).toFixed(2)}`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
