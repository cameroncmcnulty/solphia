"use client";

import { useState } from "react";
import { PublicKey } from "@solana/web3.js";
import { revokeIxs } from "@/lib/dev/spl";
import { connectedPubkey, signAndSend, solscan } from "@/lib/dev/wallet";
import { Field, Toggle, Status, inputClass } from "./fields";

export function AuthorityDesk() {
  const [mint, setMint] = useState("");
  const [mintAuth, setMintAuth] = useState(true);
  const [freezeAuth, setFreezeAuth] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [ok, setOk] = useState(false);

  async function run() {
    setBusy(true);
    setOk(false);
    setMsg("");
    try {
      const owner = await connectedPubkey();
      if (!mintAuth && !freezeAuth) throw new Error("Turn on mint or freeze.");
      const sig = await signAndSend({
        ixs: revokeIxs({
          owner: new PublicKey(owner),
          mint: new PublicKey(mint),
          mintAuth,
          freezeAuth,
        }),
      });
      setOk(true);
      setMsg("Authorities revoked. She can score this as a safer coin now.");
      window.open(solscan(sig), "_blank");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "revoke failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="panel space-y-4 rounded-2xl p-4 sm:p-6">
      <p className="font-serif text-sm text-mute">
        If you launched a classic SPL token and left mint or freeze on, I skip you. Revoke them here. This cannot be
        undone.
      </p>
      <Field label="Token mint">
        <input className={inputClass} value={mint} onChange={(e) => setMint(e.target.value.trim())} />
      </Field>
      <Toggle label="Revoke mint (cannot print more)" on={mintAuth} onChange={setMintAuth} />
      <Toggle label="Revoke freeze (cannot trap holders)" on={freezeAuth} onChange={setFreezeAuth} />
      <button disabled={busy || !mint} onClick={run} className="btn-acid min-h-[48px] w-full rounded-full font-mono text-[11px] disabled:opacity-40">
        REVOKE
      </button>
      <Status msg={msg} ok={ok} />
    </div>
  );
}
