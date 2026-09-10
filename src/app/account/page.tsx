"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { CartoonPfp } from "@/components/CartoonPfp";
import { WalletConnect } from "@/components/WalletConnect";
import { useOwner } from "@/lib/hooks";
import { exportSecret, importSecret, tradingPubkey } from "@/lib/wallet/trading";
import { IMAGE_DATA_MAX } from "@/lib/launch/validate";

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
};

const TABS = [
  ["overview", "Account"],
  ["wallets", "Wallets"],
  ["pfp", "PFP"],
  ["launches", "Launched"],
  ["referrals", "Referrals"],
] as const;

type Tab = (typeof TABS)[number][0];

function tabOf(): Tab {
  if (typeof window === "undefined") return "overview";
  const h = window.location.hash.replace(/^#/, "");
  return TABS.some((t) => t[0] === h) ? (h as Tab) : "overview";
}

export default function AccountPage() {
  const owner = useOwner();
  const [tab, setTab] = useState<Tab>("overview");
  const [desk, setDesk] = useState<Desk | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [username, setUsername] = useState("");
  const [tradePk, setTradePk] = useState("");
  const [ownerBal, setOwnerBal] = useState(0);
  const [tradeBal, setTradeBal] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    if (!owner) return;
    const j = await fetch(`/api/account?pubkey=${encodeURIComponent(owner)}`).then((r) => r.json());
    setDesk(j);
    if (typeof j.username === "string") setUsername(j.username);
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
    setBusy(true);
    setNote("");
    try {
      const r = await fetch("/api/account", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...body, pubkey: owner }),
      });
      const j = await r.json();
      if (!r.ok) {
        setNote(j.message || j.error || "failed");
        return;
      }
      setDesk(j);
      if (j.withdrawn) setNote(`Withdrew ${Number(j.withdrawn).toFixed(4)} SOL in referral rewards.`);
      if (body.action === "pfp") setNote(body.pfp ? "PFP saved." : "PFP cleared. Cartoon is back.");
      if (body.action === "username") setNote(j.username ? `Username set to @${j.username}` : "Username cleared.");
    } finally {
      setBusy(false);
    }
  }

  const origin = useMemo(() => (typeof window !== "undefined" ? window.location.origin : "https://solphia.io"), []);
  const invite = owner ? `${origin}/r/${owner}` : "";

  if (!owner) {
    return (
      <main className="mx-auto max-w-md px-5 py-20">
        <h1 className="font-display text-4xl text-ghost">Account</h1>
        <p className="mt-2 text-sm text-mute">Connect Phantom to manage wallets, PFP, launches, and referrals.</p>
        <div className="mt-6">
          <WalletConnect />
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 pb-24 pt-6 md:px-8">
      <div className="flex items-center gap-3">
        <CartoonPfp seed={owner} src={desk?.pfp} className="h-14 w-14" />
        <div>
          <p className="font-mono text-[11px] tracking-[0.22em] text-violet">ACCOUNT</p>
          <h1 className="font-display text-3xl text-ghost">{desk?.username ? `@${desk.username}` : "You"}</h1>
          <p className="font-mono text-[11px] text-mute">
            {owner.slice(0, 6)}…{owner.slice(-6)}
          </p>
        </div>
      </div>

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

      {note && <p className="mt-4 font-mono text-sm text-acid">{note}</p>}

      {tab === "overview" && (
        <div className="mt-6 space-y-4">
          <section className="panel-bubble overflow-hidden rounded-3xl p-5">
            <h2 className="font-display text-2xl text-ghost">Username</h2>
            <p className="mt-1 text-sm text-mute">Unique on Solphia. 3–20 characters, start with a letter. Letters, numbers, underscore.</p>
            <form
              className="mt-3 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                post({ action: "username", username });
              }}
            >
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="@handle"
                maxLength={20}
                className="min-h-[44px] min-w-0 flex-1 rounded-full border border-violet/30 bg-void px-4 font-mono text-sm text-ghost"
              />
              <button type="submit" disabled={busy} className="btn-acid rounded-full px-5 text-sm disabled:opacity-40">
                Save
              </button>
            </form>
          </section>
          <div className="grid gap-3 sm:grid-cols-3">
            <Mini k="Launched" v={String(desk?.launched.length || 0)} />
            <Mini k="Invited" v={String(desk?.referredCount || 0)} />
            <Mini k="Referral rewards" v={`${(desk?.referralRewardsSol || 0).toFixed(4)} SOL`} />
          </div>
        </div>
      )}

      {tab === "wallets" && (
        <section className="panel-bubble mt-6 space-y-4 overflow-hidden rounded-3xl p-5">
          <h2 className="font-display text-2xl text-ghost">Trading wallets</h2>
          <p className="text-sm text-mute">Phantom is login. The trading wallet lives on this device and signs her clips.</p>
          <WalletRow k="Phantom" pk={owner} bal={ownerBal} />
          <WalletRow k="Trading" pk={tradePk} bal={tradeBal} />
          <div className="flex flex-wrap gap-2">
            <Link href="/trading" className="btn-acid rounded-full px-5 py-2 text-sm">
              Add SOL
            </Link>
            <button
              type="button"
              className="btn-ghost rounded-full px-5 py-2 text-sm"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(exportSecret());
                  setNote("Trading key copied. Store it offline.");
                } catch {
                  setNote("Could not copy the trading key.");
                }
              }}
            >
              Backup trading key
            </button>
          </div>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const box = e.currentTarget.elements.namedItem("restore") as HTMLInputElement;
              try {
                const pk = importSecret(box.value);
                setTradePk(pk);
                box.value = "";
                setNote(`Restored ${pk.slice(0, 4)}…${pk.slice(-4)}`);
              } catch (err) {
                setNote(err instanceof Error ? err.message : "restore failed");
              }
            }}
          >
            <input
              name="restore"
              placeholder="paste backup to restore"
              className="min-h-[40px] min-w-0 flex-1 rounded-full border border-violet/30 bg-void px-4 font-mono text-[11px] text-ghost"
            />
            <button type="submit" className="btn-ghost rounded-full px-4 text-sm">
              Restore
            </button>
          </form>
        </section>
      )}

      {tab === "pfp" && (
        <section className="panel-bubble mt-6 overflow-hidden rounded-3xl p-5">
          <h2 className="font-display text-2xl text-ghost">Profile picture</h2>
          <p className="mt-2 text-sm text-mute">
            Until you pick one, we draw a cartoon from your wallet. Same wallet, same face.
          </p>
          <div className="mt-4 flex items-center gap-4">
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
                const data = await squarePfp(f);
                await post({ action: "pfp", pfp: data });
              } catch (err) {
                setNote(err instanceof Error ? err.message : "image failed");
              }
            }}
          />
        </section>
      )}

      {tab === "launches" && (
        <section className="panel-bubble mt-6 overflow-hidden rounded-3xl p-5">
          <h2 className="font-display text-2xl text-ghost">Launched coins</h2>
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
          <h2 className="font-display text-2xl text-ghost">Referrals</h2>
          <p className="mt-2 text-sm text-mute">
            Share your link. When they connect Phantom, they are yours for life. Every coin they launch pays you 25% of
            swap fees — on top of the 50% the actual dev keeps. Withdraw anytime.
          </p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <input readOnly value={invite} className="min-h-[44px] flex-1 rounded-full border border-violet/30 bg-void px-4 font-mono text-[11px] text-ghost" />
            <button
              type="button"
              className="btn-acid rounded-full px-5 py-2 text-sm"
              onClick={async () => {
                await navigator.clipboard.writeText(invite);
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
    </main>
  );
}

function Mini({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-2xl border border-line bg-void/40 px-4 py-3">
      <div className="font-mono text-[10px] tracking-[0.2em] text-mute">{k}</div>
      <div className="mt-1 font-display text-xl text-ghost">{v}</div>
    </div>
  );
}

function WalletRow({ k, pk, bal }: { k: string; pk: string; bal: number }) {
  return (
    <div className="rounded-2xl border border-violet/20 px-4 py-3">
      <div className="font-mono text-[10px] tracking-[0.2em] text-mute">{k}</div>
      <div className="mt-1 break-all font-mono text-xs text-ghost">{pk || "—"}</div>
      <div className="mt-1 font-display text-xl text-acid">{bal.toFixed(4)} SOL</div>
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
