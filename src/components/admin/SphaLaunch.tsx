"use client";

import { useEffect, useState } from "react";
import { Keypair } from "@solana/web3.js";
import { Connection } from "@solana/web3.js";
import { SPHA_NAME, SPHA_SUPPLY, SPHA_SYMBOL, type SphaNetwork } from "@/lib/token/omics";
import { buildSphaLaunchTxs, encodeTx } from "@/lib/token/mint";
import { signAndSendPhantom } from "@/lib/wallet/trading";
import { useAdmin } from "./AdminProvider";
import { Tokenomics } from "@/components/Tokenomics";
import { Field, shortPk } from "./ui";
import { FieldError, useConfirmErrors } from "@/components/form/confirm";
import { walletOk } from "@/lib/launch/validate";

type Prep = {
  network: SphaNetwork;
  rpc: string;
  dest: { owner: string; foundation: string; airdrop: string; treasury: string; lp: string };
  missing: string[];
  allocations: { id: string; label: string; pct: string; tokens: number; wallet: string }[];
  launch: { mint: string; network: string; launchedAt: number; name: string; symbol: string } | null;
};

export function SphaLaunch() {
  const { data, owner, patch, busy } = useAdmin();
  const [prep, setPrep] = useState<Prep | null>(null);
  const [name, setName] = useState(SPHA_NAME);
  const [symbol, setSymbol] = useState(SPHA_SYMBOL);
  const [blurb, setBlurb] = useState("");
  const [website, setWebsite] = useState("https://solphia.io");
  const [art, setArt] = useState<{ image: string; uri: string } | null>(null);
  const [run, setRun] = useState(false);
  const [log, setLog] = useState("");
  const [err, setErr] = useState("");
  const fErr = useConfirmErrors<"foundation" | "airdrop" | "lp">();
  const [foundation, setFoundation] = useState("");
  const [airdrop, setAirdrop] = useState("");
  const [lp, setLp] = useState("");

  useEffect(() => {
    if (!data) return;
    setFoundation(data.foundationWallet || "");
    setAirdrop(data.airdropWallet || "");
    setLp(data.lpWallet || "");
  }, [data?.foundationWallet, data?.airdropWallet, data?.lpWallet]);

  async function loadPrep() {
    const r = await fetch("/api/admin/spha", { cache: "no-store" });
    const j = await r.json();
    if (r.ok) setPrep(j);
  }

  useEffect(() => {
    loadPrep().catch(() => {});
  }, [data?.devWallet, data?.foundationWallet, data?.airdropWallet, data?.treasury, data?.lpWallet, data?.sphaNetwork]);

  async function saveDest() {
    const issues: Partial<Record<"foundation" | "airdrop" | "lp", string>> = {};
    if (foundation && !walletOk(foundation)) issues.foundation = "Invalid address.";
    if (airdrop && !walletOk(airdrop)) issues.airdrop = "Invalid address.";
    if (lp && !walletOk(lp)) issues.lp = "Invalid address.";
    if (Object.keys(issues).length) {
      fErr.fail(issues);
      return;
    }
    fErr.ok();
    await patch({
      foundationWallet: foundation || null,
      airdropWallet: airdrop || null,
      lpWallet: lp || null,
    });
    loadPrep().catch(() => {});
  }

  async function launch() {
    setErr("");
    setLog("");
    if (!owner) {
      setErr("Connect the payer Phantom. It pays rent, then mint and freeze are revoked.");
      return;
    }
    if (prep?.missing?.length) {
      setErr(`Set wallets first: ${prep.missing.join(", ")}`);
      return;
    }
    const net = data?.sphaNetwork === "mainnet-beta" ? "mainnet-beta" : "devnet";
    if (net === "mainnet-beta" && !confirm("MAINNET. This creates a live mint and sends the full allocation. Continue?")) {
      return;
    }
    setRun(true);
    try {
      const fresh = await fetch("/api/admin/spha", { cache: "no-store" }).then((r) => r.json());
      if (!fresh.ok) throw new Error("prepare failed");
      if (fresh.missing?.length) throw new Error(`Set wallets: ${fresh.missing.join(", ")}`);
      const conn = new Connection(fresh.rpc, "confirmed");
      if (net === "devnet") {
        setLog("Requesting devnet airdrop for rent…");
        try {
          const { PublicKey, LAMPORTS_PER_SOL } = await import("@solana/web3.js");
          const sig = await conn.requestAirdrop(new PublicKey(owner), 2 * LAMPORTS_PER_SOL);
          await conn.confirmTransaction(sig, "confirmed");
        } catch {
          /* already funded */
        }
      }
      const mint = Keypair.generate();
      setLog(`Mint ${mint.publicKey.toBase58().slice(0, 8)}… building launch txs`);
      const set = await buildSphaLaunchTxs({
        conn,
        payer: owner,
        mint,
        dest: fresh.dest,
        name,
        symbol,
        uri: art?.uri,
      });
      const sigs: string[] = [];
      for (let i = 0; i < set.txs.length; i++) {
        const tx = set.txs[i];
        if (i === 0) tx.partialSign(mint);
        setLog(`Sign tx ${i + 1} of ${set.txs.length} in Phantom…`);
        const encoded = encodeTx(tx);
        const sig = await signAndSendPhantom(encoded);
        sigs.push(sig);
      }
      await fetch("/api/admin/spha", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          mint: set.mint,
          network: net,
          name,
          symbol,
          supply: SPHA_SUPPLY,
          sigs,
          allocations: set.allocations.map((a) => ({ id: a.id, wallet: a.wallet, tokens: a.tokens })),
          image: art?.image,
          blurb,
          uri: art?.uri,
          website,
        }),
      });
      setLog(`Live. CA ${set.mint}`);
      loadPrep().catch(() => {});
    } catch (e) {
      setErr(e instanceof Error ? e.message : "launch failed");
    } finally {
      setRun(false);
    }
  }

  const network = data?.sphaNetwork === "mainnet-beta" ? "mainnet-beta" : "devnet";

  return (
    <div className="space-y-5">
      <Tokenomics />

      <div className="rounded-3xl border border-violet/20 bg-void/40 p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="font-mono text-[10px] tracking-[0.22em] text-acid">SOLPHIA TOKEN LAUNCHER</div>
            <p className="mt-1 max-w-xl text-sm text-mute">
              Same data as the public pad: art, name, ticker, blurb, socials. Creates the mint with Metaplex metadata,
              sends 8.6 / 9.7 / 4.6 / 77.1 into the launch wallets, then revokes mint and freeze. Community-market
              tokens are the tradeable float. Switch to mainnet only after a burner test.
            </p>
          </div>
          <div className="flex rounded-full border border-violet/30 p-0.5">
            {(["devnet", "mainnet-beta"] as const).map((n) => (
              <button
                key={n}
                type="button"
                disabled={busy || run}
                onClick={() => patch({ sphaNetwork: n })}
                className={`rounded-full px-3 py-1 font-mono text-[11px] ${network === n ? "bg-acid/20 text-acid" : "text-mute"}`}
              >
                {n === "devnet" ? "DEVNET" : "MAINNET"}
              </button>
            ))}
          </div>
        </div>

        {prep?.launch && (
          <p className="mt-3 font-mono text-[12px] text-acid">
            Last mint {shortPk(prep.launch.mint, 6)} on {prep.launch.network}
          </p>
        )}

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Field value={name} onChange={setName} placeholder="Name (Solphia or a test ticker)" />
          <Field value={symbol} onChange={setSymbol} placeholder="Symbol (SPHA or TEST)" />
        </div>
        <textarea
          value={blurb}
          onChange={(e) => setBlurb(e.target.value.slice(0, 280))}
          placeholder="One-line blurb — same field as a pad launch"
          className="mt-3 w-full rounded-2xl border border-violet/30 bg-void px-4 py-2 text-sm text-ghost outline-none"
          rows={2}
        />
        <Field value={website} onChange={setWebsite} placeholder="https://solphia.io" className="mt-3" />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <label className="btn-ghost cursor-pointer rounded-full px-4 py-2 text-sm">
            {art ? "Replace art" : "Upload token art"}
            <input
              type="file"
              accept="image/*"
              hidden
              onChange={async (e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (!f) return;
                setErr("");
                setLog("Pinning art + metadata…");
                try {
                  const fd = new FormData();
                  fd.append("file", f, "spha.jpg");
                  fd.append("name", name);
                  fd.append("symbol", symbol);
                  fd.append("blurb", blurb);
                  fd.append("website", website);
                  const r = await fetch("/api/admin/spha/art", { method: "POST", body: fd });
                  const j = await r.json();
                  if (!r.ok) throw new Error(j.message || j.error || "art failed");
                  setArt({ image: j.image, uri: j.uri });
                  setLog("Art pinned. Metadata URI ready for the mint.");
                } catch (er) {
                  setErr(er instanceof Error ? er.message : "art failed");
                }
              }}
            />
          </label>
          {art?.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={art.image} alt="" className="h-12 w-12 rounded-xl object-cover" />
          ) : (
            <span className="font-mono text-[11px] text-mute">Square JPEG/PNG. Same as the public pad.</span>
          )}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div>
            <div className="font-mono text-[10px] text-mute">FOUNDATION</div>
            <Field field="foundation" value={foundation} error={fErr.errors.foundation} onChange={(v) => { setFoundation(v.trim()); fErr.clear("foundation"); }} placeholder="Community / ecosystem" />
            <FieldError error={fErr.errors.foundation} />
          </div>
          <div>
            <div className="font-mono text-[10px] text-mute">AIRDROP</div>
            <Field field="airdrop" value={airdrop} error={fErr.errors.airdrop} onChange={(v) => { setAirdrop(v.trim()); fErr.clear("airdrop"); }} placeholder="Defaults to foundation" />
            <FieldError error={fErr.errors.airdrop} />
          </div>
          <div>
            <div className="font-mono text-[10px] text-mute">COMMUNITY MARKET</div>
            <Field field="lp" value={lp} error={fErr.errors.lp} onChange={(v) => { setLp(v.trim()); fErr.clear("lp"); }} placeholder="Tradeable float wallet" />
            <FieldError error={fErr.errors.lp} />
          </div>
        </div>
        <button type="button" disabled={busy} onClick={saveDest} className="btn-ghost mt-3 rounded-full px-5 py-2 text-sm">
          Save launch wallets
        </button>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead className="font-mono text-[10px] tracking-[0.14em] text-mute">
              <tr>
                <th className="pb-2 pr-3">Slice</th>
                <th className="pb-2 pr-3">Tokens</th>
                <th className="pb-2">Wallet</th>
              </tr>
            </thead>
            <tbody>
              {(prep?.allocations || []).map((a) => (
                <tr key={a.id} className="border-t border-violet/15">
                  <td className="py-2 pr-3">
                    {a.label} <span className="font-mono text-[11px] text-acid">{a.pct}</span>
                  </td>
                  <td className="py-2 pr-3 font-mono text-[12px]">{a.tokens.toLocaleString("en-US")}</td>
                  <td className="py-2 font-mono text-[11px] text-mute">{a.wallet ? shortPk(a.wallet, 6) : "missing"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-3 text-sm text-mute">
          Dev 8.6% uses the <span className="text-ghost">dev holdings</span> wallet. Treasury 4.6% uses the treasury
          address. Set those above. For a mainnet dry-run, point every wallet at burners first.
        </p>

        <button
          type="button"
          disabled={run || Boolean(prep?.missing?.length)}
          onClick={launch}
          className="btn-acid mt-4 rounded-full px-6 py-2 text-sm disabled:opacity-40"
        >
          {run ? "Launching…" : network === "devnet" ? "Launch on devnet" : "Launch on mainnet"}
        </button>
        {log && <p className="mt-2 font-mono text-[12px] text-acid">{log}</p>}
        {err && <p className="mt-2 text-sm text-blood">{err}</p>}
        {prep?.missing?.length ? (
          <p className="mt-2 text-sm text-mute">Need: {prep.missing.join(", ")}</p>
        ) : null}
      </div>
    </div>
  );
}
