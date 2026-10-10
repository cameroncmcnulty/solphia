"use client";

import { useMemo, useState } from "react";
import { SphaMark } from "@/components/SphaMark";
import { CopyButton } from "@/components/CopyButton";
import { createEmbeddedWallet, vaultHasPin, vaultUnlocked } from "@/lib/wallet/vault";
import { newPhrase, phraseFile, phraseOk, phraseWords, pickConfirmSlots } from "@/lib/wallet/phrase";
import { pinOk } from "@/lib/wallet/vaultCrypto";
import { WalletSheet } from "./sheet";
import { WALLET_PATHS } from "@/lib/wallet/paths";
import { linkAccountWallet, refreshAccount } from "@/lib/auth/client";
import { syncOwnerToSignedInAccount } from "@/lib/wallet/identity";

type Step = "chooser" | "phrase" | "confirm" | "import" | "pin";
type Kind = "create" | "import";

function downloadPhrase(phrase: string, pubkey: string) {
  const blob = new Blob([phraseFile(phrase, pubkey)], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "solphia-recovery-phrase.txt";
  a.click();
  URL.revokeObjectURL(url);
}

export function WalletOnboard({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<Step>("chooser");
  const [kind, setKind] = useState<Kind>("create");
  const [phrase, setPhrase] = useState("");
  const [importText, setImportText] = useState("");
  const [pin, setPin] = useState("");
  const [pin2, setPin2] = useState("");
  const [slots, setSlots] = useState<number[]>([]);
  const [typed, setTyped] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const words = useMemo(() => phraseWords(phrase), [phrase]);
  const unlockPin = vaultHasPin();
  const pinReady = vaultUnlocked();

  function seedPhrase() {
    return kind === "import" ? importText : phrase;
  }

  function goPinOrSave() {
    setErr("");
    if (!pinReady) {
      setStep("pin");
      return;
    }
    void finish();
  }

  function startCreate() {
    const next = newPhrase();
    setKind("create");
    setPhrase(next);
    setSlots(pickConfirmSlots(12, 3));
    setTyped({});
    setErr("");
    setStep("phrase");
  }

  async function finish() {
    setBusy(true);
    setErr("");
    try {
      if (!vaultUnlocked()) {
        if (!pinOk(pin)) throw new Error("PIN is 4–8 digits.");
        if (!vaultHasPin() && pin !== pin2) throw new Error("PINs do not match.");
      }
      const created = await createEmbeddedWallet({
        pin: vaultUnlocked() ? undefined : pin,
        phrase: seedPhrase(),
      });
      await linkAccountWallet(created.wallet.pubkey);
      await refreshAccount();
      syncOwnerToSignedInAccount();
      onClose();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not save this wallet.";
      if (/unlock with your pin first/i.test(msg)) {
        setStep("pin");
        setErr("Enter the PIN for this device, then we save the recovery phrase.");
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
    goPinOrSave();
  }

  const title =
    step === "chooser"
      ? "Your wallet"
      : step === "phrase"
        ? "Recovery phrase"
        : step === "confirm"
          ? "Confirm the phrase"
          : step === "import"
            ? "Recover wallet"
            : unlockPin
              ? "Unlock with PIN"
              : "Set a PIN";

  const subtitle =
    step === "chooser"
      ? "Create a Solphia wallet, or recover one onto your account with a phrase. Phantom is only for sending funds in or out."
      : step === "phrase"
        ? "Write these 12 words down. If you lose them, the funds are gone. We cannot recover them."
        : step === "confirm"
          ? "Type the three words below so we know you saved the phrase."
          : step === "import"
            ? "Paste a 12/24-word phrase. The wallet is attached to your account. The phrase never leaves this device."
            : unlockPin
              ? kind === "import"
                ? "Unlock this device, then the wallet is attached to your account. The phrase never leaves here."
                : "This device already has a PIN. Unlock, then the recovery phrase is saved here."
              : "Unlocks this device only. Solphia never receives this PIN.";

  return (
    <WalletSheet title={title} subtitle={subtitle} onClose={onClose}>
      {err ? <p className="mb-3 font-mono text-[13px] text-blood">{err}</p> : null}

      {step === "chooser" ? (
        <div className="space-y-2">
          <button
            type="button"
            onClick={startCreate}
            className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-left"
          >
            <SphaMark className="h-8 w-8" />
            <span>
              <span className="block text-[15px] font-semibold text-white">{WALLET_PATHS.create.title}</span>
              <span className="block text-[13px] text-white/45">{WALLET_PATHS.create.hint}</span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => {
              setKind("import");
              setErr("");
              setStep("import");
            }}
            className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-left"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 font-mono text-[11px] text-white">IN</span>
            <span>
              <span className="block text-[15px] font-semibold text-white">{WALLET_PATHS.import.title}</span>
              <span className="block text-[13px] text-white/45">{WALLET_PATHS.import.hint}</span>
            </span>
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
          <p className="mt-3 text-[13px] text-blood">Anyone with this phrase can empty the wallet. Do not screenshot a cloud backup.</p>
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
              goPinOrSave();
            }}
          >
            Continue
          </button>
        </div>
      ) : null}

      {step === "pin" ? (
        <div className="space-y-3">
          <label className="block">
            <span className="font-mono text-[11px] tracking-[0.16em] text-white/40">{unlockPin ? "DEVICE PIN" : "PIN"}</span>
            <input
              inputMode="numeric"
              autoComplete="off"
              autoFocus
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 8))}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (unlockPin || pin === pin2)) void finish();
              }}
              className="mt-1 min-h-[44px] w-full rounded-2xl border border-white/10 bg-white/[0.06] px-3 font-mono text-[18px] tracking-[0.4em] text-white outline-none"
            />
          </label>
          {unlockPin ? null : (
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
          )}
          <button
            type="button"
            disabled={busy || !pinOk(pin) || (!unlockPin && pin !== pin2)}
            className="btn-acid min-h-[48px] w-full rounded-full disabled:opacity-40"
            onClick={() => void finish()}
          >
            {busy
              ? "Saving…"
              : kind === "import"
                ? unlockPin
                  ? "Unlock and recover onto account"
                  : "Recover onto your account"
                : unlockPin
                  ? "Unlock and save wallet"
                  : "Save wallet on this device"}
          </button>
          <button
            type="button"
            disabled={busy}
            className="w-full text-center text-[13px] text-white/45"
            onClick={() => {
              setErr("");
              setStep(kind === "import" ? "import" : "confirm");
            }}
          >
            Back
          </button>
        </div>
      ) : null}
    </WalletSheet>
  );
}
