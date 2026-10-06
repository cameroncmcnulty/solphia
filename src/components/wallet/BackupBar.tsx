"use client";

import { useState } from "react";
import { CopyButton } from "@/components/CopyButton";
import { activeWallet, markBackupConfirmed, requestUnlock, unlockedMnemonic } from "@/lib/wallet/vault";
import { phraseFile, phraseWords, pickConfirmSlots } from "@/lib/wallet/phrase";

export function BackupBar({ onOpen }: { onOpen: () => void }) {
  const [open, setOpen] = useState(false);
  const [phrase, setPhrase] = useState("");
  const [slots, setSlots] = useState<number[]>([]);
  const [typed, setTyped] = useState<Record<number, string>>({});
  const [err, setErr] = useState("");
  const words = phraseWords(phrase);

  async function reveal() {
    setErr("");
    const w = activeWallet();
    if (!w) return;
    let m = unlockedMnemonic(w.id);
    if (!m) {
      const ok = await requestUnlock(w.id);
      if (!ok) {
        onOpen();
        return;
      }
      m = unlockedMnemonic(w.id);
    }
    if (!m) {
      setErr("Unlock to view the phrase.");
      return;
    }
    setPhrase(m);
    setSlots(pickConfirmSlots(m.split(" ").length, 3));
    setTyped({});
    setOpen(true);
  }

  function confirmSaved() {
    const w = activeWallet();
    if (!w) return;
    for (const i of slots) {
      if ((typed[i] || "").trim().toLowerCase() !== words[i]) {
        setErr("Those words do not match.");
        return;
      }
    }
    markBackupConfirmed(w.id);
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => void reveal()}
        className="fixed inset-x-0 top-[calc(3.6rem+env(safe-area-inset-top))] z-[70] border-b border-amber-400/30 bg-[#1a1404] px-4 py-2 text-left text-[13px] text-amber-200 md:top-[4.4rem]"
      >
        Back up your phrase. Losing it means losing the funds.
      </button>
      {open ? (
        <div className="fixed inset-0 z-[97] flex items-end justify-center bg-black/75 p-3 sm:items-center" onClick={() => setOpen(false)}>
          <div className="w-full max-w-md rounded-[28px] border border-white/10 bg-[#0b0714] p-5" onClick={(e) => e.stopPropagation()}>
            <p className="text-[18px] font-semibold text-white">Recovery phrase</p>
            <p className="mt-1 text-[13px] text-white/45">Viewing again requires unlock. Confirm three words to dismiss the banner.</p>
            {err ? <p className="mt-2 font-mono text-[13px] text-blood">{err}</p> : null}
            <ol className="mt-3 grid grid-cols-2 gap-2 rounded-2xl border border-white/10 p-3">
              {words.map((w, i) => (
                <li key={`${w}-${i}`} className="flex gap-2 font-mono text-[14px] text-white">
                  <span className="text-white/35">{i + 1}.</span>
                  {w}
                </li>
              ))}
            </ol>
            <div className="mt-3 flex gap-2">
              <CopyButton text={phrase} label="Copy" copiedLabel="Copied" className="rounded-full bg-white/10 px-3 py-1.5 text-[13px] text-white" />
              <button
                type="button"
                className="rounded-full bg-white/10 px-3 py-1.5 text-[13px] text-white"
                onClick={() => {
                  const w = activeWallet();
                  const blob = new Blob([phraseFile(phrase, w?.pubkey || "")], { type: "text/plain" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = "solphia-recovery-phrase.txt";
                  a.click();
                  URL.revokeObjectURL(url);
                }}
              >
                Download
              </button>
            </div>
            <div className="mt-3 space-y-2">
              {slots.map((i) => (
                <input
                  key={i}
                  value={typed[i] || ""}
                  placeholder={`Word ${i + 1}`}
                  onChange={(e) => setTyped((s) => ({ ...s, [i]: e.target.value.trim().toLowerCase() }))}
                  className="min-h-[40px] w-full rounded-2xl border border-white/10 bg-white/[0.06] px-3 font-mono text-[13px] text-white"
                />
              ))}
            </div>
            <button type="button" className="btn-acid mt-3 min-h-[44px] w-full rounded-full" onClick={confirmSaved}>
              I saved this phrase
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
