"use client";

import { useMemo, useState } from "react";
import { Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { EMPTY_DRAFT, coachLines, scoreDraft, type LaunchDraft } from "@/lib/dev/preview";
import { toRawAmount } from "@/lib/dev/airdrop";
import { createSplMintIxs } from "@/lib/dev/spl";
import { connectedPubkey, signAndSend, solscan, unpackIx } from "@/lib/dev/wallet";
import { Field, Toggle, Status, inputClass } from "./fields";

export function LaunchPad() {
  const [d, setD] = useState<LaunchDraft>(EMPTY_DRAFT);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [ok, setOk] = useState(false);
  const [mintOut, setMintOut] = useState("");
  const report = useMemo(() => scoreDraft(d), [d]);
  const lines = useMemo(() => coachLines(report, d), [report, d]);

  function set<K extends keyof LaunchDraft>(k: K, v: LaunchDraft[K]) {
    setD((p) => ({ ...p, [k]: v }));
  }

  async function launch() {
    setBusy(true);
    setOk(false);
    setMsg("");
    try {
      const payer = await connectedPubkey();
      const mint = Keypair.generate();
      let uri = d.website || "https://solphia.io";
      if (file) {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("name", d.name);
        fd.append("symbol", d.symbol);
        fd.append("description", d.description);
        fd.append("twitter", d.twitter);
        fd.append("telegram", d.telegram);
        fd.append("website", d.website);
        const up = await fetch("/api/dev/ipfs", { method: "POST", body: fd });
        const uj = await up.json();
        if (!up.ok) throw new Error(uj.error || "Metadata upload failed");
        uri = uj.uri;
      }
      if (d.venue === "pumpfun") {
        const r = await fetch("/api/dev/pump-tx", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            mint: mint.publicKey.toBase58(),
            creator: payer,
            name: d.name,
            symbol: d.symbol,
            uri,
            buyLamports: Math.round(d.seedBuySol * LAMPORTS_PER_SOL),
          }),
        });
        const j = await r.json();
        if (!r.ok) throw new Error(j.error || "Could not build pump tx");
        const sig = await signAndSend({ ixs: (j.ixs || []).map(unpackIx), extraSigners: [mint] });
        setMintOut(mint.publicKey.toBase58());
        setOk(true);
        setMsg(`Launched on Pump.fun · ${sig}`);
        window.open(solscan(sig), "_blank");
        return;
      }
      const supply = toRawAmount(1_000_000_000, d.decimals);
      const ixs = createSplMintIxs({
        payer: new PublicKey(payer),
        mint,
        decimals: d.decimals,
        supplyRaw: supply,
        revokeMint: d.revokeMint,
        revokeFreeze: d.revokeFreeze,
      });
      const sig = await signAndSend({ ixs, extraSigners: [mint] });
      setMintOut(mint.publicKey.toBase58());
      setOk(true);
      setMsg(`SPL mint live · ${sig}`);
      window.open(solscan(sig), "_blank");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "launch failed");
    } finally {
      setBusy(false);
    }
  }

  const tone = report.verdict === "trade" ? "text-acid" : report.verdict === "wait" ? "text-cyan" : "text-blood";

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <aside className="panel order-1 h-fit rounded-2xl p-5 lg:order-2 lg:sticky lg:top-4">
        <div className="font-mono text-[10px] tracking-[0.28em] text-violet">SOLPHIA · LIVE SCORE</div>
        <div className={`mt-2 font-display text-5xl ${tone}`}>{report.score}</div>
        <div className={`font-mono text-xs tracking-[0.2em] ${tone}`}>
          {report.verdict.toUpperCase()} · {report.grade}
        </div>
        <p className="mt-3 font-serif text-sm leading-relaxed text-ghost">{report.summary}</p>
        <ul className="mt-4 space-y-2">
          {lines.map((l) => (
            <li key={l} className="font-serif text-sm leading-relaxed text-mute">
              {l}
            </li>
          ))}
        </ul>
      </aside>
      <div className="panel order-2 space-y-4 rounded-2xl p-4 sm:p-6 lg:order-1">
        <div className="flex gap-2">
          {(["pumpfun", "spl"] as const).map((v) => (
            <button
              key={v}
              onClick={() => set("venue", v)}
              className={`min-h-[44px] flex-1 rounded-full font-mono text-[11px] ${
                d.venue === v ? "bg-violet text-white" : "btn-ghost"
              }`}
            >
              {v === "pumpfun" ? "Pump.fun curve" : "Classic SPL"}
            </button>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Name">
            <input className={inputClass} value={d.name} maxLength={32} onChange={(e) => set("name", e.target.value)} />
          </Field>
          <Field label="Symbol">
            <input
              className={inputClass}
              value={d.symbol}
              maxLength={10}
              onChange={(e) => set("symbol", e.target.value.toUpperCase())}
            />
          </Field>
        </div>
        <Field label="Description">
          <textarea
            className={`${inputClass} min-h-[88px] py-3`}
            value={d.description}
            onChange={(e) => set("description", e.target.value)}
          />
        </Field>
        <Field label="Image">
          <input
            type="file"
            accept="image/*"
            className="w-full font-mono text-xs text-mute"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
        </Field>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="X / Twitter">
            <input className={inputClass} value={d.twitter} onChange={(e) => set("twitter", e.target.value)} />
          </Field>
          <Field label="Telegram">
            <input className={inputClass} value={d.telegram} onChange={(e) => set("telegram", e.target.value)} />
          </Field>
          <Field label="Website">
            <input className={inputClass} value={d.website} onChange={(e) => set("website", e.target.value)} />
          </Field>
        </div>
        {d.venue === "pumpfun" ? (
          <Field label="Seed buy (SOL)">
            <input
              type="number"
              min="0"
              step="0.05"
              className={inputClass}
              value={d.seedBuySol}
              onChange={(e) => set("seedBuySol", Number(e.target.value) || 0)}
            />
          </Field>
        ) : (
          <div className="grid gap-2">
            <Toggle label="Revoke mint authority" on={d.revokeMint} onChange={(v) => set("revokeMint", v)} />
            <Toggle label="Revoke freeze authority" on={d.revokeFreeze} onChange={(v) => set("revokeFreeze", v)} />
            <Toggle label="I will lock or burn LP" on={d.lockLp} onChange={(v) => set("lockLp", v)} />
          </div>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Team % (planned)">
            <input
              type="number"
              className={inputClass}
              value={d.teamPct}
              onChange={(e) => set("teamPct", Number(e.target.value) || 0)}
            />
          </Field>
          <Field label="Airdrop % / wallets">
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                className={inputClass}
                value={d.airdropPct}
                onChange={(e) => set("airdropPct", Number(e.target.value) || 0)}
              />
              <input
                type="number"
                className={inputClass}
                value={d.airdropWallets}
                onChange={(e) => set("airdropWallets", Number(e.target.value) || 0)}
              />
            </div>
          </Field>
        </div>
        <button disabled={busy || d.name.length < 2 || d.symbol.length < 2} onClick={launch} className="btn-acid min-h-[52px] w-full rounded-full font-mono text-sm disabled:opacity-40">
          {busy ? "SIGN IN WALLET…" : d.venue === "pumpfun" ? "LAUNCH ON PUMP.FUN" : "CREATE SPL TOKEN"}
        </button>
        {mintOut && <p className="break-all font-mono text-[11px] text-cyan">Mint {mintOut}</p>}
        <Status msg={msg} ok={ok} />
      </div>
    </div>
  );
}
