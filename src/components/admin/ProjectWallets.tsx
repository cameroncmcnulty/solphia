"use client";

import { useCallback, useEffect, useState } from "react";
import { Keypair } from "@solana/web3.js";
import { CopyButton } from "@/components/CopyButton";
import { FieldError, useConfirmErrors } from "@/components/form/confirm";
import { SOL_MINT, USDC_MINT } from "@/lib/pair/mints";
import { pinOk } from "@/lib/wallet/vaultCrypto";
import { qrSvg } from "@/lib/wallet/qr";
import { phraseFile, phraseWords, pickConfirmSlots } from "@/lib/wallet/phrase";
import { walletOk } from "@/lib/launch/validate";
import {
  PROJECT_ROLES,
  PROJECT_UNLOCK_EVENT,
  PROJECT_VAULT_EVENT,
  createProjectWallet,
  finishProjectUnlock,
  listProjectWallets,
  lockProjectVault,
  markProjectBackupConfirmed,
  projectHasPin,
  projectMnemonic,
  projectUnlocked,
  projectWallet,
  requestProjectUnlock,
  sendProjectSol,
  signAndSendProjectTx,
  unlockProjectVault,
  type ProjectRole,
  type ProjectWallet,
} from "@/lib/wallet/projectVault";
import { useAdmin } from "./AdminProvider";
import { Field, shortPk } from "./ui";

function solStr(n: number) {
  if (!(n > 0)) return "0";
  if (n >= 100) return n.toFixed(2);
  if (n >= 1) return n.toFixed(3);
  return n.toFixed(4);
}

export function ProjectWallets({
  balances,
}: {
  balances?: Record<string, number>;
}) {
  const [rows, setRows] = useState<ProjectWallet[]>([]);
  const [open, setOpen] = useState(false);
  const sync = useCallback(() => setRows(listProjectWallets()), []);
  useEffect(() => {
    sync();
    const onUnlock = () => setOpen(true);
    window.addEventListener(PROJECT_VAULT_EVENT, sync);
    window.addEventListener(PROJECT_UNLOCK_EVENT, onUnlock);
    return () => {
      window.removeEventListener(PROJECT_VAULT_EVENT, sync);
      window.removeEventListener(PROJECT_UNLOCK_EVENT, onUnlock);
    };
  }, [sync]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="font-mono text-[10px] tracking-[0.28em] text-acid">IN-HOUSE PROJECT WALLETS</div>
          <p className="mt-1 max-w-2xl text-sm text-mute">
            Treasury, owner, and foundation live in a PIN vault on this admin device — not Phantom. Seeds never leave
            the browser. After you create each one, the public address is saved so curve fees and swap 1% land here.
            Existing pad configs still pay the previous treasury until new tokens launch.
          </p>
        </div>
        <div className="flex gap-2">
          {projectHasPin() && !projectUnlocked() ? (
            <button type="button" onClick={() => setOpen(true)} className="btn-acid rounded-full px-4 py-2 text-sm">
              Unlock
            </button>
          ) : null}
          {projectUnlocked() ? (
            <button type="button" onClick={() => { lockProjectVault(); sync(); }} className="btn-ghost rounded-full px-4 py-2 text-sm">
              Lock
            </button>
          ) : null}
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        {PROJECT_ROLES.map((role) => (
          <ProjectWalletCard
            key={role.id}
            role={role.id}
            local={rows.find((w) => w.role === role.id) || null}
            sol={balances?.[rows.find((w) => w.role === role.id)?.pubkey || ""] || 0}
            onChange={sync}
          />
        ))}
      </div>
      {open ? <ProjectUnlock onClose={() => setOpen(false)} onDone={sync} /> : null}
    </div>
  );
}

