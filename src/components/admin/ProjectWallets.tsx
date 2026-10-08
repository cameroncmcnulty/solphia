"use client";

import { useCallback, useEffect, useState } from "react";
import { CopyButton } from "@/components/CopyButton";
import { FieldError, useConfirmErrors } from "@/components/form/confirm";
import { SwapWidget } from "@/components/SwapWidget";
import { formatSol, formatSolUsd } from "@/lib/formatSol";
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

export function ProjectWallets({
  balances,
  solUsd = 0,
}: {
  balances?: Record<string, number>;
  solUsd?: number;
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
            Treasury, owner, and foundation live in a PIN vault on this admin device — not Phantom. User swaps send the
            open-market 1% live 50/50 into treasury and owner. Balances show full decimals (a few dollars of 1% is
            ~0.0002 SOL, not zero).
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
      <div className="grid gap-6 xl:grid-cols-3">
        {PROJECT_ROLES.map((role) => {
          const local = rows.find((w) => w.role === role.id) || null;
          return (
            <ProjectWalletCard
              key={role.id}
              role={role.id}
              local={local}
              fallbackSol={balances}
              solUsd={solUsd}
              onChange={sync}
            />
          );
        })}
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
  fallbackSol,
  solUsd,
  onChange,
}: {
  role: ProjectRole;
  local: ProjectWallet | null;
  fallbackSol?: Record<string, number>;
  solUsd: number;
  onChange: () => void;
}) {
  const { patch, busy, data } = useAdmin();
  const meta = PROJECT_ROLES.find((r) => r.id === role)!;
  const savedPk =
    role === "treasury" ? data?.treasury || "" : role === "owner" ? data?.ownerWallet || "" : data?.foundationWallet || "";
  const pk = local?.pubkey || savedPk;
  const [tab, setTab] = useState<"swap" | "create" | "receive" | "send" | "backup">("swap");
  const [pin, setPin] = useState("");
  const [phrase, setPhrase] = useState("");
  const [fresh, setFresh] = useState("");
  const [to, setTo] = useState("");
  const [amt, setAmt] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [work, setWork] = useState(false);
  const [liveSol, setLiveSol] = useState<number | null>(null);
  const sendErr = useConfirmErrors<"to" | "amt">();

  const mapped =
    (pk && fallbackSol?.[pk]) ??
    (savedPk && fallbackSol?.[savedPk]) ??
    (local?.pubkey && fallbackSol?.[local.pubkey]) ??
    0;
  const sol = liveSol != null ? liveSol : mapped;

  const loadSol = useCallback(() => {
    if (!pk) {
      setLiveSol(null);
      return;
    }
    void fetch(`/api/sol/balance?pubkey=${encodeURIComponent(pk)}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        const n = Number(j?.sol);
        if (Number.isFinite(n)) setLiveSol(n);
      })
      .catch(() => {});
  }, [pk]);

  useEffect(() => {
    loadSol();
    if (!pk) return;
    const t = window.setInterval(loadSol, 12_000);
    return () => window.clearInterval(t);
  }, [loadSol, pk]);

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
      setTab("swap");
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
      setMsg(`Sent ${formatSol(n)} SOL · ${sig.slice(0, 8)}…`);
      setAmt("");
      loadSol();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Send failed.");
    } finally {
      setWork(false);
    }
  }

  const usd = formatSolUsd(sol, solUsd);

  return (
    <div className="overflow-hidden rounded-[28px] border border-white/10 bg-[#0b0714] shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
      <div className="px-4 pb-1 pt-4 sm:px-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="font-mono text-[10px] tracking-[0.22em] text-white/35">{meta.kicker}</div>
            <div className="mt-1 text-[18px] font-semibold tracking-tight text-white">{meta.label}</div>
          </div>
          <p className="font-mono text-[10px] tracking-[0.18em] text-white/35">SWAP</p>
        </div>
        <div className="mt-3 font-display text-[32px] leading-none text-acid">
          {formatSol(sol)} <span className="text-lg text-white/40">SOL</span>
        </div>
        <div className="mt-1 font-mono text-[12px] text-white/45">{usd || "—"}</div>
        <div className="mt-2 break-all font-mono text-[11px] text-white/70">{pk || "not created"}</div>
        {pk ? (
          <a href={`https://solscan.io/account/${pk}`} target="_blank" rel="noreferrer" className="mt-1 inline-block font-mono text-[10px] text-acid">
            Solscan →
          </a>
        ) : null}
        <p className="mt-2 text-[12px] leading-snug text-white/40">{meta.blurb}</p>
      </div>

      <div className="mt-3 flex flex-wrap gap-1 px-4 sm:px-5">
        {(["swap", "create", "receive", "send", "backup"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => {
              setTab(t);
              setErr("");
              setMsg("");
            }}
            className={`rounded-full px-3 py-1.5 font-mono text-[10px] ${tab === t ? "bg-acid text-void" : "bg-white/8 text-white/50"}`}
          >
            {t === "create" ? (local ? "replace" : "create") : t}
          </button>
        ))}
      </div>

      {tab === "swap" && pk ? (
        <div className="px-1 pb-2 pt-2">
          <SwapWidget
            owner={pk}
            widgetId={`project-swap-${role}`}
            note="Project wallets skip the house 1% so you do not skim yourself. User swaps still pay 1% live 50/50 into treasury and owner."
            signTx={async (transaction) => {
              const sig = await signAndSendProjectTx(role, transaction);
              loadSol();
              return sig;
            }}
            onDone={loadSol}
          />
        </div>
      ) : null}

      {tab === "swap" && !pk ? (
        <p className="px-4 py-4 text-sm text-white/45 sm:px-5">Create this wallet first so user-swap 1% has a destination.</p>
      ) : null}

      {tab === "create" && (
        <div className="space-y-2 px-4 py-4 sm:px-5">
          {!projectHasPin() || !projectUnlocked() ? (
            <input
              inputMode="numeric"
              autoComplete="off"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 8))}
              placeholder="PIN 4–8 digits"
              className="w-full rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 font-mono text-sm text-white outline-none"
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
            className="w-full rounded-2xl border border-white/10 bg-white/[0.06] px-3 py-2 font-mono text-[11px] text-white outline-none"
          />
          <button type="button" disabled={work || busy} onClick={() => void importPhrase()} className="btn-ghost w-full rounded-full py-2 text-sm">
            Import phrase
          </button>
        </div>
      )}

      {tab === "receive" && pk && (
        <div className="space-y-3 px-4 py-4 sm:px-5">
          <div className="mx-auto h-40 w-40" dangerouslySetInnerHTML={{ __html: qrSvg(pk, "#14f195") }} />
          <CopyButton text={pk} label="Copy address" copiedLabel="Copied" className="btn-ghost w-full rounded-full py-2 text-sm" />
        </div>
      )}

      {tab === "send" && (
        <div className="space-y-2 px-4 py-4 sm:px-5">
          <Field field="to" value={to} error={sendErr.errors.to} onChange={(v) => { setTo(v.trim()); sendErr.clear("to"); }} placeholder="Destination" />
          <FieldError error={sendErr.errors.to} />
          <Field field="amt" value={amt} error={sendErr.errors.amt} onChange={(v) => { setAmt(v); sendErr.clear("amt"); }} placeholder="SOL amount" />
          <FieldError error={sendErr.errors.amt} />
          <button type="button" disabled={work} onClick={() => void send()} className="btn-acid w-full rounded-full py-2 text-sm disabled:opacity-40">
            {work ? "Sending…" : "Send SOL"}
          </button>
        </div>
      )}

      {tab === "backup" && (
        <div className="px-4 pb-4 sm:px-5">
          <BackupPanel role={role} seeded={fresh} onDone={() => { setFresh(""); onChange(); }} />
        </div>
      )}

      {msg && <p className="px-4 pb-4 text-sm text-acid sm:px-5">{msg}</p>}
      {err && <p className="px-4 pb-4 text-sm text-blood sm:px-5">{err}</p>}
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
          <ol className="grid grid-cols-2 gap-2 rounded-2xl border border-white/10 p-3">
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
                  className="w-full rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 font-mono text-sm text-white outline-none"
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
