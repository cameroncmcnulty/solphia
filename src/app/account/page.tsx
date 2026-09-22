"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { CartoonPfp } from "@/components/CartoonPfp";
import { WalletConnect } from "@/components/WalletConnect";
import { useOwner } from "@/lib/hooks";
import { exportSecret, importSecret, tradingPubkey } from "@/lib/wallet/trading";
import { WalletMove } from "@/components/WalletMove";
import { IMAGE_DATA_MAX } from "@/lib/launch/validate";
import { launchError } from "@/lib/launch/errors";
import { usernameIssue } from "@/lib/launch/username";
import { FieldError, fieldClass, useConfirmErrors } from "@/components/form/confirm";
import { RankBadge } from "@/components/RankBadge";
import { ProfileOverlay } from "@/components/ProfileOverlay";
import { INTRO_MAX } from "@/lib/rank/engine";
import { isSolanaAddress } from "@/lib/wallet/addr";

type Invited = { pubkey: string; launched: number };
type Coin = {
  id: string;
  name: string;
  symbol: string;
  image?: string;
  createdAt: number;
  marketCapUsd: number;
  marketCapSol: number;
  referred?: boolean;
  devRewardsSol: number;
};
type Desk = {
  pubkey: string;
  username?: string;
  pfp: string;
  referrer: string | null;
  referralRewardsSol: number;
  referredCount: number;
  invited: Invited[];
  launched: Coin[];
  link: string;
  withdrawn?: number;
  intro?: string;
  banner?: string;
  favMint?: string;
  favSymbol?: string;
  favName?: string;
  rank?: number;
  title?: string;
  xp?: number;
  need?: number;
  pct?: number;
};

const TABS = [
  ["overview", "Account"],
  ["launches", "Launched"],
  ["referrals", "Referrals"],
] as const;

type Tab = (typeof TABS)[number][0];