function ProjectUnlock({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function go() {
    if (!pinOk(pin)) {
      setErr("PIN is 4–8 digits.");
      return;
    }
    setBusy(true);
    setErr("");
    try {
      await unlockProjectVault(pin);
      finishProjectUnlock(true);
      onDone();
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Unlock failed.");
    } finally {
      setBusy(false);
    }
  }

  function close() {
    if (!projectUnlocked()) finishProjectUnlock(false);
    onClose();
  }

  return (
    <div className="app-layer z-[97] bg-black/75" onClick={close}>
      <div className="app-layer-card rounded-[1.5rem] border border-white/10 bg-[#0b0714] p-5" onClick={(e) => e.stopPropagation()}>
        <p className="text-[18px] font-semibold text-white">Unlock project wallets</p>
        <p className="mt-1 text-[13px] text-white/45">PIN stays on this device. Solphia never receives it.</p>
        {err ? <p className="mt-2 font-mono text-[13px] text-blood">{err}</p> : null}
        <input
          inputMode="numeric"
          autoComplete="off"
          autoFocus
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 8))}
          onKeyDown={(e) => {
            if (e.key === "Enter") void go();
          }}
          className="mt-4 min-h-[48px] w-full rounded-2xl border border-white/10 bg-white/[0.06] px-3 font-mono text-[22px] tracking-[0.45em] text-white outline-none"
        />
        <button type="button" disabled={busy} onClick={() => void go()} className="btn-acid mt-4 min-h-[48px] w-full rounded-full disabled:opacity-40">
          {busy ? "Unlocking…" : "Unlock"}
        </button>
      </div>
    </div>
  );
}

