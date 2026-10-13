"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { SphaMark } from "@/components/SphaMark";
import { CopyButton } from "@/components/CopyButton";
import {
  addDerivedWallet,
  createEmbeddedWallet,
  listWallets,
  unlockVault,
  vaultHasPin,
  vaultUnlocked,
  wipeVault,
} from "@/lib/wallet/vault";
import { newPhrase, phraseFile, phraseOk, phraseWords, pickConfirmSlots } from "@/lib/wallet/phrase";
import { pinOk } from "@/lib/wallet/vaultCrypto";
import { WalletSheet } from "./sheet";
import { WALLET_PATHS } from "@/lib/wallet/paths";
import { flashNotice } from "@/lib/notice";
import { linkAccountWallet, peekAccount, startWalletSession } from "@/lib/auth/client";
import { syncOwnerToSignedInAccount } from "@/lib/wallet/identity";

type Step = "chooser" | "replace" | "phrase" | "confirm" | "import" | "pin";
type Kind = "create" | "import" | "unlock";

function downloadPhrase(phrase: string, pubkey: string) {
  const blob = new Blob([phraseFile(phrase, pubkey)], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "solphia-recovery-phrase.txt";
  a.click();
  URL.revokeObjectURL(url);
}

function TosBoxes({
  tos,
  privacy,
  setTos,
  setPrivacy,
}: {
  tos: boolean;
  privacy: boolean;
  setTos: (v: boolean) => void;
  setPrivacy: (v: boolean) => void;
}) {
  return (
    <div className="space-y-2">
      <label className="flex items-start gap-2 text-sm text-ghost">
        <input type="checkbox" checked={tos} onChange={(e) => setTos(e.target.checked)} className="mt-1" />
        <span>
          I agree to the{" "}
          <Link href="/legal#terms" target="_blank" className="text-acid underline">
            Terms of Service
          </Link>
          .
        </span>
      </label>
      <label className="flex items-start gap-2 text-sm text-ghost">
        <input type="checkbox" checked={privacy} onChange={(e) => setPrivacy(e.target.checked)} className="mt-1" />
        <span>
          I have read the{" "}
          <Link href="/legal#privacy" target="_blank" className="text-acid underline">
            Privacy Policy
          </Link>
          .
        </span>
      </label>
    </div>
  );
}

export function WalletOnboard({ onClose }: { onClose: () => void }) {
  const signedIn = Boolean(peekAccount()?.id);
  const hasVault = vaultHasPin();
  const [step, setStep] = useState<Step>("chooser");
  const [kind, setKind] = useState<Kind>(hasVault ? "unlock" : "create");
  const [phrase, setPhrase] = useState("");
  const [importText, setImportText] = useState("");
  const [pin, setPin] = useState("");
  const [pin2, setPin2] = useState("");
  const [slots, setSlots] = useState<number[]>([]);
  const [typed, setTyped] = useState<Record<number, string>>({});
  const [tos, setTos] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const words = useMemo(() => phraseWords(phrase), [phrase]);
  const unlockPin = vaultHasPin();

  function seedPhrase() {
    return kind === "import" ? importText : phrase;
  }

  function startCreate() {
    if (hasVault && !signedIn) {
      setKind("create");
      setErr("");
      setStep("replace");
      return;
    }
    if (signedIn) {
      void addAddress();
      return;
    }
    beginCreate();
  }

  function beginCreate() {
    const next = newPhrase();
    setKind("create");
    setPhrase(next);
    setSlots(pickConfirmSlots(12, 3));
    setTyped({});
    setErr("");
    setStep("phrase");
  }

  function startImport() {
    setKind("import");
    setErr("");
    if (hasVault && !signedIn) {
      setStep("replace");
      return;
    }
    setStep("import");
  }

  async function addAddress() {
    setBusy(true);
    setErr("");
    try {
      const wallet = await addDerivedWallet();
      if (peekAccount()?.id) await linkAccountWallet(wallet.pubkey);
      syncOwnerToSignedInAccount();
      flashNotice("New address from the same phrase.");
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not add an address.");
    } finally {
      setBusy(false);
    }
  }

  async function finishUnlock() {
    setBusy(true);
    setErr("");
    try {
      if (!pinOk(pin)) throw new Error("PIN is 4–8 digits.");
      await unlockVault(pin);
      const active = listWallets().find((w) => w.kind === "embedded") || listWallets({ hidden: true }).find((w) => w.kind === "embedded");
      if (!active) throw new Error("No Solphia wallet on this device.");
      await startWalletSession(active.pubkey, { tos: true, privacy: true });
      syncOwnerToSignedInAccount();
      flashNotice("Wallet unlocked");
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not unlock.");
    } finally {
      setBusy(false);
    }
  }

  async function finish() {
    if (kind === "unlock") {
      await finishUnlock();
      return;
    }
    setBusy(true);
    setErr("");
    try {
      if (!vaultUnlocked()) {
        if (!pinOk(pin)) throw new Error("PIN is 4–8 digits.");
        if (!unlockPin && pin !== pin2) throw new Error("PINs do not match.");
      }
      if (!tos || !privacy) throw new Error("Agree to the terms and privacy policy.");
      const created = await createEmbeddedWallet({
        pin: vaultUnlocked() ? undefined : pin,
        phrase: seedPhrase(),
        replace: !signedIn,
      });
      await startWalletSession(created.wallet.pubkey, { tos, privacy });
      syncOwnerToSignedInAccount();
      flashNotice(kind === "import" ? "Wallet recovered" : "Wallet created");
      onClose();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not save this wallet.";
      if (/unlock with your pin first/i.test(msg)) {
        setStep("pin");
        setErr("Enter the PIN for this device.");
      } else {
        setErr(msg);
      }
    } finally {
      setBusy(false);
    }
  }

  function checkWords() {
    for (const i of slots) {
      if ((typed[i] || "").trim().toLowerCase() !== words[i]) {
        setErr("Those words do not match. Look at the phrase again.");
        return;
      }
    }
    setErr("");
    setStep("pin");
  }

  const title =
    step === "chooser"
      ? "Wallet"
      : step === "replace"
        ? "New account"
        : step === "phrase"
          ? "Secret recovery phrase"
          : step === "confirm"
            ? "Confirm the phrase"
            : step === "import"
              ? "Import recovery phrase"
              : kind === "unlock"
                ? "Unlock wallet"
                : unlockPin
                  ? "Unlock with PIN"
                  : "Create a PIN";

  const subtitle =
    step === "chooser"
      ? "Create a new Solphia wallet or import a 12-word phrase. No email. No Google. No Phantom."
      : step === "replace"
        ? "This wipes the wallet on this device and starts a new account. Only continue if you saved the old recovery phrase."
        : step === "phrase"
          ? "Write these 12 words down and copy them somewhere offline. Anyone with them can take the funds. Solphia never has a copy."
          : step === "confirm"
            ? "Type the three words below so we know you saved the phrase."
            : step === "import"
              ? "Paste the 12 or 24 words. This restores that account only. The phrase never leaves this device."
              : kind === "unlock"
                ? "Unlock the wallet already on this device."
                : "This PIN encrypts the phrase on this device. Solphia never receives it.";

  return (
    <WalletSheet title={title} subtitle={subtitle} onClose={onClose}>
      {err ? <p className="mb-3 font-mono text-[13px] text-blood">{err}</p> : null}

      {step === "chooser" ? (
        <div className="space-y-2">
          {hasVault ? (
            <button
              type="button"
              onClick={() => {
                setKind("unlock");
                setErr("");
                setStep("pin");
              }}
              className="flex w-full items-center gap-3 rounded-2xl border border-acid/30 bg-acid/[0.06] px-4 py-3 text-left"
            >
              <SphaMark className="h-8 w-8" />
              <span>
                <span className="block text-[15px] font-semibold text-white">Unlock this wallet</span>
                <span className="block text-[13px] text-white/45">PIN for the seed already on this device.</span>
              </span>
            </button>
          ) : null}
          <button
            type="button"
            onClick={startCreate}
            disabled={busy}
            className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-left"
          >
            <SphaMark className="h-8 w-8" />
            <span>
              <span className="block text-[15px] font-semibold text-white">
                {signedIn ? "Add address from this phrase" : WALLET_PATHS.create.title}
              </span>
              <span className="block text-[13px] text-white/45">
                {signedIn ? "Same recovery phrase. New Solana address." : WALLET_PATHS.create.hint}
              </span>
            </span>
          </button>
          {signedIn ? null : (
            <button
              type="button"
              onClick={startImport}
              className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-left"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 font-mono text-[11px] text-white">IN</span>
              <span>
                <span className="block text-[15px] font-semibold text-white">{WALLET_PATHS.import.title}</span>
                <span className="block text-[13px] text-white/45">{WALLET_PATHS.import.hint}</span>
              </span>
            </button>
          )}
        </div>
      ) : null}

      {step === "replace" ? (
        <div>
          <p className="text-[14px] text-white/70">
            Sign-out does not keep the last seed attached. Create or import starts a clean account. The old phrase is the only way back.
          </p>
          <button
            type="button"
            className="btn-acid mt-4 min-h-[48px] w-full rounded-full"
            onClick={() => {
              wipeVault();
              if (kind === "import") setStep("import");
              else beginCreate();
            }}
          >
            Wipe this device and continue
          </button>
          <button type="button" className="mt-3 w-full text-center text-[13px] text-white/45" onClick={() => setStep("chooser")}>
            Back
          </button>
        </div>
      ) : null}

      {step === "phrase" ? (
        <div>
          <ol className="grid grid-cols-2 gap-2 rounded-2xl border border-acid/25 bg-acid/[0.04] p-3">
            {words.map((w, i) => (
              <li key={`${w}-${i}`} className="flex items-baseline gap-2 font-mono text-[14px] text-white">
                <span className="w-5 select-none text-[11px] text-white/35">{i + 1}.</span>
                <span className="select-all">{w}</span>
              </li>
            ))}
          </ol>
          <div className="mt-3 flex flex-wrap gap-2">
            <CopyButton
              text={phrase}
              label="Copy phrase"
              copiedLabel="Copied"
              className="rounded-full bg-white/10 px-4 py-2 text-[13px] text-white"
            />
            <button
              type="button"
              className="rounded-full bg-white/10 px-4 py-2 text-[13px] text-white"
              onClick={() => downloadPhrase(phrase, "pending")}
            >
              Download .txt
            </button>
          </div>
          <p className="mt-3 text-[13px] text-blood">Never share this phrase. Never screenshot it to iCloud or Google Photos. Solphia cannot recover it.</p>
          <button type="button" className="btn-acid mt-4 min-h-[48px] w-full rounded-full" onClick={() => setStep("confirm")}>
            I saved these words
          </button>
        </div>
      ) : null}

      {step === "confirm" ? (
        <div className="space-y-3">
          {slots.map((i) => (
            <label key={i} className="block">
              <span className="font-mono text-[11px] tracking-[0.16em] text-white/40">WORD {i + 1}</span>
              <input
                value={typed[i] || ""}
                onChange={(e) => setTyped((s) => ({ ...s, [i]: e.target.value.trim().toLowerCase() }))}
                autoCapitalize="none"
                autoCorrect="off"
                className="mt-1 min-h-[44px] w-full rounded-2xl border border-white/10 bg-white/[0.06] px-3 font-mono text-[14px] text-white outline-none"
              />
            </label>
          ))}
          <button type="button" className="btn-acid min-h-[48px] w-full rounded-full" onClick={checkWords}>
            Continue
          </button>
          <button type="button" className="w-full text-center text-[13px] text-white/45" onClick={() => setStep("phrase")}>
            Show the phrase again
          </button>
        </div>
      ) : null}

      {step === "import" ? (
        <div>
          <textarea
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            placeholder="twelve words…"
            className="min-h-[120px] w-full rounded-2xl border border-white/10 bg-white/[0.06] px-3 py-3 font-mono text-[13px] text-white outline-none"
          />
          <button
            type="button"
            disabled={busy || !importText.trim()}
            className="btn-acid mt-3 min-h-[48px] w-full rounded-full disabled:opacity-40"
            onClick={() => {
              if (!phraseOk(importText)) {
                setErr("That recovery phrase is not valid.");
                return;
              }
              setErr("");
              setStep("pin");
            }}
          >
            Continue
          </button>
        </div>
      ) : null}

      {step === "pin" ? (
        <div className="space-y-3">
          <label className="block">
            <span className="font-mono text-[11px] tracking-[0.16em] text-white/40">
              {kind === "unlock" || unlockPin ? "DEVICE PIN" : "PIN"}
            </span>
            <input
              inputMode="numeric"
              autoComplete="off"
              autoFocus
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 8))}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (kind === "unlock" || unlockPin || pin === pin2)) void finish();
              }}
              className="mt-1 min-h-[44px] w-full rounded-2xl border border-white/10 bg-white/[0.06] px-3 font-mono text-[18px] tracking-[0.4em] text-white outline-none"
            />
          </label>
          {kind !== "unlock" && !unlockPin ? (
            <label className="block">
              <span className="font-mono text-[11px] tracking-[0.16em] text-white/40">CONFIRM PIN</span>
              <input
                inputMode="numeric"
                autoComplete="off"
                value={pin2}
                onChange={(e) => setPin2(e.target.value.replace(/\D/g, "").slice(0, 8))}
                className="mt-1 min-h-[44px] w-full rounded-2xl border border-white/10 bg-white/[0.06] px-3 font-mono text-[18px] tracking-[0.4em] text-white outline-none"
              />
            </label>
          ) : null}
          {kind === "unlock" ? null : <TosBoxes tos={tos} privacy={privacy} setTos={setTos} setPrivacy={setPrivacy} />}
          <button
            type="button"
            disabled={
              busy ||
              !pinOk(pin) ||
              (kind !== "unlock" && !unlockPin && pin !== pin2) ||
              (kind !== "unlock" && (!tos || !privacy))
            }
            className="btn-acid min-h-[48px] w-full rounded-full disabled:opacity-40"
            onClick={() => void finish()}
          >
            {busy
              ? "Saving…"
              : kind === "unlock"
                ? "Unlock"
                : kind === "import"
                  ? "Import wallet"
                  : "Create wallet"}
          </button>
          <button
            type="button"
            disabled={busy}
            className="w-full text-center text-[13px] text-white/45"
            onClick={() => {
              setErr("");
              setStep(kind === "import" ? "import" : kind === "unlock" ? "chooser" : "confirm");
            }}
          >
            Back
          </button>
        </div>
      ) : null}
    </WalletSheet>
  );
}
