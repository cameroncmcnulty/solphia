"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { WalletConnect } from "@/components/WalletConnect";
import { FieldError, useConfirmErrors } from "@/components/form/confirm";
import { walletOk } from "@/lib/launch/validate";
import { planTreasuryWithdraw } from "@/lib/treasury/plan";
import { signAndSendPhantom } from "@/lib/wallet/trading";
import { useAdmin } from "../AdminProvider";
import { SphaLaunch } from "../SphaLaunch";
import { SphaSection } from "./Spha";
import { Field, shortPk } from "../ui";
import { BuybackPanel } from "../BuybackPanel";

type BalRow = { pk: string; sol: number };
type Pack = {
  solUsd: number;
  hot: boolean;
  treasury: BalRow;
  owner: BalRow;
  dev?: BalRow & { tokens?: number; mint?: string; decimals?: number };
  foundation?: BalRow;
  airdrop?: BalRow;
  lp?: BalRow;
  admins: BalRow[];
  traders: { owner: string; tradingPubkey: string; mode: string; killed: boolean; sol: number }[];
};

const PCTS = [10, 25, 50, 100] as const;

function solStr(n: number) {
  if (!(n > 0)) return "0";
  if (n >= 100) return n.toFixed(2);
  if (n >= 1) return n.toFixed(3);
  return n.toFixed(4);
}

function tokStr(n: number) {
  if (!(n > 0)) return "0";
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function usdStr(sol: number, px: number) {
  if (!(px > 0) || !(sol > 0)) return "";
  return ` · $${(sol * px).toFixed(2)}`;
}

function explorer(pk: string) {
  return `https://solscan.io/account/${pk}`;
}

function CopyPk({ pk }: { pk: string }) {
  const [done, setDone] = useState(false);
  if (!pk) return <span className="text-mute">—</span>;
  return (
    <button
      type="button"
      className="break-all text-left font-mono text-[11px] text-ghost hover:text-acid"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(pk);
          setDone(true);
          setTimeout(() => setDone(false), 1200);
        } catch {
          /* ignore */
        }
      }}
      title="Copy"
    >
      {done ? "copied" : pk}
    </button>
  );
}

function WalletCard({
  kicker,
  title,
  blurb,
  pk,
  sol,
  solUsd,
  tone,
  hold,
  children,
}: {
  kicker: string;
  title: string;
  blurb: string;
  pk: string;
  sol: number;
  solUsd: number;
  tone?: "acid" | "ghost";
  hold?: { label: string; amount: string };
  children?: ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-violet/20 bg-void/40 p-5">
      <div className="font-mono text-[10px] tracking-[0.22em] text-mute">{kicker}</div>
      <div className="mt-1 font-display text-2xl text-ghost">{title}</div>
      <p className="mt-1 text-sm text-mute">{blurb}</p>
      {hold ? (
        <>
          <div className={`mt-4 font-display text-3xl ${tone === "acid" ? "text-acid" : "text-ghost"}`}>
            {hold.amount} <span className="text-lg text-mute">{hold.label}</span>
          </div>
          <div className="font-mono text-[11px] text-mute">
            {solStr(sol)} SOL{usdStr(sol, solUsd)} gas
          </div>
        </>
      ) : (
        <>
          <div className={`mt-4 font-display text-3xl ${tone === "acid" ? "text-acid" : "text-ghost"}`}>
            {solStr(sol)} <span className="text-lg text-mute">SOL</span>
          </div>
          <div className="font-mono text-[11px] text-mute">{usdStr(sol, solUsd).replace(/^ · /, "") || "—"}</div>
        </>
      )}
      <div className="mt-3">
        <CopyPk pk={pk} />
      </div>
      {pk ? (
        <a href={explorer(pk)} target="_blank" rel="noreferrer" className="mt-1 inline-block font-mono text-[10px] text-acid">
          Solscan →
        </a>
      ) : null}
      {children}
    </div>
  );
}