function ProjectWalletCard({
  role,
  local,
  sol,
  onChange,
}: {
  role: ProjectRole;
  local: ProjectWallet | null;
  sol: number;
  onChange: () => void;
}) {
  const { patch, busy, data } = useAdmin();
  const meta = PROJECT_ROLES.find((r) => r.id === role)!;
  const savedPk =
    role === "treasury" ? data?.treasury || "" : role === "owner" ? data?.ownerWallet || "" : data?.foundationWallet || "";
  const pk = local?.pubkey || savedPk;
  const [tab, setTab] = useState<"home" | "create" | "receive" | "send" | "swap" | "backup">("home");
  const [pin, setPin] = useState("");
  const [phrase, setPhrase] = useState("");
  const [fresh, setFresh] = useState("");
  const [to, setTo] = useState("");
  const [amt, setAmt] = useState("");
  const [mint, setMint] = useState(USDC_MINT);
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [work, setWork] = useState(false);
  const sendErr = useConfirmErrors<"to" | "amt">();

  async function generate() {
    setErr("");
    setMsg("");
    setWork(true);
    try {
      const out = await createProjectWallet({ role, pin: pin || undefined });
      setFresh(out.phrase || "");
      setTab("backup");
      onChange();
      await patch({ [meta.stateKey]: out.wallet.pubkey });
      setMsg("Created. Save the phrase, then fund this address.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not create wallet.");
    } finally {
      setWork(false);
    }
  }

  async function importPhrase() {
    setErr("");
    setWork(true);
    try {
      const out = await createProjectWallet({ role, pin: pin || undefined, phrase });
      onChange();
      await patch({ [meta.stateKey]: out.wallet.pubkey });
      setTab("home");
      setMsg("Imported. Public address saved. Phrase stays on this device.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not import.");
    } finally {
      setWork(false);
    }
  }

  async function send() {
    const issues: Partial<Record<"to" | "amt", string>> = {};
    if (!walletOk(to)) issues.to = "Invalid address.";
    const n = Number(amt);
    if (!(n > 0)) issues.amt = "Enter an amount.";
    if (Object.keys(issues).length) {
      sendErr.fail(issues);
      return;
    }
    sendErr.ok();
    setErr("");
    setWork(true);
    try {
      const sig = await sendProjectSol(role, to.trim(), n);
      setMsg(`Sent ${n} SOL · ${sig.slice(0, 8)}…`);
      setAmt("");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Send failed.");
    } finally {
      setWork(false);
    }
  }

  async function swap() {
    if (!pk) return;
    const n = Number(amt);
    if (!(n > 0)) {
      setErr("Enter an amount.");
      return;
    }
    setErr("");
    setWork(true);
    try {
      const other = mint.trim() === SOL_MINT || !mint.trim() ? USDC_MINT : mint.trim();
      const inputMint = side === "buy" ? SOL_MINT : other;
      const outputMint = side === "buy" ? other : SOL_MINT;
      if (inputMint === outputMint) {
        setErr("Pick a token other than SOL.");
        setWork(false);
        return;
      }
      const built = await fetch("/api/swap/build", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ owner: pk, inputMint, outputMint, amount: n }),
      });
      const j = (await built.json().catch(() => ({}))) as { transaction?: string; error?: string };
      if (!built.ok || !j.transaction) throw new Error(j.error || "Could not build the swap.");
      const extras: Keypair[] = [];
      const sig = await signAndSendProjectTx(role, j.transaction, extras);
      setMsg(`Swap landed · ${sig.slice(0, 8)}…`);
      setAmt("");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Swap failed.");
    } finally {
      setWork(false);
    }
  }

  return (
    <div className="rounded-3xl border border-violet/20 bg-void/40 p-5">
      <div className="font-mono text-[10px] tracking-[0.22em] text-mute">{meta.kicker}</div>
      <div className="mt-1 font-display text-2xl text-ghost">{meta.label}</div>
      <p className="mt-1 text-sm text-mute">{meta.blurb}</p>
      <div className="mt-4 font-display text-3xl text-acid">
        {solStr(sol)} <span className="text-lg text-mute">SOL</span>
      </div>
      <div className="mt-2 break-all font-mono text-[11px] text-ghost">{pk || "not created"}</div>
      {pk ? (
        <a href={`https://solscan.io/account/${pk}`} target="_blank" rel="noreferrer" className="mt-1 inline-block font-mono text-[10px] text-acid">
          Solscan →
        </a>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-1">
        {(["home", "create", "receive", "send", "swap", "backup"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => {
              setTab(t);
              setErr("");
              setMsg("");
            }}
            className={`rounded-full px-3 py-1 font-mono text-[10px] ${tab === t ? "bg-acid/20 text-acid" : "text-mute"}`}
          >
            {t === "create" ? (local ? "replace" : "create") : t}
          </button>
        ))}
      </div>

      {tab === "create" && (
        <div className="mt-4 space-y-2">
          {!projectHasPin() || !projectUnlocked() ? (
            <input
              inputMode="numeric"
              autoComplete="off"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 8))}
              placeholder="PIN 4–8 digits"
              className="w-full rounded-full border border-violet/30 bg-void px-4 py-2 font-mono text-sm outline-none"
            />
          ) : null}
          <button type="button" disabled={work || busy} onClick={() => void generate()} className="btn-acid w-full rounded-full py-2 text-sm disabled:opacity-40">
            {work ? "Creating…" : "Generate new wallet"}
          </button>
          <textarea
            value={phrase}
            onChange={(e) => setPhrase(e.target.value)}
            placeholder="Or paste a 12/24-word phrase to import"
            rows={3}
            className="w-full rounded-2xl border border-violet/30 bg-void px-3 py-2 font-mono text-[11px] outline-none"
          />
          <button type="button" disabled={work || busy} onClick={() => void importPhrase()} className="btn-ghost w-full rounded-full py-2 text-sm">
            Import phrase
          </button>
        </div>
      )}

      {tab === "receive" && pk && (
        <div className="mt-4 space-y-3">
          <div className="mx-auto h-40 w-40" dangerouslySetInnerHTML={{ __html: qrSvg(pk, "#14f195") }} />
          <CopyButton text={pk} label="Copy address" copiedLabel="Copied" className="btn-ghost w-full rounded-full py-2 text-sm" />
        </div>
      )}

      {tab === "send" && (
        <div className="mt-4 space-y-2">
          <Field field="to" value={to} error={sendErr.errors.to} onChange={(v) => { setTo(v.trim()); sendErr.clear("to"); }} placeholder="Destination" />
          <FieldError error={sendErr.errors.to} />
          <Field field="amt" value={amt} error={sendErr.errors.amt} onChange={(v) => { setAmt(v); sendErr.clear("amt"); }} placeholder="SOL amount" />
          <FieldError error={sendErr.errors.amt} />
          <button type="button" disabled={work} onClick={() => void send()} className="btn-acid w-full rounded-full py-2 text-sm disabled:opacity-40">
            {work ? "Sending…" : "Send SOL"}
          </button>
        </div>
      )}

      {tab === "swap" && (
        <div className="mt-4 space-y-2">
          <div className="flex rounded-full border border-violet/30 p-0.5">
            {(["buy", "sell"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSide(s)}
                className={`flex-1 rounded-full py-1 font-mono text-[11px] ${side === s ? "bg-acid/20 text-acid" : "text-mute"}`}
              >
                {s === "buy" ? "SOL → token" : "token → SOL"}
              </button>
            ))}
          </div>
          <Field value={mint} onChange={setMint} placeholder="Mint (USDC default)" />
          <Field value={amt} onChange={setAmt} placeholder={side === "buy" ? "SOL in" : "Token amount"} />
          <button type="button" disabled={work} onClick={() => void swap()} className="btn-acid w-full rounded-full py-2 text-sm disabled:opacity-40">
            {work ? "Swapping…" : "Swap"}
          </button>
          <p className="font-mono text-[10px] text-mute">Project wallets skip the house 1% so you do not skim yourself. Curve swaps still pay the on-chain 1%.</p>
        </div>
      )}

      {tab === "backup" && (
        <BackupPanel role={role} seeded={fresh} onDone={() => { setFresh(""); onChange(); }} />
      )}

      {msg && <p className="mt-3 text-sm text-acid">{msg}</p>}
      {err && <p className="mt-3 text-sm text-blood">{err}</p>}
    </div>
  );
}

