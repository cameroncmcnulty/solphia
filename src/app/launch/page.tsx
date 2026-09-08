"use client";

import { useEffect, useRef, useState } from "react";
import { SolphiaFace } from "@/components/SolphiaFace";
import { WalletConnect } from "@/components/WalletConnect";
import { useOwner } from "@/lib/hooks";
import { DEV_BUY_MAX_SOL, TOKEN_IMAGE_PX } from "@/lib/launch/curve";
import { loadOwner } from "@/lib/wallet/trading";

const TOKEN_PX = TOKEN_IMAGE_PX;

type Coin = {
  id: string;
  name: string;
  symbol: string;
  image?: string;
  blurb: string;
  links?: { website?: string; x?: string; telegram?: string; discord?: string };
  mintAuthority?: string;
  freezeAuthority?: string;
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

async function squareTokenImage(file: File): Promise<string> {
  if (file.size > 4_000_000) throw new Error("Image must be under 4 MB.");
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Could not read that image."));
      el.src = url;
    });
    const side = Math.min(img.naturalWidth, img.naturalHeight);
    if (side < 512) throw new Error("Use a square-ish image at least 512×512. We export 1000×1000 for X, Telegram, Discord, and Dexscreener.");
    const canvas = document.createElement("canvas");
    canvas.width = TOKEN_PX;
    canvas.height = TOKEN_PX;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not crop image.");
    const sx = (img.naturalWidth - side) / 2;
    const sy = (img.naturalHeight - side) / 2;
    ctx.drawImage(img, sx, sy, side, side, 0, 0, TOKEN_PX, TOKEN_PX);
    return canvas.toDataURL("image/jpeg", 0.84);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export default function LaunchPage() {
  const connected = useOwner();
  const owner = connected || (typeof window !== "undefined" ? loadOwner() : null);
  const [coins, setCoins] = useState<Coin[]>([]);
  const [open, setOpen] = useState<Coin | null>(null);
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [blurb, setBlurb] = useState("");
  const [image, setImage] = useState("");
  const [website, setWebsite] = useState("");
  const [x, setX] = useState("");
  const [telegram, setTelegram] = useState("");
  const [discord, setDiscord] = useState("");
  const [devBuy, setDevBuy] = useState(0);
  const [sol, setSol] = useState(0.25);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [solUsd, setSolUsd] = useState(0);
  const [tab, setTab] = useState<"mine" | "tape">("mine");
  const fileRef = useRef<HTMLInputElement>(null);

  async function refresh(id?: string) {
    const q = owner ? `pubkey=${owner}` : "";
    const j = await fetch(id ? `/api/launch?id=${id}&${q}` : `/api/launch?${q}`).then((r) => r.json());
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
  }, [owner]);

  async function act(body: Record<string, unknown>) {
    if (!owner) return setMsg("Connect Phantom to launch or trade. That wallet is your login.");
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
      if (body.action === "create") {
        setName("");
        setSymbol("");
        setBlurb("");
        setImage("");
        setWebsite("");
        setX("");
        setTelegram("");
        setDiscord("");
        setDevBuy(0);
        setMsg("Live on the curve. Mint and freeze authority are locked.");
      } else if (body.action === "withdraw_dev") setMsg("Dev rewards sent to your book.");
      else setMsg("Filled.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "failed");
    } finally {
      setBusy(false);
    }
  }

  const mine = owner ? coins.filter((c) => c.creator === owner) : [];

  return (
    <main className="relative min-h-[calc(100vh-4rem)] overflow-hidden pb-24">
      <div className="pointer-events-auto absolute inset-0">
        <SolphiaFace mode="launch" />
      </div>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_72%_22%,transparent_0%,transparent_28%,rgba(4,0,10,0.28)_64%,#04000a_100%)]" />

      <div className="relative z-10 mx-auto max-w-6xl px-4 pt-6 md:px-8 md:pt-10">
        <p className="font-mono text-[11px] tracking-[0.28em] text-acid">FAIR LAUNCH · 1B SUPPLY · 1% SWAP · 50% TO DEV</p>
        <h1 className="mt-2 max-w-3xl font-display text-4xl leading-tight text-ghost sm:text-6xl">
          Launch a coin. She keeps the curve honest.
        </h1>
        <p className="mt-4 max-w-2xl text-base text-mute sm:text-lg">
          Total supply is 1,000,000,000 tokens — fixed at mint, never inflated. 800 million sit in a constant-product
          bonding curve (a virtual AMM): virtual reserves start at 30 SOL and ~1.073 billion tokens, and their product
          k stays fixed, so every buy lifts the price and every sell eases it. When 85 SOL of real buys have filled the
          curve, the remaining 200 million plus curve SOL lock into LP and the coin graduates. Mint authority and freeze
          authority are revoked at launch. 1% on each swap; 50% of that fee is paid to the dev.
        </p>

        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <section className="panel panel-glass rounded-3xl border-acid/20 p-5">
            <div className="font-mono text-[10px] tracking-[0.22em] text-violet">CREATE · FAIR</div>
            <h2 className="mt-1 font-display text-2xl text-ghost">Name it. She’s live.</h2>
            {!owner ? (
              <div className="mt-6 space-y-3">
                <p className="text-sm text-mute">
                  Phantom is the login. Connect to launch, track your coins, and withdraw dev rewards.
                </p>
                <WalletConnect />
              </div>
            ) : (
              <>
                <div className="mt-4 flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl border border-violet/40 bg-void"
                  >
                    {image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={image} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="flex h-full items-center justify-center px-2 text-center font-mono text-[10px] text-mute">
                        1000×1000
                      </span>
                    )}
                  </button>
                  <div className="min-w-0 text-sm text-mute">
                    Square token art. We crop to <span className="text-ghost">1000×1000</span> so it holds on the site,
                    X, Telegram, Discord, and Dexscreener. PNG/JPG, at least 512px.
                  </div>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      e.target.value = "";
                      if (!f) return;
                      try {
                        setImage(await squareTokenImage(f));
                        setMsg("");
                      } catch (err) {
                        setMsg(err instanceof Error ? err.message : "image failed");
                      }
                    }}
                  />
                </div>
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
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="website (optional)" className="rounded-2xl border border-violet/30 bg-void px-4 py-2 text-sm text-ghost" />
                  <input value={x} onChange={(e) => setX(e.target.value)} placeholder="X / twitter (optional)" className="rounded-2xl border border-violet/30 bg-void px-4 py-2 text-sm text-ghost" />
                  <input value={telegram} onChange={(e) => setTelegram(e.target.value)} placeholder="telegram (optional)" className="rounded-2xl border border-violet/30 bg-void px-4 py-2 text-sm text-ghost" />
                  <input value={discord} onChange={(e) => setDiscord(e.target.value)} placeholder="discord (optional)" className="rounded-2xl border border-violet/30 bg-void px-4 py-2 text-sm text-ghost" />
                </div>
                <label className="mt-4 block">
                  <div className="flex justify-between font-mono text-[11px] text-mute">
                    <span>Dev buy at launch</span>
                    <span className="text-acid">{devBuy.toFixed(2)} SOL</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={DEV_BUY_MAX_SOL}
                    step={0.05}
                    value={devBuy}
                    onChange={(e) => setDevBuy(Number(e.target.value))}
                    className="mt-2 w-full accent-[#14f195]"
                  />
                  <p className="mt-1 text-xs text-mute">
                    Optional first buy in the same launch, up to {DEV_BUY_MAX_SOL} SOL. Still capped at 2% of supply so
                    it stays fair.
                  </p>
                </label>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <WalletConnect />
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      act({
                        action: "create",
                        name,
                        symbol,
                        blurb,
                        image,
                        website,
                        x,
                        telegram,
                        discord,
                        launchBuySol: devBuy,
                      })
                    }
                    className="btn-acid min-h-[48px] rounded-full px-6 disabled:opacity-40"
                  >
                    Launch free
                  </button>
                </div>
                <p className="mt-3 font-mono text-[11px] text-mute">
                  Mint authority locked. Freeze authority locked. 800M on the curve, 200M into LP at 85 SOL.
                </p>
              </>
            )}
          </section>

          <section className="panel panel-glass rounded-3xl p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="font-mono text-[10px] tracking-[0.22em] text-violet">
                {owner && tab === "mine" ? "YOUR COINS" : "TAPE"}
              </div>
              {owner && (
                <div className="flex gap-1 rounded-full border border-violet/30 p-0.5 font-mono text-[10px]">
                  <button
                    type="button"
                    onClick={() => setTab("mine")}
                    className={`rounded-full px-3 py-1 ${tab === "mine" ? "bg-acid/20 text-acid" : "text-mute"}`}
                  >
                    Mine
                  </button>
                  <button
                    type="button"
                    onClick={() => setTab("tape")}
                    className={`rounded-full px-3 py-1 ${tab === "tape" ? "bg-acid/20 text-acid" : "text-mute"}`}
                  >
                    All
                  </button>
                </div>
              )}
            </div>
            <h2 className="mt-1 font-display text-2xl text-ghost">
              {owner && tab === "mine" ? "Track & rewards" : "On the curve"}
            </h2>
            {owner && (
              <p className="mt-2 text-sm text-mute">
                Connected as {owner.slice(0, 4)}…{owner.slice(-4)}. Phantom is the login. Manage launches and pull 50%
                swap fees as dev rewards.
              </p>
            )}
            <div className="mt-4 max-h-[28rem] space-y-2 overflow-y-auto">
              {(owner && tab === "mine" ? mine : coins).length === 0 && (
                <p className="text-sm text-mute">
                  {owner && tab === "mine" ? "You have not launched yet." : "No coins yet. Be first."}
                </p>
              )}
              {(owner && tab === "mine" ? mine : coins).map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setOpen(c)}
                  className="flex w-full items-center justify-between gap-3 rounded-2xl border border-violet/20 px-4 py-3 text-left hover:border-acid/40"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    {c.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={c.image} alt="" className="h-10 w-10 rounded-xl object-cover" />
                    ) : (
                      <span className="h-10 w-10 rounded-xl bg-violet/20" />
                    )}
                    <div className="min-w-0">
                      <div className="truncate font-display text-lg text-ghost">
                        {c.name} <span className="font-mono text-sm text-mute">{c.symbol}</span>
                      </div>
                      <div className="font-mono text-[11px] text-mute">
                        {c.status === "graduated" ? "graduated" : `${Math.round(c.progress * 100)}% to LP`} ·{" "}
                        {c.devRewardsSol.toFixed(3)} SOL rewards
                      </div>
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
          <section className="panel panel-glass mt-6 rounded-3xl p-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div className="flex items-center gap-3">
                {open.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={open.image} alt="" className="h-14 w-14 rounded-2xl object-cover" />
                ) : null}
                <div>
                  <div className="font-mono text-[10px] tracking-[0.22em] text-acid">{open.symbol}</div>
                  <h2 className="font-display text-3xl text-ghost">{open.name}</h2>
                  <p className="mt-1 text-sm text-mute">{open.blurb || "Fair launch. Mint and freeze locked."}</p>
                </div>
              </div>
              <button type="button" onClick={() => setOpen(null)} className="btn-ghost rounded-full px-4 py-2 text-sm">
                Close
              </button>
            </div>
            <div className="mt-3 flex flex-wrap gap-3 font-mono text-[11px] text-mute">
              {open.links?.website && (
                <a href={open.links.website} target="_blank" rel="noreferrer" className="text-acid">
                  web
                </a>
              )}
              {open.links?.x && (
                <a href={open.links.x} target="_blank" rel="noreferrer" className="text-acid">
                  X
                </a>
              )}
              {open.links?.telegram && (
                <a href={open.links.telegram} target="_blank" rel="noreferrer" className="text-acid">
                  telegram
                </a>
              )}
              {open.links?.discord && (
                <a href={open.links.discord} target="_blank" rel="noreferrer" className="text-acid">
                  discord
                </a>
              )}
              <span>mint locked · freeze locked</span>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-void">
              <div className="h-full bg-acid" style={{ width: `${Math.round(open.progress * 100)}%` }} />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Mini k="Price" v={`${open.priceSol.toExponential(2)} SOL`} />
              <Mini k="Curve SOL" v={open.realSol.toFixed(2)} />
              <Mini k="Holders" v={String(open.holders)} />
              <Mini k="Dev rewards" v={`${open.devRewardsSol.toFixed(4)} SOL`} />
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              {!owner ? (
                <WalletConnect />
              ) : (
                <>
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
                    disabled={busy || open.status !== "curve" || !(open.myTokens || 0)}
                    onClick={() => act({ action: "sell", id: open.id, tokens: open.myTokens || 0 })}
                    className="btn-ghost min-h-[44px] rounded-full px-5 disabled:opacity-40"
                  >
                    Sell
                  </button>
                  {open.creator === owner && (
                    <button
                      type="button"
                      disabled={busy || !(open.devRewardsSol > 0)}
                      onClick={() => act({ action: "withdraw_dev", id: open.id })}
                      className="min-h-[44px] rounded-full border border-acid/40 px-5 text-sm text-acid disabled:opacity-40"
                    >
                      Withdraw dev rewards
                    </button>
                  )}
                </>
              )}
            </div>
            <p className="mt-3 font-mono text-[11px] text-mute">
              {solUsd ? `SOL $${solUsd.toFixed(0)} · ` : ""}1% swap fee · 50% paid to the dev. First minute max 1 SOL
              for everyone else. 2% wallet cap.
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