export function WalletsSection() {
  const {
    data,
    busy,
    patch,
    adminPk,
    setAdminPk,
    treasuryPk,
    setTreasuryPk,
    ownerPk,
    setOwnerPk,
    devPk,
    setDevPk,
    sphaMint,
    setSphaMint,
    owner,
  } = useAdmin();
  const adminErr = useConfirmErrors<"adminPk">();
  const treasErr = useConfirmErrors<"treasuryPk">();
  const ownErr = useConfirmErrors<"ownerPk">();
  const devErr = useConfirmErrors<"devPk" | "sphaMint">();
  const [pack, setPack] = useState<Pack | null>(null);
  const [kind, setKind] = useState<"pct" | "sol">("pct");
  const [pct, setPct] = useState<number>(25);
  const [solAmt, setSolAmt] = useState("0.1");
  const [wBusy, setWBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const loadBal = useCallback(async () => {
    const r = await fetch("/api/admin/wallets", { cache: "no-store" });
    const j = await r.json();
    if (r.ok) setPack(j);
  }, []);

  useEffect(() => {
    loadBal().catch(() => {});
  }, [loadBal, data?.treasury, data?.ownerWallet, data?.devWallet, data?.sphaMint]);

  const treasSol = pack?.treasury.sol ?? 0;
  const solUsd = pack?.solUsd || data?.prices.solUsd || 0;
  const value = kind === "pct" ? pct : Number(solAmt);
  const preview = useMemo(
    () => planTreasuryWithdraw(Math.round(treasSol * 1_000_000_000), kind, value),
    [treasSol, kind, value],
  );

  async function withdraw() {
    setErr("");
    setMsg("");
    if (!data?.ownerWallet) {
      setErr("Set an owner wallet first.");
      return;
    }
    if (!preview.ok) {
      setErr(preview.error === "empty" ? "Treasury is too low." : "Amount is too small.");
      return;
    }
    if (!confirm(`Send ${preview.sol.toFixed(4)} SOL from treasury to owner?`)) return;
    setWBusy(true);
    try {
      const r = await fetch("/api/admin/wallets", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind, value, send: true }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.message || j.error || "withdraw failed");
      if (j.signature) {
        setMsg(`Sent ${j.sol.toFixed(4)} SOL · ${j.signature.slice(0, 8)}…`);
        await loadBal();
        return;
      }
      if (j.needsSignature && j.transaction) {
        if (owner && owner !== j.from) {
          throw new Error("Connect the treasury Phantom to sign this send.");
        }
        const sig = await signAndSendPhantom(j.transaction);
        await fetch("/api/admin/wallets", {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ signature: sig }),
        });
        setMsg(`Signed ${j.sol.toFixed(4)} SOL · ${sig.slice(0, 8)}…`);
        await loadBal();
        return;
      }
      throw new Error(j.message || "No signer. Connect treasury Phantom or set TREASURY_SECRET.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "withdraw failed");
    } finally {
      setWBusy(false);
    }
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      <div>
        <div className="font-mono text-[10px] tracking-[0.28em] text-mute">PROTOCOL WALLETS</div>
        <h2 className="mt-1 font-display text-3xl text-ghost">Where SOL sits</h2>
        <p className="mt-1 max-w-2xl text-sm text-mute">
          Treasury takes seats and is the buyback SOL source. Dev holdings are team $SPHA.
          Public market holds the 77.1% tradeable float released into circulation. Foundation / airdrop fund Circle.
          Trading keys are bot-only — never mix them with protocol SOL.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <WalletCard
          kicker="TREASURY · IN"
          title="Treasury"
          blurb={`${data.seatSol} SOL spot seats, ${data.seatSolLev} SOL lev seats, and desk clips land here. Buybacks spend from this wallet.`}
          pk={pack?.treasury.pk || data.treasury}
          sol={treasSol}
          solUsd={solUsd}
          tone="acid"
        >
          {pack?.hot ? <p className="mt-2 font-mono text-[10px] text-acid">Hot signer on the server</p> : null}
        </WalletCard>
        <WalletCard
          kicker="OWNER · OUT"
          title="Owner"
          blurb="Pad owner cut and treasury withdrawals pay here."
          pk={pack?.owner.pk || data.ownerWallet}
          sol={pack?.owner.sol ?? 0}
          solUsd={solUsd}
        />
        <WalletCard
          kicker="DEV · $SPHA"
          title="Dev holdings"
          blurb="Team $SPHA lives here. Separate from treasury SOL and from trading keys."
          pk={pack?.dev?.pk || data.devWallet}
          sol={pack?.dev?.sol ?? 0}
          solUsd={solUsd}
          tone="acid"
          hold={{
            label: "$SPHA",
            amount: pack?.dev?.mint ? tokStr(pack.dev.tokens || 0) : "—",
          }}
        >
          {pack?.dev?.mint ? (
            <p className="mt-2 font-mono text-[10px] text-mute">CA {shortPk(pack.dev.mint, 6)}</p>
          ) : (
            <p className="mt-2 font-mono text-[10px] text-mute">Set the CA below when the mint is live.</p>
          )}
        </WalletCard>
        <WalletCard
          kicker="PUBLIC MARKET · 77.1%"
          title="Public market"
          blurb="Tradeable float released into circulation after launch. Tokens sit here so the public can buy and sell."
          pk={pack?.lp?.pk || data.lpWallet}
          sol={pack?.lp?.sol ?? 0}
          solUsd={solUsd}
        />
        <WalletCard
          kicker="ADMIN · FREE SEAT"
          title="Founder seats"
          blurb="Connected Phantom that skips the paid seat. Keys stay in the wallet."
          pk={data.adminWallets[0] || ""}
          sol={(data.adminWallets || []).reduce((s, pk) => s + (pack?.admins.find((a) => a.pk === pk)?.sol || 0), 0)}
          solUsd={solUsd}
        />
      </div>

      <SphaLaunch />
      <BuybackPanel />

      <div className="rounded-3xl border border-acid/25 bg-acid/[0.04] p-5">
        <div className="font-mono text-[10px] tracking-[0.22em] text-acid">WITHDRAW TREASURY → OWNER</div>
        <p className="mt-1 text-sm text-mute">
          Pull a percent of spendable SOL, or an exact amount. 0.002 SOL stays in treasury so the account does not close.
          {pack?.hot
            ? " Server signs with TREASURY_SECRET."
            : " Sign with the treasury Phantom, or set TREASURY_SECRET on Vercel for a hot send."}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {PCTS.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => {
                setKind("pct");
                setPct(n);
              }}
              className={`rounded-full px-4 py-2 font-mono text-[11px] ${kind === "pct" && pct === n ? "bg-acid/20 text-acid" : "border border-violet/30 text-mute"}`}
            >
              {n}%
            </button>
          ))}
          <label className="flex items-center gap-2 rounded-full border border-violet/30 px-3 py-1.5">
            <span className="font-mono text-[10px] text-mute">SOL</span>
            <input
              type="number"
              min={0}
              step={0.01}
              value={kind === "sol" ? solAmt : ""}
              placeholder="0.25"
              onChange={(e) => {
                setKind("sol");
                setSolAmt(e.target.value);
              }}
              className="w-24 bg-transparent font-mono text-sm text-ghost outline-none"
            />
          </label>
        </div>
        <div className="mt-3 font-mono text-[12px] text-mute">
          {preview.ok
            ? `Send ${preview.sol.toFixed(4)} SOL · leave ${preview.remainingSol.toFixed(4)} SOL in treasury`
            : treasSol <= 0
              ? "No SOL in treasury yet."
              : "Amount is too small or treasury is empty."}
        </div>
        <button
          type="button"
          disabled={wBusy || !preview.ok || !data.ownerWallet}
          onClick={withdraw}
          className="btn-acid mt-4 rounded-full px-6 py-2 text-sm disabled:opacity-40"
        >
          {wBusy ? "Sending…" : "Withdraw to owner"}
        </button>
        {msg && <p className="mt-2 text-sm text-acid">{msg}</p>}
        {err && <p className="mt-2 text-sm text-blood">{err}</p>}
        {!owner && !pack?.hot && (
          <p className="mt-2 text-sm text-mute">Connect the treasury Phantom below if the hot key is not set.</p>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-violet/20 bg-void/40 p-5">
          <div className="font-mono text-[10px] tracking-[0.2em] text-mute">SET TREASURY</div>
          <Field
            field="treasuryPk"
            value={treasuryPk}
            error={treasErr.errors.treasuryPk}
            onChange={(v) => {
              setTreasuryPk(v.trim());
              treasErr.clear("treasuryPk");
            }}
            placeholder="Treasury Solana address"
            className="mt-3"
          />
          <FieldError error={treasErr.errors.treasuryPk} />
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                if (treasuryPk && !walletOk(treasuryPk)) {
                  treasErr.fail({ treasuryPk: "That is not a valid Solana address." });
                  return;
                }
                treasErr.ok();
                patch({ treasuryWallet: treasuryPk || null });
              }}
              className="btn-acid rounded-full px-5 py-2 text-sm disabled:opacity-40"
            >
              Save treasury
            </button>
            <button type="button" disabled={busy} onClick={() => patch({ treasuryWallet: null })} className="btn-ghost rounded-full px-5 py-2 text-sm">
              Clear to env
            </button>
          </div>
        </div>

        <div className="rounded-3xl border border-violet/20 bg-void/40 p-5">
          <div className="font-mono text-[10px] tracking-[0.2em] text-mute">SET OWNER</div>
          <Field
            field="ownerPk"
            value={ownerPk}
            error={ownErr.errors.ownerPk}
            onChange={(v) => {
              setOwnerPk(v.trim());
              ownErr.clear("ownerPk");
            }}
            placeholder="Owner Solana address"
            className="mt-3"
          />
          <FieldError error={ownErr.errors.ownerPk} />
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                if (ownerPk && !walletOk(ownerPk)) {
                  ownErr.fail({ ownerPk: "That is not a valid Solana address." });
                  return;
                }
                ownErr.ok();
                patch({ ownerWallet: ownerPk || null });
              }}
              className="btn-acid rounded-full px-5 py-2 text-sm disabled:opacity-40"
            >
              Save owner
            </button>
            {owner && (
              <button type="button" disabled={busy} onClick={() => patch({ ownerWallet: owner })} className="btn-ghost rounded-full px-5 py-2 text-sm">
                Use connected
              </button>
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-violet/20 bg-void/40 p-5 lg:col-span-2">
          <div className="font-mono text-[10px] tracking-[0.2em] text-mute">SET DEV · $SPHA HOLDINGS</div>
          <p className="mt-1 text-sm text-mute">
            This wallet holds team $SPHA. Not the treasury. Paste the CA when the mint is live so the card can count tokens.
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <Field
                field="devPk"
                value={devPk}
                error={devErr.errors.devPk}
                onChange={(v) => {
                  setDevPk(v.trim());
                  devErr.clear("devPk");
                }}
                placeholder="Dev wallet address"
              />
              <FieldError error={devErr.errors.devPk} />
            </div>
            <div>
              <Field
                field="sphaMint"
                value={sphaMint}
                error={devErr.errors.sphaMint}
                onChange={(v) => {
                  setSphaMint(v.trim());
                  devErr.clear("sphaMint");
                }}
                placeholder="SPHA mint (CA)"
              />
              <FieldError error={devErr.errors.sphaMint} />
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                const issues: Partial<Record<"devPk" | "sphaMint", string>> = {};
                if (devPk && !walletOk(devPk)) issues.devPk = "That is not a valid Solana address.";
                if (sphaMint && !walletOk(sphaMint)) issues.sphaMint = "That is not a valid mint address.";
                if (Object.keys(issues).length) {
                  devErr.fail(issues);
                  return;
                }
                devErr.ok();
                patch({ devWallet: devPk || null, sphaMint: sphaMint || null });
              }}
              className="btn-acid rounded-full px-5 py-2 text-sm disabled:opacity-40"
            >
              Save dev wallet
            </button>
            {owner && (
              <button type="button" disabled={busy} onClick={() => setDevPk(owner)} className="btn-ghost rounded-full px-5 py-2 text-sm">
                Fill connected
              </button>
            )}
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setDevPk("");
                setSphaMint("");
                patch({ devWallet: null, sphaMint: null });
              }}
              className="btn-ghost rounded-full px-5 py-2 text-sm"
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-violet/20 bg-void/40 p-5">
        <div className="font-mono text-[10px] tracking-[0.2em] text-mute">ADMIN WALLET · FREE SEAT</div>
        <p className="mt-2 text-sm text-mute">
          Connect the Phantom you trade with. That address skips the {data.seatSol} / {data.seatSolLev} SOL seat.
        </p>
        <div className="mt-3">
          <WalletConnect />
        </div>
        <Field
          field="adminPk"
          value={adminPk}
          error={adminErr.errors.adminPk}
          onChange={(v) => {
            setAdminPk(v.trim());
            adminErr.clear("adminPk");
          }}
          placeholder="Solana address"
          className="mt-3"
        />
        <FieldError error={adminErr.errors.adminPk} />
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              if (!adminPk) {
                adminErr.fail({ adminPk: "Paste a Solana address or connect Phantom." });
                return;
              }
              if (!walletOk(adminPk)) {
                adminErr.fail({ adminPk: "That is not a valid Solana address." });
                return;
              }
              adminErr.ok();
              patch({ adminWallet: adminPk });
            }}
            className="btn-acid rounded-full px-5 py-2 text-sm disabled:opacity-40"
          >
            Save admin wallet
          </button>
          {owner && (
            <button type="button" disabled={busy} onClick={() => patch({ adminWallet: owner })} className="btn-ghost rounded-full px-5 py-2 text-sm">
              Use connected
            </button>
          )}
        </div>
        <div className="mt-4 space-y-2">
          {(data.adminWallets || []).length === 0 && <p className="font-mono text-[11px] text-mute">None set.</p>}
          {(data.adminWallets || []).map((w) => {
            const sol = pack?.admins.find((a) => a.pk === w)?.sol ?? 0;
            return (
              <div key={w} className="flex items-center justify-between gap-2 font-mono text-[11px]">
                <span className="text-ghost">
                  {shortPk(w, 6)} · {solStr(sol)} SOL
                </span>
                <button type="button" className="text-blood" onClick={() => patch({ removeAdminWallet: w })}>
                  Remove
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-3xl border border-violet/20 bg-void/40 p-5">
        <div className="font-mono text-[10px] tracking-[0.2em] text-mute">TRADING WALLETS · BOT ONLY</div>
        <p className="mt-1 text-sm text-mute">
          These keys clip for seats. They are not the treasury. Do not send protocol SOL here.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="font-mono text-[10px] tracking-[0.16em] text-mute">
              <tr>
                <th className="pb-2 pr-3">Owner</th>
                <th className="pb-2 pr-3">Trading</th>
                <th className="pb-2 pr-3">SOL</th>
                <th className="pb-2">Mode</th>
              </tr>
            </thead>
            <tbody>
              {(pack?.traders || []).length === 0 && (
                <tr>
                  <td colSpan={4} className="py-3 font-mono text-[11px] text-mute">
                    No delegated trading wallets yet.
                  </td>
                </tr>
              )}
              {(pack?.traders || []).map((t) => (
                <tr key={t.tradingPubkey} className="border-t border-violet/15">
                  <td className="py-2 pr-3 font-mono text-[11px] text-ghost">{shortPk(t.owner, 5)}</td>
                  <td className="py-2 pr-3 font-mono text-[11px] text-mute">{shortPk(t.tradingPubkey, 5)}</td>
                  <td className="py-2 pr-3 font-display text-ghost">{solStr(t.sol)}</td>
                  <td className="py-2 font-mono text-[11px] text-mute">
                    {t.mode}
                    {t.killed ? " · killed" : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <SphaSection />
    </div>
  );
}