function tabOf(): Tab {
  if (typeof window === "undefined") return "overview";
  const h = window.location.hash.replace(/^#/, "");
  if (h === "wallets") return "overview";
  return TABS.some((t) => t[0] === h) ? (h as Tab) : "overview";
}

export default function AccountPage() {
  const owner = useOwner();
  const [tab, setTab] = useState<Tab>("overview");
  const [desk, setDesk] = useState<Desk | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [noteErr, setNoteErr] = useState(false);
  const [username, setUsername] = useState("");
  const fieldErr = useConfirmErrors<"username" | "restore" | "pfp" | "banner" | "intro" | "fav">();
  const [intro, setIntro] = useState("");
  const [favMint, setFavMint] = useState("");
  const [saved, setSaved] = useState<Record<string, string>>({});
  const [peek, setPeek] = useState(false);
  const bannerRef = useRef<HTMLInputElement>(null);
  const [boosts, setBoosts] = useState<{
    live: { symbol: string; leftMs: number; rockets: number }[];
    queued: { symbol: string; position: number; etaMs: number; rockets: number }[];
  }>({ live: [], queued: [] });
  const [tradePk, setTradePk] = useState("");
  const [ownerBal, setOwnerBal] = useState(0);
  const [tradeBal, setTradeBal] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    if (!owner) return;
    const j = await fetch(`/api/account?pubkey=${encodeURIComponent(owner)}`).then((r) => r.json());
    setDesk(j);
    if (typeof j.username === "string") setUsername(j.username);
    if (typeof j.intro === "string") setIntro(j.intro);
    if (typeof j.favMint === "string") setFavMint(j.favMint);
    const b = await fetch(`/api/launch/boost?pubkey=${encodeURIComponent(owner)}`).then((r) => r.json());
    if (b.mine) setBoosts({ live: b.mine.live || [], queued: b.mine.queued || [] });
  }, [owner]);

  useEffect(() => {
    setTab(tabOf());
    const onHash = () => setTab(tabOf());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    load().catch(() => {});
  }, [load]);

  useEffect(() => {
    if (!owner) return;
    try {
      const tpk = tradingPubkey();
      setTradePk(tpk);
      Promise.all([
        fetch(`/api/sol/balance?pubkey=${owner}`).then((r) => r.json()),
        fetch(`/api/sol/balance?pubkey=${tpk}`).then((r) => r.json()),
      ]).then(([a, b]) => {
        setOwnerBal(a.sol || 0);
        setTradeBal(b.sol || 0);
      });
    } catch {
      /* no key */
    }
  }, [owner]);

  async function post(body: Record<string, unknown>) {
    if (!owner) return;
    if (body.action === "username") {
      const issue = usernameIssue(String(body.username || ""));
      if (issue) {
        fieldErr.fail({ username: launchError(issue) });
        setNote("");
        setNoteErr(false);
        return;
      }
    }
    setBusy(true);
    setNote("");
    setNoteErr(false);
    fieldErr.ok();
    try {
      const r = await fetch("/api/account", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...body, pubkey: owner }),
      });
      const j = await r.json();
      if (!r.ok) {
        const code = typeof j.error === "string" ? j.error : "";
        const msg = j.message || launchError(code) || "failed";
        if (body.action === "username") fieldErr.fail({ username: msg });
        else if (body.action === "pfp") fieldErr.fail({ pfp: msg });
        else {
          setNote(msg);
          setNoteErr(true);
        }
        return;
      }
      setDesk(j);
      if (typeof j.username === "string") setUsername(j.username);
      if (j.withdrawn) setNote(`Withdrew ${Number(j.withdrawn).toFixed(4)} SOL in referral rewards.`);
      if (body.action === "pfp") setSaved((s) => ({ ...s, pfp: body.pfp ? "PFP saved." : "Cartoon is back." }));
      if (body.action === "username") setSaved((s) => ({ ...s, username: j.username ? `Saved @${j.username}` : "Username cleared." }));
    } finally {
      setBusy(false);
    }
  }

  const origin = useMemo(() => (typeof window !== "undefined" ? window.location.origin : "https://solphia.io"), []);
  const invite = owner ? `${origin}/r/${owner}` : "";

  if (!owner) {
    return (
      <main className="pump-shell">
        <div className="pump-wrap py-16">
        <h1 className="pump-h1">Account</h1>
        <p className="pump-p mt-2">Connect Phantom to manage PFP, launches, and referrals.</p>
        <div className="mt-6">
          <WalletConnect />
        </div>
        </div>
      </main>
    );
  }

  return (
    <main className="pump-shell">
      <div className="pump-wrap">
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => setPeek(true)} className="relative">
          <CartoonPfp seed={owner} src={desk?.pfp} className="h-14 w-14" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-medium text-[#14f195]">Account</p>
          <h1 className="text-[28px] font-semibold tracking-tight text-white">{desk?.username ? `@${desk.username}` : "You"}</h1>
          <p className="font-mono text-[11px] text-mute">
            {owner.slice(0, 6)}…{owner.slice(-6)}
            {desk?.title ? ` · Rank ${desk.rank || 1} ${desk.title}` : ""}
          </p>
        </div>
        <button type="button" onClick={() => setPeek(true)} title="Preview card">
          <RankBadge rank={desk?.rank || 1} size={64} />
        </button>
      </div>
      {peek && owner && <ProfileOverlay pubkey={owner} viewer={owner} onClose={() => setPeek(false)} />}

      <div className="mt-5 flex flex-wrap gap-1 rounded-2xl border border-violet/25 p-1">
        {TABS.map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              setTab(id);
              window.history.replaceState(null, "", `#${id}`);
            }}
            className={`rounded-full px-3 py-1.5 font-mono text-[11px] ${tab === id ? "bg-acid/20 text-acid" : "text-mute hover:text-ghost"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {note && noteErr && (
        <p className="mt-4 font-mono text-sm text-blood" role="alert">
          {note}
        </p>
      )}

      {tab === "overview" && (
        <div className="mt-6 space-y-4">
          <section className="panel-bubble overflow-hidden rounded-3xl p-5">
            <h2 className="text-[22px] font-semibold tracking-tight text-white">Username</h2>
            <p className="mt-1 text-sm text-mute">Unique on Solphia. 3–20 characters, start with a letter. Letters, numbers, underscore.</p>
            <form
              className="mt-3"
              onSubmit={(e) => {
                e.preventDefault();
                post({ action: "username", username });
              }}
            >
              <div className="flex gap-2">
                <input
                  data-field="username"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    fieldErr.clear("username");
                  }}
                  placeholder="@handle"
                  maxLength={20}
                  aria-invalid={Boolean(fieldErr.errors.username)}
                  className={`min-h-[44px] min-w-0 flex-1 rounded-full border bg-void px-4 font-mono text-sm text-ghost ${fieldClass(fieldErr.errors.username)}`}
                />
                <button type="submit" disabled={busy} className="btn-acid rounded-full px-5 text-sm disabled:opacity-40">
                  Save
                </button>
              </div>
              <FieldError error={fieldErr.errors.username} />
              {saved.username && <p className="mt-2 text-[12px] text-acid">{saved.username}</p>}
            </form>
          </section>
          <div className="grid gap-3 sm:grid-cols-3">
            <Mini k="Rank" v={`${desk?.rank || 1} · ${desk?.title || "Spark"}`} />
            <Mini k="Launched" v={String(desk?.launched.length || 0)} />
            <Mini k="Invited" v={String(desk?.referredCount || 0)} />
          </div>
          <div className="rounded-2xl border border-violet/20 px-4 py-3">
            <div className="flex justify-between font-mono text-[10px] text-mute">
              <span>{desk?.xp || 0} XP</span>
              <span>{desk?.need === 0 ? "MAX" : `${desk?.need || 0} to next rank`}</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-void">
              <div className="h-full bg-acid" style={{ width: `${Math.round((desk?.pct || 0) * 100)}%` }} />
            </div>
            <p className="mt-2 text-[12px] text-mute">
              Rank climbs from launches, Shill Zone chat, Founders Circle, referrals, and swaps on Solphia platform.
              Rank 100 is a long grind on purpose.
            </p>
          </div>
        </div>
      )}

      {tab === "overview" && (
        <div className="mt-6 space-y-4">
          <section className="panel-bubble overflow-hidden rounded-3xl p-5">
            <h2 className="text-[22px] font-semibold tracking-tight text-white">Profile picture</h2>
            <p className="mt-2 text-sm text-mute">Until you pick one, we draw a cartoon from your wallet.</p>
            <div data-field="pfp" className={`mt-4 flex items-center gap-4 ${fieldErr.errors.pfp ? "rounded-2xl p-1 ring-1 ring-blood/60" : ""}`}>
              <CartoonPfp seed={owner} src={desk?.pfp} className="h-24 w-24" />
              <div className="flex flex-wrap gap-2">
                <button type="button" className="btn-acid rounded-full px-5 py-2 text-sm" onClick={() => fileRef.current?.click()}>
                  Upload
                </button>
                <button
                  type="button"
                  disabled={busy || !desk?.pfp}
                  className="btn-ghost rounded-full px-5 py-2 text-sm disabled:opacity-40"
                  onClick={() => post({ action: "pfp", pfp: "" })}
                >
                  Use cartoon
                </button>
              </div>
            </div>
            <FieldError error={fieldErr.errors.pfp} />
            {saved.pfp && <p className="mt-2 text-[12px] text-acid">{saved.pfp}</p>}
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (!f) return;
                fieldErr.clear("pfp");
                try {
                  const data = await squarePfp(f);
                  await post({ action: "pfp", pfp: data });
                } catch (err) {
                  fieldErr.fail({ pfp: err instanceof Error ? err.message : "Could not use that image." });
                }
              }}
            />
          </section>
          <section className="panel-bubble overflow-hidden rounded-3xl p-5">
            <h2 className="text-[22px] font-semibold tracking-tight text-white">Banner</h2>
            <p className="mt-1 text-sm text-mute">Wide image for your card. Shows when someone taps your PFP in Shill Zone.</p>
            <div className="mt-3 overflow-hidden rounded-2xl border border-violet/25 bg-void">
              <div className="relative h-28 bg-gradient-to-r from-violet/30 via-acid/15 to-cyan/25">
                {desk?.banner ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={desk.banner.startsWith("data:") || desk.banner.startsWith("/") ? desk.banner : `/api/media?u=${encodeURIComponent(desk.banner)}`}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : null}
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" className="btn-acid rounded-full px-5 py-2 text-sm" onClick={() => bannerRef.current?.click()}>
                Upload banner
              </button>
              <button
                type="button"
                disabled={busy || !desk?.banner}
                className="btn-ghost rounded-full px-5 py-2 text-sm disabled:opacity-40"
                onClick={async () => {
                  await fetch("/api/profile", {
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({ action: "banner", pubkey: owner, banner: "" }),
                  });
                  setSaved((s) => ({ ...s, banner: "Banner cleared." }));
                  load().catch(() => {});
                }}
              >
                Clear
              </button>
            </div>
            <FieldError error={fieldErr.errors.banner} />
            {saved.banner && <p className="mt-2 text-[12px] text-acid">{saved.banner}</p>}
            <input
              ref={bannerRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (!f) return;
                fieldErr.clear("banner");
                try {
                  const data = await wideBanner(f);
                  const r = await fetch("/api/profile", {
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({ action: "banner", pubkey: owner, banner: data }),
                  });
                  const j = await r.json();
                  if (!r.ok) throw new Error(j.message || "Could not save banner.");
                  setSaved((s) => ({ ...s, banner: "Banner saved." }));
                  if (j.banner) setDesk((d) => (d ? { ...d, banner: j.banner } : d));
                  load().catch(() => {});
                } catch (err) {
                  fieldErr.fail({ banner: err instanceof Error ? err.message : "Could not use that image." });
                }
              }}
            />
          </section>
          <section className="panel-bubble overflow-hidden rounded-3xl p-5">
            <h2 className="text-[22px] font-semibold tracking-tight text-white">Intro</h2>
            <p className="mt-1 text-sm text-mute">One short line. People see it on your card.</p>
            <form
              className="mt-3"
              onSubmit={async (e) => {
                e.preventDefault();
                const r = await fetch("/api/profile", {
                  method: "POST",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify({ action: "intro", pubkey: owner, intro }),
                });
                const j = await r.json().catch(() => ({}));
                if (!r.ok) {
                  fieldErr.fail({ intro: j.message || "Could not save intro." });
                  return;
                }
                setSaved((s) => ({ ...s, intro: "Intro saved." }));
                setDesk((d) => (d ? { ...d, intro: j.intro ?? intro } : d));
                load().catch(() => {});
              }}
            >
              <textarea
                value={intro}
                maxLength={INTRO_MAX}
                onChange={(e) => setIntro(e.target.value)}
                placeholder="Who you are. What you shill. Why they should care."
                className={`min-h-[88px] w-full rounded-2xl border bg-void px-4 py-3 text-sm text-ghost ${fieldClass(fieldErr.errors.intro)}`}
              />
              <div className="mt-1 flex items-center justify-between">
                <FieldError error={fieldErr.errors.intro} />
                <span className="font-mono text-[10px] text-mute">
                  {intro.length}/{INTRO_MAX}
                </span>
              </div>
              <button type="submit" className="btn-acid mt-2 rounded-full px-5 py-2 text-sm">
                Save intro
              </button>
              {saved.intro && <p className="mt-2 text-[12px] text-acid">{saved.intro}</p>}
            </form>
          </section>
          <section className="panel-bubble overflow-hidden rounded-3xl p-5">
            <h2 className="text-[22px] font-semibold tracking-tight text-white">Favourite project</h2>
            <p className="mt-1 text-sm text-mute">A CA on your card. One tap copy so people can buy it.</p>
            <form
              className="mt-3"
              onSubmit={async (e) => {
                e.preventDefault();
                if (favMint && !isSolanaAddress(favMint)) {
                  fieldErr.fail({ fav: "Paste a real token CA." });
                  return;
                }
                const r = await fetch("/api/profile", {
                  method: "POST",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify({ action: "favourite", pubkey: owner, mint: favMint }),
                });
                const j = await r.json();
                if (!r.ok) {
                  fieldErr.fail({ fav: j.message || "Could not save that CA." });
                  return;
                }
                setSaved((s) => ({ ...s, fav: favMint ? "Favourite saved." : "Favourite cleared." }));
                setDesk((d) =>
                  d
                    ? {
                        ...d,
                        favMint: j.fav?.mint || "",
                        favSymbol: j.fav?.symbol || "",
                        favName: j.fav?.name || "",
                      }
                    : d,
                );
                load().catch(() => {});
              }}
            >
              <div className="flex gap-2">
                <input
                  value={favMint}
                  onChange={(e) => {
                    setFavMint(e.target.value.trim());
                    fieldErr.clear("fav");
                  }}
                  placeholder="Token CA"
                  className={`min-h-[44px] min-w-0 flex-1 rounded-full border bg-void px-4 font-mono text-[12px] text-ghost ${fieldClass(fieldErr.errors.fav)}`}
                />
                <button type="submit" className="btn-acid rounded-full px-5 text-sm">
                  Save
                </button>
              </div>
              <FieldError error={fieldErr.errors.fav} />
              {saved.fav && <p className="mt-2 text-[12px] text-acid">{saved.fav}</p>}
              {desk?.favSymbol ? <p className="mt-2 text-sm text-acid">${desk.favSymbol} is on your card.</p> : null}
            </form>
          </section>
        </div>
      )}

      {tab === "launches" && (
        <section className="panel-bubble mt-6 overflow-hidden rounded-3xl p-5">
          <h2 className="text-[22px] font-semibold tracking-tight text-white">Launched coins</h2>
          {(boosts.live.length > 0 || boosts.queued.length > 0) && (
            <div className="mt-3 space-y-1 rounded-2xl border border-acid/25 bg-acid/[0.04] px-3 py-2 font-mono text-[12px]">
              {boosts.live.map((b) => (
                <div key={`bl-${b.symbol}`} className="text-acid">
                  ${b.symbol} boosted · {Math.max(0, Math.floor(b.leftMs / 60000))}m left · {b.rockets} rockets
                </div>
              ))}
              {boosts.queued.map((b) => (
                <div key={`bq-${b.symbol}-${b.position}`} className="text-mute">
                  ${b.symbol} in queue #{b.position} · live in {Math.max(0, Math.floor(b.etaMs / 60000))}m
                </div>
              ))}
            </div>
          )}
          {(!desk?.launched || desk.launched.length === 0) && <p className="mt-3 text-sm text-mute">None yet.</p>}
          <div className="mt-4 space-y-2">
            {(desk?.launched || []).map((c) => (
              <Link
                key={c.id}
                href="/launch"
                className="flex items-center gap-3 rounded-2xl border border-violet/20 px-3 py-3 hover:border-acid/40"
              >
                {c.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.image} alt="" className="h-10 w-10 rounded-xl object-cover" />
                ) : (
                  <span className="h-10 w-10 rounded-xl bg-violet/20" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="font-display text-lg text-ghost">${c.symbol}</div>
                  <div className="font-mono text-[11px] text-mute">{c.name}</div>
                </div>
                <div className="font-mono text-[11px] text-mute">{c.referred ? "referred" : "solo"}</div>
              </Link>
            ))}
          </div>
          <Link href="/launch" className="btn-ghost mt-4 inline-flex rounded-full px-5 py-2 text-sm">
            Open the pad
          </Link>
        </section>
      )}

      {tab === "referrals" && (
        <section className="panel-bubble mt-6 overflow-hidden rounded-3xl p-5">
          <h2 className="text-[22px] font-semibold tracking-tight text-white">Referrals</h2>
          <p className="mt-2 text-sm text-mute">
            Share your link. It bonds their wallet to yours. When they launch, you keep a cut of every swap on those coins for life. Withdraw anytime.
          </p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <input readOnly value={invite} className="min-h-[44px] flex-1 rounded-full border border-violet/30 bg-void px-4 font-mono text-[11px] text-ghost" />
            <button
              type="button"
              className="btn-acid rounded-full px-5 py-2 text-sm"
              onClick={async () => {
                await navigator.clipboard.writeText(invite);
                setNoteErr(false);
                setNote("Invite link copied.");
              }}
            >
              Copy link
            </button>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Mini k="Invited" v={String(desk?.referredCount || 0)} />
            <Mini k="To withdraw" v={`${(desk?.referralRewardsSol || 0).toFixed(4)} SOL`} />
          </div>
          <button
            type="button"
            disabled={busy || !(desk?.referralRewardsSol || 0)}
            onClick={() => post({ action: "withdraw_referral" })}
            className="btn-acid mt-4 rounded-full px-5 py-2 text-sm disabled:opacity-40"
          >
            Withdraw referral rewards
          </button>
          <div className="mt-5 space-y-2">
            {(desk?.invited || []).length === 0 && <p className="text-sm text-mute">No invites connected yet.</p>}
            {(desk?.invited || []).map((u) => (
              <div key={u.pubkey} className="flex justify-between gap-3 font-mono text-[11px] text-ghost">
                <span>
                  {u.pubkey.slice(0, 4)}…{u.pubkey.slice(-4)}
                </span>
                <span className="text-mute">{u.launched} coins</span>
              </div>
            ))}
          </div>
        </section>
      )}
      </div>
    </main>
  );
}

function Mini({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-2xl border border-line bg-void/40 px-4 py-3">
      <div className="font-mono text-[10px] tracking-[0.2em] text-mute">{k}</div>
      <div className="stat-num mt-1 text-xl text-ghost">{v}</div>
    </div>
  );
}

function WalletRow({ k, pk, bal }: { k: string; pk: string; bal: number }) {
  return (
    <div className="rounded-2xl border border-violet/20 px-4 py-3">
      <div className="font-mono text-[10px] tracking-[0.2em] text-mute">{k}</div>
      <div className="mt-1 break-all font-mono text-xs text-ghost">{pk || "—"}</div>
      <div className="stat-num mt-1 text-xl text-acid">{bal.toFixed(4)} SOL</div>
    </div>
  );
}

async function squarePfp(file: File): Promise<string> {
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
    if (side < 64) throw new Error("Use a square image at least 64×64.");
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not crop image.");
    ctx.drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, 256, 256);
    for (const q of [0.82, 0.68, 0.5, 0.36]) {
      const data = canvas.toDataURL("image/jpeg", q);
      if (data.length <= IMAGE_DATA_MAX) return data;
    }
    throw new Error("Image is too heavy.");
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function wideBanner(file: File): Promise<string> {
  if (file.size > 4_000_000) throw new Error("Image must be under 4 MB.");
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Could not read that image."));
      el.src = url;
    });
    const w = 1200;
    const h = 400;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not crop image.");
    const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
    const dw = img.naturalWidth * scale;
    const dh = img.naturalHeight * scale;
    ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
    for (const q of [0.72, 0.55, 0.42, 0.3, 0.22]) {
      const data = canvas.toDataURL("image/jpeg", q);
      if (data.length <= 80_000) return data;
    }
    throw new Error("Image is too heavy. Try a simpler JPEG.");
  } finally {
    URL.revokeObjectURL(url);
  }
}
