"use client";

import { useEffect, useState } from "react";
import { Keypair } from "@solana/web3.js";
import { SPHA_DEFAULT_IMAGE, SPHA_NAME, SPHA_SUPPLY, SPHA_SYMBOL, type SphaNetwork } from "@/lib/token/omics";
import { useAdmin } from "./AdminProvider";
import { Tokenomics } from "@/components/Tokenomics";
import { shortPk } from "./ui";
import { b64ToBytes } from "@/lib/solana/wire";
import { canSignProject, projectWallet, signAndSendProjectTx } from "@/lib/wallet/projectVault";

const FIRST_BUY_SOL = 0.05;

type Prep = {
  network: SphaNetwork;
  rpc: string;
  dest: { owner: string; foundation: string; airdrop: string; treasury: string; lp: string };
  missing: string[];
  allocations: { id: string; label: string; pct: string; tokens: number; wallet: string }[];
  launch: { mint: string; network: string; launchedAt: number; name: string; symbol: string } | null;
  testLaunch?: { mint: string; network: string; launchedAt: number; name: string; symbol: string } | null;
  reserved?: number;
  curve?: number;
  dbc?: boolean;
};

export function SphaLaunch() {
  const { data, patch, busy } = useAdmin();
  const [prep, setPrep] = useState<Prep | null>(null);
  const [mode, setMode] = useState<"test" | "official">("test");
  const [name, setName] = useState("Solphia Test");
  const [symbol, setSymbol] = useState("SPT");
  const [blurb, setBlurb] = useState("");
  const [website, setWebsite] = useState("https://solphia.io");
  const [art, setArt] = useState<{ image: string; uri: string } | null>(null);
  const [run, setRun] = useState(false);
  const [splitRun, setSplitRun] = useState(false);
  const [log, setLog] = useState("");
  const [err, setErr] = useState("");

  async function loadPrep() {
    const r = await fetch("/api/admin/spha", { cache: "no-store" });
    const j = await r.json();
    if (r.ok) setPrep(j);
  }

  useEffect(() => {
    loadPrep().catch(() => {});
  }, [data?.ownerWallet, data?.foundationWallet, data?.treasury, data?.sphaNetwork, data?.sphaMint]);

  useEffect(() => {
    if (mode === "official") {
      setName(SPHA_NAME);
      setSymbol(SPHA_SYMBOL);
    } else {
      setName("Solphia Test");
      setSymbol("SPT");
    }
  }, [mode]);

  async function launch() {
    setErr("");
    setLog("");
    const ownerW = projectWallet("owner");
    const payer = ownerW?.pubkey || data?.ownerWallet || "";
    if (!payer) {
      setErr("Create the owner project wallet first. It signs the launch.");
      return;
    }
    if (prep?.missing?.length) {
      setErr(`Set project wallets first: ${prep.missing.join(", ")}`);
      return;
    }
    const net = data?.sphaNetwork === "mainnet-beta" ? "mainnet-beta" : "devnet";
    if (mode === "official" && net === "mainnet-beta" && !confirm("MAINNET $SPHA. 200,000,000 supply. 77.1% on the curve. Continue?")) {
      return;
    }
    if (!(await canSignProject("owner"))) {
      setErr("Owner project wallet cannot sign yet.");
      return;
    }
    setRun(true);
    try {
      const mint = Keypair.generate();
      setLog(`Mint ${mint.publicKey.toBase58().slice(0, 8)}… building 200M ${mode} launch`);
      const prepR = await fetch("/api/admin/spha", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "prepare",
          mode,
          payer,
          mint: mint.publicKey.toBase58(),
          name,
          symbol,
          uri: art?.uri,
          image: art?.image || SPHA_DEFAULT_IMAGE,
          blurb,
          website,
        }),
      });
      const pj = await prepR.json();
      if (!prepR.ok) throw new Error(pj.message || pj.error || "prepare failed");
      const extras: Keypair[] = [mint];
      if (typeof pj.configSecret === "string") extras.push(Keypair.fromSecretKey(b64ToBytes(pj.configSecret)));
      setLog("Sign with the owner project wallet…");
      const sig = await signAndSendProjectTx("owner", pj.tx, extras);
      setLog("On-chain. Recording…");
      const ca = mint.publicKey.toBase58();
      const metaUri = typeof pj.uri === "string" ? pj.uri : art?.uri;
      const metaImage = typeof pj.image === "string" ? pj.image : art?.image || SPHA_DEFAULT_IMAGE;
      await fetch("/api/admin/spha", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "record",
          mode,
          mint: ca,
          network: net,
          name,
          symbol,
          supply: SPHA_SUPPLY,
          sigs: [sig],
          allocations: (prep?.allocations || []).map((a) => ({ id: a.id, wallet: a.wallet, tokens: a.tokens })),
          image: metaImage,
          blurb,
          uri: metaUri,
          website,
          config: pj.config,
          payer,
        }),
      });
      const notes: string[] = [];
      let fail = "";
      setLog("Minting team allocations to owner, foundation, and treasury…");
      try {
        notes.push(...(await mintTeamSlices(ca, payer)));
      } catch (splitErr) {
        fail = splitErr instanceof Error ? splitErr.message : "team mint failed";
        notes.push("team mint pending");
      }
      try {
        const metaNote = await writePoolMeta(ca, payer, metaImage);
        if (metaNote) notes.push(metaNote);
      } catch {
        notes.push("pool metadata pending");
      }
      try {
        const buyNote = await firstBuy(ca, payer);
        if (buyNote) notes.push(buyNote);
      } catch (buyErr) {
        notes.push("first buy pending");
        if (!fail) fail = buyErr instanceof Error ? buyErr.message : "first buy failed";
      }
      if (fail) setErr(fail);
      setLog(
        mode === "official"
          ? `Official $SPHA live. CA ${ca}. ${notes.join(" · ")}`
          : `Test token live. CA ${ca} — official $SPHA is unchanged. ${notes.join(" · ")}`,
      );
      loadPrep().catch(() => {});
    } catch (e) {
      setErr(e instanceof Error ? e.message : "launch failed");
    } finally {
      setRun(false);
    }
  }

  async function mintTeamSlices(mint: string, payer: string): Promise<string[]> {
    if (!(await canSignProject("owner"))) throw new Error("Owner project wallet cannot sign yet.");
    let lastErr = "mint not on-chain yet";
    for (let i = 0; i < 6; i++) {
      if (i) await new Promise((r) => setTimeout(r, 1500));
      try {
        const r = await fetch("/api/admin/spha", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ action: "prepareTeam", payer, mint }),
        });
        const j = (await r.json().catch(() => ({}))) as {
          tx?: string;
          error?: string;
          message?: string;
          legs?: { id: string; tokens: number }[];
        };
        if (!r.ok || !j.tx) {
          lastErr = j.message || j.error || "team mint build failed";
          continue;
        }
        const sig = await signAndSendProjectTx("owner", j.tx);
        const notes = (j.legs || []).map((leg) => `${leg.id} ${leg.tokens.toLocaleString("en-US")}`);
        notes.push(`mint ${sig.slice(0, 8)}…`);
        return notes;
      } catch (e) {
        lastErr = e instanceof Error ? e.message : "team mint failed";
      }
    }
    throw new Error(lastErr);
  }

  async function writePoolMeta(mint: string, payer: string, logo: string): Promise<string> {
    let lastErr = "pool not on-chain yet";
    for (let i = 0; i < 6; i++) {
      if (i) await new Promise((r) => setTimeout(r, 1500));
      try {
        const r = await fetch("/api/admin/spha", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            action: "preparePoolMeta",
            payer,
            mint,
            name,
            website,
            logo,
          }),
        });
        const j = (await r.json().catch(() => ({}))) as { tx?: string; message?: string; error?: string };
        if (!r.ok || !j.tx) {
          lastErr = j.message || j.error || "pool metadata build failed";
          continue;
        }
        const sig = await signAndSendProjectTx("owner", j.tx);
        return `pool meta ${sig.slice(0, 8)}…`;
      } catch (e) {
        lastErr = e instanceof Error ? e.message : "pool metadata failed";
      }
    }
    throw new Error(lastErr);
  }

  async function firstBuy(mint: string, payer: string): Promise<string> {
    let lastErr = "pool not on-chain yet";
    for (let i = 0; i < 6; i++) {
      if (i) await new Promise((r) => setTimeout(r, 1500));
      try {
        const r = await fetch("/api/admin/spha", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ action: "prepareBuy", payer, mint, sol: FIRST_BUY_SOL }),
        });
        const j = (await r.json().catch(() => ({}))) as {
          tx?: string;
          tokensOut?: number;
          message?: string;
          error?: string;
        };
        if (!r.ok || !j.tx) {
          lastErr = j.message || j.error || "first buy build failed";
          continue;
        }
        const sig = await signAndSendProjectTx("owner", j.tx);
        const out = j.tokensOut ? ` ${Math.round(j.tokensOut).toLocaleString("en-US")} tokens` : "";
        return `first buy ${FIRST_BUY_SOL} SOL${out} ${sig.slice(0, 8)}…`;
      } catch (e) {
        lastErr = e instanceof Error ? e.message : "first buy failed";
      }
    }
    throw new Error(lastErr);
  }

  async function splitNow() {
    setErr("");
    const ca = prep?.launch?.mint || prep?.testLaunch?.mint || "";
    const payer = projectWallet("owner")?.pubkey || data?.ownerWallet || "";
    if (!ca || !payer) {
      setErr("Launch a 200M token first.");
      return;
    }
    setSplitRun(true);
    try {
      setLog("Minting team allocations to owner, foundation, and treasury…");
      const notes = await mintTeamSlices(ca, payer);
      setLog(notes.join(" · "));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "team mint failed");
    } finally {
      setSplitRun(false);
    }
  }

  const network = data?.sphaNetwork === "mainnet-beta" ? "mainnet-beta" : "devnet";
  const ownerPk = projectWallet("owner")?.pubkey || data?.ownerWallet || "";

  return (
    <div className="space-y-5">
      <Tokenomics />

      <div className="rounded-3xl border border-violet/20 bg-void/40 p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="font-mono text-[10px] tracking-[0.22em] text-acid">SOLPHIA TOKEN LAUNCHER</div>
            <p className="mt-1 max-w-xl text-sm text-mute">
              Official $SPHA is 200,000,000. 8.6 / 9.7 / 4.6 mint into the owner, foundation, and treasury project
              wallets at launch. 77.1% on the same bonding curve as every other pad token so the 1% lasts after
              graduate. Test uses that same 200M Token-2022 path, with metadata and a first buy, and does not set the
              official CA. Sign with the owner project wallet.
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

        <div className="mt-4 flex rounded-full border border-violet/30 p-0.5">
          {(["test", "official"] as const).map((m) => (
            <button
              key={m}
              type="button"
              disabled={run}
              onClick={() => setMode(m)}
              className={`flex-1 rounded-full px-3 py-1.5 font-mono text-[11px] ${mode === m ? "bg-acid/20 text-acid" : "text-mute"}`}
            >
              {m === "test" ? "TEST TOKEN" : "OFFICIAL $SPHA"}
            </button>
          ))}
        </div>

        {prep?.launch && (
          <p className="mt-3 font-mono text-[12px] text-acid">
            Official CA {shortPk(prep.launch.mint, 6)} on {prep.launch.network}
          </p>
        )}
        {prep?.testLaunch && (
          <p className="mt-1 font-mono text-[12px] text-mute">
            Last test {shortPk(prep.testLaunch.mint, 6)} on {prep.testLaunch.network}
          </p>
        )}

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, 32))}
            placeholder="Name"
            className="w-full rounded-full border border-violet/30 bg-void px-4 py-2 text-sm text-ghost outline-none"
          />
          <input
            value={symbol}
            onChange={(e) => setSymbol(e.target.value.slice(0, 10).toUpperCase())}
            placeholder="Symbol"
            className="w-full rounded-full border border-violet/30 bg-void px-4 py-2 text-sm text-ghost outline-none"
          />
        </div>
        <textarea
          value={blurb}
          onChange={(e) => setBlurb(e.target.value.slice(0, 280))}
          placeholder="One-line blurb — same field as a pad launch"
          className="mt-3 w-full rounded-2xl border border-violet/30 bg-void px-4 py-2 text-sm text-ghost outline-none"
          rows={2}
        />
        <input
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          placeholder="https://solphia.io"
          className="mt-3 w-full rounded-full border border-violet/30 bg-void px-4 py-2 text-sm text-ghost outline-none"
        />
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
                  <td className="py-2 font-mono text-[11px] text-mute">
                    {a.wallet === "curve" ? "bonding curve" : a.wallet ? shortPk(a.wallet, 6) : "missing"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-3 text-sm text-mute">
          Payer is the owner project wallet {ownerPk ? shortPk(ownerPk, 4) : "(create it above)"}. Fund it with a little
          SOL for rent plus {FIRST_BUY_SOL} SOL for the opening buy. 22.9% mints straight into owner / foundation /
          treasury at T0 — 17.2M / 19.4M / 9.2M. 77.1% (154.2M) is the curve and is tradeable from the first buy. Test
          launches do not set the official CA.
        </p>

        <button
          type="button"
          disabled={run || splitRun || Boolean(prep?.missing?.length)}
          onClick={() => void launch()}
          className="btn-acid mt-4 rounded-full px-6 py-2 text-sm disabled:opacity-40"
        >
          {run ? "Launching…" : mode === "test" ? `Launch test on ${network}` : `Launch official $SPHA on ${network}`}
        </button>
        {prep?.launch?.mint || prep?.testLaunch?.mint ? (
          <button
            type="button"
            disabled={run || splitRun}
            onClick={() => void splitNow()}
            className="btn-ghost mt-2 rounded-full px-6 py-2 text-sm disabled:opacity-40"
          >
            {splitRun ? "Minting team…" : "Mint team allocations"}
          </button>
        ) : null}
        {log && <p className="mt-2 font-mono text-[12px] text-acid">{log}</p>}
        {err && <p className="mt-2 text-sm text-blood">{err}</p>}
        {prep?.missing?.length ? (
          <p className="mt-2 text-sm text-mute">Need: {prep.missing.join(", ")}</p>
        ) : null}
      </div>
    </div>
  );
}
