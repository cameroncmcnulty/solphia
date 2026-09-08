"use client";

import { useEffect, useState } from "react";
import { SolphiaFace } from "@/components/SolphiaFace";
import { WalletConnect } from "@/components/WalletConnect";
import { useOwner } from "@/lib/hooks";
import { loadOwner } from "@/lib/wallet/trading";

type Coin = {
  id: string;
  name: string;
  symbol: string;
  blurb: string;
  creator: string;
  createdAt: number;
  status: "curve" | "graduated";
  priceSol: number;
  marketCapSol: number;
  marketCapUsd: number;
  progress: number;
  realSol: number;
  holders: number;
  myTokens?: number;
  devRewardsSol: number;
  fills: { at: number; side: "buy" | "sell"; sol: number; tokens: number }[];
};

export default function LaunchPage() {
  const connected = useOwner();
  const owner = connected || (typeof window !== "undefined" ? loadOwner() : null);
  const [coins, setCoins] = useState<Coin[]>([]);
  const [open, setOpen] = useState<Coin | null>(null);
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [blurb, setBlurb] = useState("");
  const [sol, setSol] = useState(0.25);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [solUsd, setSolUsd] = useState(0);

  async function refresh(id?: string) {
    const j = await fetch(id ? `/api/launch?id=${id}` : "/api/launch").then((r) => r.json());
    if (j.solUsd) setSolUsd(j.solUsd);
    if (j.coins) setCoins(j.coins);
    if (j.coin) {
      setOpen(j.coin);
      setCoins((prev) => prev.map((c) => (c.id === j.coin.id ? j.coin : c)));
    }
  }

  useEffect(() => {
    refresh();
    const t = setInterval(() => refresh(), 12_000);
    return () => clearInterval(t);
  }, []);

  async function act(body: Record<string, unknown>) {
    if (!owner) return setMsg("Connect Phantom first.");
    setBusy(true);
    setMsg("");
    try {
      const r = await fetch("/api/launch", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...body, pubkey: owner }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "failed");
      if (j.coin) setOpen(j.coin);
      await refresh();
      setMsg(body.action === "create" ? "Live on the curve. Fair launch — no team bag." : "Filled.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="relative min-h-[calc(100vh-4rem)] overflow-hidden pb-24">
      <div className="pointer-events-auto absolute inset-0 opacity-90">
        <SolphiaFace mode="launch" />
      </div>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_20%,rgba(4,0,10,0.55)_70%,#04000a_100%)]" />

      <div className="relative z-10 mx-auto max-w-6xl px-4 pt-6 md:px-8 md:pt-10">
        <p className="font-mono text-[11px] tracking-[0.28em] text-acid">FAIR LAUNCH · 0 SOL TO CREATE · 1% SWAP</p>
        <h1 className="mt-2 max-w-3xl font-display text-4xl leading-tight text-ghost sm:text-6xl">
          Launch a coin. She keeps the curve honest.
        </h1>
        <p className="mt-4 max-w-xl text-base text-mute sm:text-lg">
          Bonding curve, no team allocation, 2% wallet cap, 60s anti-snipe. 1% per swap — 50% creator, 25% owner, 25%
          treasury. Cheaper than Pump.fun’s 1.25%. Paper curve first so the math is proven before mainnet program
          custody.
        </p>

        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <section className="panel rounded-3xl border-acid/20 bg-void/70 p-5 backdrop-blur-md">
            <div className="font-mono text-[10px] tracking-[0.22em] text-violet">CREATE · FAIR</div>
            <h2 className="mt-1 font-display text-2xl text-ghost">Name it. She’s live.</h2>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="name"
              className="mt-4 w-full rounded-2xl border border-violet/30 bg-void px-4 py-3 text-ghost"
            />
            <input
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              placeholder="TICKER"
              maxLength={10}
              className="mt-3 w-full rounded-2xl border border-violet/30 bg-void px-4 py-3 font-mono text-ghost"
            />
            <textarea
              value={blurb}
              onChange={(e) => setBlurb(e.target.value)}
              placeholder="one line (optional)"
              className="mt-3 h-20 w-full rounded-2xl border border-violet/30 bg-void px-4 py-3 text-ghost"
            />
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <WalletConnect />
              <button
                type="button"
                disabled={busy}
                onClick={() => act({ action: "create", name, symbol, blurb })}
                className="btn-acid min-h-[48px] rounded-full px-6 disabled:opacity-40"
              >
                Launch free
              </button>
            </div>
            <p className="mt-3 font-mono text-[11px] text-mute">
              1B supply · 800M on the curve · 200M locked into LP at 85 SOL. Mint/freeze stay revoked in the spec.
            </p>
          </section>

          <section className="panel rounded-3xl bg-void/70 p-5 backdrop-blur-md">
            <div className="font-mono text-[10px] tracking-[0.22em] text-violet">TAPE</div>
            <h2 className="mt-1 font-display text-2xl text-ghost">On the curve</h2>
            <div className="mt-4 max-h-[28rem] space-y-2 overflow-y-auto">
              {coins.length === 0 && <p className="text-sm text-mute">No coins yet. Be first.</p>}
              {coins.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setOpen(c)}
                  className="flex w-full items-center justify-between gap-3 rounded-2xl border border-violet/20 px-4 py-3 text-left hover:border-acid/40"
                >
                  <div>
                    <div className="font-display text-lg text-ghost">
                      {c.name} <span className="font-mono text-sm text-mute">{c.symbol}</span>
                    </div>
                    <div className="font-mono text-[11px] text-mute">
                      {c.status === "graduated" ? "graduated" : `${Math.round(c.progress * 100)}% to LP`} ·{" "}
                      {c.holders} holders
                    </div>
                  </div>
                  <div className="text-right font-mono text-sm text-acid">
                    {c.marketCapUsd ? `$${c.marketCapUsd.toFixed(0)}` : `${c.marketCapSol.toFixed(1)} SOL`}
                  </div>
                </button>
              ))}
            </div>
          </section>
        </div>

        {open && (
          <section className="panel mt-6 rounded-3xl bg-void/80 p-5 backdrop-blur-md">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <div className="font-mono text-[10px] tracking-[0.22em] text-acid">{open.symbol}</div>
                <h2 className="font-display text-3xl text-ghost">{open.name}</h2>
                <p className="mt-1 text-sm text-mute">{open.blurb || "Fair launch. No insider bag."}</p>
              </div>
              <button type="button" onClick={() => setOpen(null)} className="btn-ghost rounded-full px-4 py-2 text-sm">
                Close
              </button>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-void">
              <div className="h-full bg-acid" style={{ width: `${Math.round(open.progress * 100)}%` }} />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Mini k="Price" v={`${open.priceSol.toExponential(2)} SOL`} />
              <Mini k="Curve SOL" v={open.realSol.toFixed(2)} />
              <Mini k="Holders" v={String(open.holders)} />
              <Mini k="Creator rewards" v={`${open.devRewardsSol.toFixed(4)} SOL`} />
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <input
                type="number"
                min={0.01}
                step={0.05}
                value={sol}
                onChange={(e) => setSol(Number(e.target.value))}
                className="w-28 rounded-full border border-violet/30 bg-void px-4 py-2 font-mono text-ghost"
              />
              <button
                type="button"
                disabled={busy || open.status !== "curve"}
                onClick={() => act({ action: "buy", id: open.id, sol })}
                className="btn-acid min-h-[44px] rounded-full px-5 disabled:opacity-40"
              >
                Buy {sol} SOL
              </button>
              <button
                type="button"
                disabled={busy || open.status !== "curve"}
                onClick={() => act({ action: "sell", id: open.id, tokens: open.myTokens || 0 })}
                className="btn-ghost min-h-[44px] rounded-full px-5 disabled:opacity-40"
              >
                Sell
              </button>
              {owner && open.creator === owner && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => act({ action: "withdraw_dev", id: open.id })}
                  className="min-h-[44px] rounded-full border border-acid/40 px-5 text-sm text-acid"
                >
                  Withdraw creator rewards
                </button>
              )}
            </div>
            <p className="mt-3 font-mono text-[11px] text-mute">
              {solUsd ? `SOL $${solUsd.toFixed(0)} · ` : ""}1% fee on the swap. First minute max 1 SOL. 2% wallet cap.
              Paper curve — live program custody is the next rail.
            </p>
            <div className="mt-4 max-h-40 space-y-1 overflow-auto font-mono text-[11px] text-mute">
              {open.fills.map((f, i) => (
                <div key={`${f.at}-${i}`} className={f.side === "buy" ? "text-acid" : "text-ghost"}>
                  {f.side.toUpperCase()} {f.sol.toFixed(3)} SOL
                </div>
              ))}
            </div>
          </section>
        )}
        {msg && <p className="relative z-10 mt-4 font-mono text-sm text-acid">{msg}</p>}
      </div>
    </main>
  );
}

function Mini({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-2xl border border-violet/20 px-3 py-2">
      <div className="font-mono text-[10px] tracking-[0.16em] text-mute">{k}</div>
      <div className="font-display text-lg text-ghost">{v}</div>
    </div>
  );
}