function BackupPanel({ role, seeded, onDone }: { role: ProjectRole; seeded?: string; onDone: () => void }) {
  const [phrase, setPhrase] = useState(seeded || "");
  const [slots, setSlots] = useState<number[]>([]);
  const [typed, setTyped] = useState<Record<number, string>>({});
  const [err, setErr] = useState("");
  const words = phraseWords(phrase);
  const wallet = projectWallet(role);

  async function reveal() {
    setErr("");
    let m = seeded || projectMnemonic(role);
    if (!m) {
      const ok = await requestProjectUnlock();
      if (!ok) {
        setErr("Unlock to view the phrase.");
        return;
      }
      m = projectMnemonic(role);
    }
    if (!m) {
      setErr("Unlock to view the phrase.");
      return;
    }
    setPhrase(m);
    setSlots(pickConfirmSlots(m.split(" ").length, 3));
    setTyped({});
  }

  useEffect(() => {
    if (seeded) {
      setPhrase(seeded);
      setSlots(pickConfirmSlots(seeded.split(" ").length, 3));
    }
  }, [seeded]);

  function confirmSaved() {
    for (const i of slots) {
      if ((typed[i] || "").trim().toLowerCase() !== words[i]) {
        setErr("Those words do not match.");
        return;
      }
    }
    markProjectBackupConfirmed(role);
    onDone();
  }

  function download() {
    if (!phrase || !wallet) return;
    const blob = new Blob([phraseFile(phrase, wallet.pubkey)], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `solphia-${role}-phrase.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div className="mt-4 space-y-3">
      <p className="text-sm text-mute">Phrase never leaves this device. Losing it means losing the funds.</p>
      {err ? <p className="font-mono text-[12px] text-blood">{err}</p> : null}
      {!phrase ? (
        <button type="button" onClick={() => void reveal()} className="btn-ghost w-full rounded-full py-2 text-sm">
          Reveal phrase
        </button>
      ) : (
        <>
          <ol className="grid grid-cols-2 gap-2 rounded-2xl border border-violet/20 p-3">
            {words.map((w, i) => (
              <li key={`${w}-${i}`} className="flex gap-2 font-mono text-[12px] text-ghost">
                <span className="text-mute">{i + 1}.</span>
                {w}
              </li>
            ))}
          </ol>
          <div className="flex flex-wrap gap-2">
            <CopyButton text={phrase} label="Copy" copiedLabel="Copied" className="btn-ghost rounded-full px-3 py-1.5 text-sm" />
            <button type="button" onClick={download} className="btn-ghost rounded-full px-3 py-1.5 text-sm">
              Download
            </button>
          </div>
          {slots.length ? (
            <div className="space-y-2">
              <p className="font-mono text-[10px] text-mute">Type three words to confirm you saved it</p>
              {slots.map((i) => (
                <input
                  key={i}
                  value={typed[i] || ""}
                  onChange={(e) => setTyped((p) => ({ ...p, [i]: e.target.value }))}
                  placeholder={`Word ${i + 1}`}
                  className="w-full rounded-full border border-violet/30 bg-void px-4 py-2 font-mono text-sm outline-none"
                />
              ))}
              <button type="button" onClick={confirmSaved} className="btn-acid w-full rounded-full py-2 text-sm">
                I saved this phrase
              </button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
