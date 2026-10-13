"use client";

import { useState } from "react";
import { CopyButton } from "@/components/CopyButton";
import { activeWallet, requestUnlock, unlockedMnemonic, vaultUnlocked } from "@/lib/wallet/vault";
import { phraseFile, phraseWords } from "@/lib/wallet/phrase";

export function RecoveryPhraseSettings() {
  const [open, setOpen] = useState(false);
  const [warn, setWarn] = useState(true);
  const [phrase, setPhrase] = useState("");
  const [err, setErr] = useState("");
  const words = phraseWords(phrase);

  async function reveal() {
    setErr("");
    if (!vaultUnlocked()) {
      const ok = await requestUnlock();
      if (!ok) {
        setErr("Unlock this wallet first.");
        return;
      }
    }
    const m = unlockedMnemonic();
    if (!m) {
      setErr("Unlock this wallet first.");
      return;
    }
    setPhrase(m);
    setWarn(true);
    setOpen(true);
  }

  function hide() {
    setOpen(false);
    setPhrase("");
    setWarn(true);
    setErr("");
  }

  if (!open) {
    return (
      <section className="panel-bubble overflow-hidden rounded-3xl p-5">
        <h2 className="text-[22px] font-semibold tracking-tight text-white">Secret recovery phrase</h2>
        <p className="mt-2 text-sm text-mute">
          These words are the only way to restore this account. Solphia never has a copy. Anyone with them can take the
          funds.
        </p>
        {err ? <p className="mt-2 font-mono text-[13px] text-blood">{err}</p> : null}
        <button type="button" className="btn-ghost mt-4 min-h-[44px] rounded-full px-5 text-sm" onClick={() => void reveal()}>
          Show recovery phrase
        </button>
      </section>
    );
  }

  if (warn) {
    return (
      <section className="panel-bubble overflow-hidden rounded-3xl border border-blood/40 p-5">
        <h2 className="text-[22px] font-semibold tracking-tight text-white">Do not share this phrase</h2>
        <p className="mt-2 text-sm text-mute">
          Your secret recovery phrase is the master key to this wallet. Never share it with anyone, including Solphia.
          Solphia will never ask for it. Anyone who has these words can take your funds. Do not screenshot this to iCloud
          or Google Photos.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" className="btn-acid min-h-[44px] rounded-full px-5 text-sm" onClick={() => setWarn(false)}>
            I understand, show the phrase
          </button>
          <button type="button" className="btn-ghost min-h-[44px] rounded-full px-5 text-sm" onClick={hide}>
            Cancel
          </button>
        </div>
      </section>
    );
  }

  const wallet = activeWallet();

  return (
    <section className="panel-bubble overflow-hidden rounded-3xl p-5">
      <h2 className="text-[22px] font-semibold tracking-tight text-white">Secret recovery phrase</h2>
      <p className="mt-2 text-[13px] text-blood">
        Never share this phrase. Never type it into a website. Solphia cannot recover it if you lose it.
      </p>
      <ol className="mt-3 grid grid-cols-2 gap-2 rounded-2xl border border-acid/25 bg-acid/[0.04] p-3">
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
          onClick={() => {
            const blob = new Blob([phraseFile(phrase, wallet?.pubkey || "")], { type: "text/plain" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "solphia-recovery-phrase.txt";
            a.click();
            URL.revokeObjectURL(url);
          }}
        >
          Download .txt
        </button>
        <button type="button" className="rounded-full bg-white/10 px-4 py-2 text-[13px] text-white" onClick={hide}>
          Hide
        </button>
      </div>
    </section>
  );
}
