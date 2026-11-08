"use client";

import { useEffect, useMemo, useState } from "react";
import { Keypair } from "@solana/web3.js";
import { SPHA_DEFAULT_IMAGE, SPHA_NAME, SPHA_SUPPLY, SPHA_SYMBOL, SPHA_TGE_LAUNCH_AT_MS, type SphaNetwork } from "@/lib/token/omics";
import { SPHA_COUNTDOWN_MIN_MS, SPHA_MINT_LEAD_MS, formatSphaLaunchWhen, pad2, splitRemaining, toDatetimeLocalValue } from "@/lib/token/countdown";
import { useAdmin } from "./AdminProvider";
import { Tokenomics } from "@/components/Tokenomics";
import { CopyCa } from "@/components/CopyCa";
import { shortPk } from "./ui";
import { b64ToBytes } from "@/lib/solana/wire";
import { copyText } from "@/lib/copyText";
import { projectWallet, signAndSendProjectTx } from "@/lib/wallet/projectVault";
import { SwapWidget } from "@/components/SwapWidget";

const FIRST_BUY_SOL = 0.05;

type LaunchRow = {
  mint: string;
  network: string;
  launchedAt: number;
  name: string;
  symbol: string;
  config?: string;
  bals?: { owner: number; foundation: number; treasury: number; ownerSol?: number; curveSol?: number };
  fees?: { creatorFeesSol: number; creatorUnclaimedSol: number; partnerFeesSol: number; partnerUnclaimedSol: number };
};

function fmtTok(n: number) {
  if (!(n > 0)) return "0";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(2)}K`;
  return n.toFixed(n >= 100 ? 0 : 2);
}

function fmtFee(n: number) {
  if (!(n > 0)) return "0";
  if (n >= 1) return n.toFixed(4).replace(/0+$/, "").replace(/\.$/, "");
  return n.toFixed(6).replace(/0+$/, "").replace(/\.$/, "");
}

type Prep = {
  network: SphaNetwork;
  rpc: string;
  dest: { owner: string; foundation: string; airdrop: string; treasury: string; lp: string };
  missing: string[];
  allocations: { id: string; label: string; pct: string; tokens: number; wallet: string }[];
  launch: LaunchRow | null;
  testLaunch?: LaunchRow | null;
  testLaunches?: LaunchRow[];
  reserved?: number;
  curve?: number;
  dbc?: boolean;
  countdown?: {
    launchAt: number;
    mintLeadMs: number;
    armedAt: number;
    status: string;
    pendingMint?: string;
    error?: string;
    remainingMs: number;
    mintAt: number;
    inMintWindow: boolean;
    timedOut: boolean;
    publicMint: string;
    rehearsal?: boolean;
  };
  localRehearsal?: boolean;
};

function LaunchCaCard({
  kicker,
  row,
  selected,
  onSelect,
}: {
  kicker: string;
  row: LaunchRow;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <div className={`rounded-2xl border p-4 ${selected ? "border-acid/60 bg-acid/5" : "border-violet/20 bg-void/30"}`}>
      <button type="button" onClick={onSelect} className="w-full text-left">
        <div className="font-mono text-[10px] tracking-[0.22em] text-acid">{kicker}</div>
        <div className="mt-1 text-lg text-ghost">
          ${row.symbol} · {row.name}
        </div>
        <div className="mt-1 font-mono text-[11px] text-mute">{row.network}</div>
      </button>
      <div className="mt-3">
        <CopyCa ca={row.mint} full />
      </div>
      {row.bals || row.fees ? (
        <p className="mt-2 font-mono text-[11px] text-mute">
          Owner {fmtTok(row.bals?.owner || 0)} · unclaimed owner {fmtFee(row.fees?.creatorUnclaimedSol || 0)} / treasury {fmtFee(row.fees?.partnerUnclaimedSol || 0)} SOL
        </p>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-2 font-mono text-[11px]">
        <a
          href={`https://solscan.io/token/${row.mint}`}
          target="_blank"
          rel="noreferrer"
          className="rounded-full border border-violet/30 px-3 py-1 text-mute hover:border-acid hover:text-acid"
        >
          Solscan
        </a>
        <a
          href={`https://dexscreener.com/solana/${row.mint}`}
          target="_blank"
          rel="noreferrer"
          className="rounded-full border border-violet/30 px-3 py-1 text-mute hover:border-acid hover:text-acid"
        >
          Dexscreener
        </a>
        <a href="/launch" className="rounded-full border border-violet/30 px-3 py-1 text-mute hover:border-acid hover:text-acid">
          Pad
        </a>
      </div>
    </div>
  );
}

export function SphaLaunch() {
  const { data, patch, busy, reloadAt } = useAdmin();
  const [prep, setPrep] = useState<Prep | null>(null);
  const [mode, setMode] = useState<"test" | "official">("test");
  const [name, setName] = useState("Solphia Test");
  const [symbol, setSymbol] = useState("TESTTOKEN");
  const [blurb, setBlurb] = useState("");
  const [website, setWebsite] = useState("https://solphia.io");
  const [art, setArt] = useState<{ image: string; uri: string } | null>(null);
  const [run, setRun] = useState(false);
  const [splitRun, setSplitRun] = useState(false);
  const [claimRun, setClaimRun] = useState(false);
  const [tradeMint, setTradeMint] = useState("");
  const [log, setLog] = useState("");
  const [err, setErr] = useState("");
  const [when, setWhen] = useState(() => toDatetimeLocalValue(SPHA_TGE_LAUNCH_AT_MS));
  const [armRun, setArmRun] = useState(false);

  async function loadPrep() {
    const r = await fetch("/api/admin/spha", { cache: "no-store" });
    const j = await r.json();
    if (r.ok) setPrep(j);
  }

  useEffect(() => {
    loadPrep().catch(() => {});
  }, [data?.ownerWallet, data?.foundationWallet, data?.treasury, data?.sphaNetwork, data?.sphaMint, reloadAt]);

  useEffect(() => {
    const cd = prep?.countdown;
    if (!cd?.launchAt || cd.status === "live" || data?.sphaMint) return;
    let stop = false;
    const beat = async () => {
      if (stop || document.hidden) return;
      try {
        const r = await fetch("/api/admin/spha", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ action: "tickCountdown" }),
        });
        const j = (await r.json().catch(() => ({}))) as {
          needsSigner?: boolean;
          minted?: boolean;
          revealed?: boolean;
          mint?: string;
          error?: string;
        };
        if (j?.needsSigner && !run) {
          setLog("T-30 mint window. Signing with the owner project wallet…");
          setMode("official");
          await launch({ pending: true });
        } else if (j?.minted && j.mint) {
          setLog(`Official mint on the dashboard. CA ${j.mint}. Public reveal at T-0.`);
        } else if (j?.revealed && j.mint) {
          setLog(`Official $SPHA live. CA ${j.mint}`);
        }
        loadPrep().catch(() => {});
      } catch {
        /* next beat */
      }
    };
    const id = window.setInterval(beat, 4_000);
    beat();
    return () => {
      stop = true;
      window.clearInterval(id);
    };
    // launch is stable enough for the armed watch
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prep?.countdown?.launchAt, prep?.countdown?.status, data?.sphaMint, run]);

  useEffect(() => {
    if (mode === "official") {
      setName(SPHA_NAME);
      setSymbol(SPHA_SYMBOL);
    } else {
      setName("Solphia Test");
      setSymbol("TESTTOKEN");
    }
  }, [mode]);

  const tests = useMemo(() => {
    const rows = [...(prep?.testLaunches || [])];
    if (prep?.testLaunch?.mint && !rows.some((r) => r.mint === prep.testLaunch?.mint)) rows.unshift(prep.testLaunch);
    return rows;
  }, [prep]);

  useEffect(() => {
    if (tradeMint) return;
    const next = prep?.testLaunch?.mint || tests[0]?.mint || prep?.launch?.mint || "";
    if (next) setTradeMint(next);
  }, [prep, tests, tradeMint]);

  const selected =
    tests.find((r) => r.mint === tradeMint) ||
    (prep?.launch?.mint === tradeMint ? prep.launch : null) ||
    tests[0] ||
    prep?.launch ||
    null;

  const launchedTokens = useMemo(() => {
    const rows: { mint: string; symbol: string; name?: string }[] = [];
    const seen = new Set<string>();
    const push = (row?: LaunchRow | null) => {
      const mint = (row?.mint || "").trim();
      if (!mint || seen.has(mint)) return;
      seen.add(mint);
      rows.push({ mint, symbol: row?.symbol || "", name: row?.name });
    };
    push(prep?.launch);
    for (const row of tests) push(row);
    return rows;
  }, [prep, tests]);

  async function launch(opts?: { pending?: boolean }) {
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
    const launchMode = opts?.pending ? "official" : mode;
    const launchName = launchMode === "official" ? SPHA_NAME : name;
    const launchSymbol = launchMode === "official" ? SPHA_SYMBOL : symbol;
    if (
      launchMode === "official" &&
      net === "mainnet-beta" &&
      !opts?.pending &&
      !confirm("MAINNET $SPHA. 200,000,000 supply. 77.1% on the curve. Continue?")
    ) {
      return;
    }
    setRun(true);
    try {
      const mint = Keypair.generate();
      setLog(`Mint ${mint.publicKey.toBase58()} building 200M ${launchMode} launch`);
      const prepR = await fetch("/api/admin/spha", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "prepare",
          mode: launchMode,
          payer,
          mint: mint.publicKey.toBase58(),
          name: launchName,
          symbol: launchSymbol,
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
          mode: launchMode,
          pending: Boolean(opts?.pending && launchMode === "official"),
          mint: ca,
          network: net,
          name: launchName,
          symbol: launchSymbol,
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
      setTradeMint(ca);
      copyText(ca, "CA copied");
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
        const metaNote = await writePoolMeta(ca, payer, metaImage, launchName);
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
        opts?.pending && launchMode === "official"
          ? `Official mint ready on the dashboard. CA ${ca}. Public reveal at T-0. ${notes.join(" · ")}`
          : launchMode === "official"
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

  async function writePoolMeta(mint: string, payer: string, logo: string, tokenName = name): Promise<string> {
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
            name: tokenName,
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
    const ca = selected?.mint || prep?.launch?.mint || prep?.testLaunch?.mint || "";
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

  async function deskClaim(kind: "creator" | "partner") {
    setErr("");
    const ca = selected?.mint || tradeMint;
    const role = kind === "creator" ? "owner" : "treasury";
    const payer =
      projectWallet(role)?.pubkey || (kind === "creator" ? data?.ownerWallet : data?.treasury) || "";
    if (!ca || !payer) {
      setErr(kind === "creator" ? "Owner project wallet signs owner claims." : "Treasury project wallet signs treasury claims.");
      return;
    }
    setClaimRun(true);
    try {
      setLog(kind === "creator" ? `Claiming owner (creator) fees for ${ca}…` : `Claiming treasury fees for ${ca}…`);
      const r = await fetch("/api/admin/spha", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "prepareClaim", kind, payer, mint: ca }),
      });
      const j = (await r.json().catch(() => ({}))) as { tx?: string; message?: string; error?: string };
      if (!r.ok || !j.tx) throw new Error(j.message || j.error || "claim build failed");
      const sig = await signAndSendProjectTx(role, j.tx);
      if (kind === "partner") {
        await fetch("/api/admin/claim", {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ wallet: "treasury", signature: sig }),
        }).catch(() => {});
        void fetch("/api/launch", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ action: "sweep_partner", pubkey: payer, mint: ca }),
        }).catch(() => {});
      }
      setLog(`${kind === "creator" ? "Owner" : "Treasury"} claim ${sig.slice(0, 8)}… Fees leave the pool on claim.`);
      loadPrep().catch(() => {});
    } catch (e) {
      setErr(e instanceof Error ? e.message : "claim failed");
    } finally {
      setClaimRun(false);
    }
  }

  async function armCountdown() {
    setErr("");
    const launchAt = new Date(when).getTime();
    if (!Number.isFinite(launchAt) || launchAt < Date.now() + SPHA_COUNTDOWN_MIN_MS) {
      setErr("Pick a time at least 30 minutes 30 seconds from now so the T-30 mint has a window.");
      return;
    }
    if (!confirm("Arm official MAINNET $SPHA. 30 minutes before T-0 the token mints and the CA appears here only. At T-0 the website reveals the copyable CA, confetti, and BUY $SPHA.")) {
      return;
    }
    if (!confirm("MAINNET $SPHA. 200,000,000 supply. 77.1% on the curve. This arms the public countdown.")) {
      return;
    }
    setArmRun(true);
    try {
      const r = await fetch("/api/admin/spha", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "schedule",
          launchAt,
          confirmOfficial: true,
          confirmMainnet: true,
        }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.message || j.error || "Could not arm the countdown.");
      setLog(`Countdown armed. T-0 ${new Date(launchAt).toLocaleString()}. T-30 mint ${new Date(launchAt - SPHA_MINT_LEAD_MS).toLocaleString()}.`);
      loadPrep().catch(() => {});
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not arm the countdown.");
    } finally {
      setArmRun(false);
    }
  }

  async function rehearseCountdown() {
    setErr("");
    setArmRun(true);
    try {
      const r = await fetch("/api/admin/spha", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "rehearseCountdown" }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.message || j.error || "Could not start the local rehearsal.");
      setLog("Local 2-minute TESTSPHA countdown armed. CA lands here at T-45s. Public reveal at T-0. Redis is off.");
      loadPrep().catch(() => {});
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not start the local rehearsal.");
    } finally {
      setArmRun(false);
    }
  }

  async function clearCountdown() {
    setErr("");
    if (!confirm("Clear the official countdown? The public page goes back to Coming soon.")) return;
    setArmRun(true);
    try {
      const r = await fetch("/api/admin/spha", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "clearSchedule" }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.message || j.error || "Could not clear the countdown.");
      setLog("Countdown cleared. Public page is Coming soon.");
      loadPrep().catch(() => {});
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not clear the countdown.");
    } finally {
      setArmRun(false);
    }
  }

  const network = data?.sphaNetwork === "mainnet-beta" ? "mainnet-beta" : "devnet";
  const ownerPk = projectWallet("owner")?.pubkey || data?.ownerWallet || "";
  const cd = prep?.countdown;
  const cdArmed = Boolean(cd?.launchAt && cd.status !== "live" && !data?.sphaMint);
  const cdParts = splitRemaining(cd?.remainingMs || 0);

  return (
    <div className="space-y-5">
      <Tokenomics />

      <div className="rounded-3xl border border-acid/25 bg-void/40 p-5">
        <div className="font-mono text-[10px] tracking-[0.22em] text-acid">OFFICIAL COUNTDOWN · PUBLIC $SPHA PAGE</div>
        <p className="mt-1 max-w-xl text-sm text-mute">
          Until a time is set the token page says Coming soon. Arming this clock is the official launch: T-30 mints
          $SPHA on mainnet (Token-2022 DBC, same path as the dashboard launcher) and shows the CA here only. T-0
          refreshes the website, fires confetti, publishes the copyable CA, and a BUY $SPHA button into the swap widget.
        </p>
        {cdArmed ? (
          <div className="mt-4 rounded-2xl border border-acid/30 bg-acid/5 p-4">
            <div className="font-mono text-[11px] tracking-[0.18em] text-acid">
              {cd?.inMintWindow ? (cd.pendingMint ? "CA READY · WAITING FOR T-0" : "MINT WINDOW") : "ARMED"}
            </div>
            <div className="mt-2 font-mono text-2xl text-ghost">
              {pad2(cdParts.d)}d {pad2(cdParts.h)}h {pad2(cdParts.m)}m {pad2(cdParts.s)}s
            </div>
            <p className="mt-1 font-mono text-[11px] text-mute">
              T-0 {cd?.launchAt ? new Date(cd.launchAt).toLocaleString() : "—"} · T-30 mint{" "}
              {cd?.mintAt ? new Date(cd.mintAt).toLocaleString() : "—"}
            </p>
            {cd?.pendingMint ? (
              <div className="mt-3">
                <CopyCa ca={cd.pendingMint} full />
                <p className="mt-2 font-mono text-[11px] text-mute">Admin-only until the public clock hits zero.</p>
              </div>
            ) : (
              <p className="mt-2 text-sm text-mute">
                Keep this dashboard open with the owner project wallet ready. Cron also mints if the owner key is on the
                server.
              </p>
            )}
            {!cd?.pendingMint ? (
              <button
                type="button"
                disabled={armRun || run}
                onClick={() => void clearCountdown()}
                className="btn-ghost mt-3 rounded-full px-4 py-1.5 text-sm disabled:opacity-40"
              >
                Clear countdown
              </button>
            ) : null}
          </div>
        ) : data?.sphaMint ? (
          <p className="mt-3 font-mono text-sm text-acid">Official $SPHA is live. The public countdown shows the CA.</p>
        ) : (
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <label className="block">
              <span className="font-mono text-[10px] tracking-[0.16em] text-mute">T-0 LAUNCH TIME</span>
              <input
                type="datetime-local"
                value={when}
                onChange={(e) => setWhen(e.target.value)}
                className="mt-1 block rounded-full border border-violet/30 bg-void px-4 py-2 text-sm text-ghost outline-none"
              />
              <span className="mt-1 block font-mono text-[10px] text-mute">
                Default {formatSphaLaunchWhen(SPHA_TGE_LAUNCH_AT_MS)}. Mint 30 minutes earlier.
              </span>
            </label>
            <button
              type="button"
              disabled={armRun || run || Boolean(prep?.missing?.length)}
              onClick={() => void armCountdown()}
              className="btn-acid rounded-full px-5 py-2 text-sm disabled:opacity-40"
            >
              {armRun ? "Arming…" : "Arm official countdown"}
            </button>
            {prep?.localRehearsal ? (
              <button
                type="button"
                disabled={armRun || run}
                onClick={() => void rehearseCountdown()}
                className="btn-ghost rounded-full px-5 py-2 text-sm disabled:opacity-40"
              >
                Local 2-min TESTSPHA rehearsal
              </button>
            ) : null}
          </div>
        )}
      </div>

      <div className="rounded-3xl border border-violet/20 bg-void/40 p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="font-mono text-[10px] tracking-[0.22em] text-acid">SOLPHIA TOKEN LAUNCHER</div>
            <p className="mt-1 max-w-xl text-sm text-mute">
              Official $SPHA is 200,000,000. 8.6 / 9.7 / 4.6 mint into the owner, foundation, and treasury project
              wallets at launch. 77.1% on the same bonding curve as every other pad token so the 1% lasts after
              graduate. Test uses that same 200M Token-2022 path, with metadata and a first buy, and does not set the
              official CA. Sign with the owner project wallet. Copy the full CA from the cards below for other venues.
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

        {(prep?.launch || tests.length > 0 || cd?.pendingMint) && (
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {cd?.pendingMint && !prep?.launch ? (
              <LaunchCaCard
                kicker="ARMED MINT · ADMIN CA · TAP TO MANAGE"
                row={{
                  mint: cd.pendingMint,
                  network,
                  launchedAt: cd.armedAt || Date.now(),
                  name: SPHA_NAME,
                  symbol: SPHA_SYMBOL,
                }}
                selected={tradeMint === cd.pendingMint}
                onSelect={() => setTradeMint(cd.pendingMint!)}
              />
            ) : null}
            {prep?.launch ? (
              <LaunchCaCard
                kicker="OFFICIAL $SPHA · TAP TO MANAGE"
                row={prep.launch}
                selected={tradeMint === prep.launch.mint}
                onSelect={() => setTradeMint(prep.launch!.mint)}
              />
            ) : null}
            {tests.map((row, i) => (
              <LaunchCaCard
                key={row.mint}
                kicker={i === 0 ? "LAST TEST · TAP TO MANAGE" : `TEST · ${row.symbol}`}
                row={row}
                selected={tradeMint === row.mint}
                onSelect={() => setTradeMint(row.mint)}
              />
            ))}
          </div>
        )}

        {selected ? (
          <div className="mt-4 rounded-2xl border border-acid/25 bg-acid/[0.04] p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <div className="font-mono text-[10px] tracking-[0.22em] text-acid">MANAGE ${selected.symbol}</div>
                <p className="mt-1 text-sm text-mute">
                  Owner is the curve creator. Swap fees sit in the pool until claimed — half to owner, half to
                  treasury. Use the swap widget to trade.
                </p>
              </div>
              <button
                type="button"
                disabled={run || splitRun || claimRun}
                onClick={() => {
                  setLog("Refreshing launched tokens…");
                  loadPrep()
                    .then(() => setLog("Live bals and unclaimed fees loaded."))
                    .catch(() => setErr("Refresh failed."));
                }}
                className="btn-ghost rounded-full px-4 py-1.5 text-sm disabled:opacity-40"
              >
                Refresh
              </button>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              <div className="rounded-2xl border border-violet/20 bg-void/40 px-3 py-2">
                <div className="font-mono text-[10px] text-mute">OWNER BAG</div>
                <div className="font-mono text-sm text-ghost">{fmtTok(selected.bals?.owner || 0)}</div>
                {(selected.bals?.ownerSol || 0) > 0 ? (
                  <div className="font-mono text-[11px] text-acid">≈ {fmtFee(selected.bals?.ownerSol || 0)} SOL</div>
                ) : null}
              </div>
              <div className="rounded-2xl border border-violet/20 bg-void/40 px-3 py-2">
                <div className="font-mono text-[10px] text-mute">FOUNDATION</div>
                <div className="font-mono text-sm text-ghost">{fmtTok(selected.bals?.foundation || 0)}</div>
              </div>
              <div className="rounded-2xl border border-violet/20 bg-void/40 px-3 py-2">
                <div className="font-mono text-[10px] text-mute">TREASURY BAG</div>
                <div className="font-mono text-sm text-ghost">{fmtTok(selected.bals?.treasury || 0)}</div>
              </div>
            </div>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              <div className="rounded-2xl border border-violet/20 bg-void/40 px-3 py-2">
                <div className="font-mono text-[10px] text-mute">OWNER UNCLAIMED · 50%</div>
                <div className="font-mono text-sm text-acid">{fmtFee(selected.fees?.creatorUnclaimedSol || 0)} SOL</div>
              </div>
              <div className="rounded-2xl border border-violet/20 bg-void/40 px-3 py-2">
                <div className="font-mono text-[10px] text-mute">TREASURY UNCLAIMED · 50%</div>
                <div className="font-mono text-sm text-acid">{fmtFee(selected.fees?.partnerUnclaimedSol || 0)} SOL</div>
              </div>
              <div className="rounded-2xl border border-violet/20 bg-void/40 px-3 py-2">
                <div className="font-mono text-[10px] text-mute">SOL IN CURVE</div>
                <div className="font-mono text-sm text-acid">{fmtFee(selected.bals?.curveSol || 0)} SOL</div>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={run || splitRun || claimRun || !((selected.fees?.creatorUnclaimedSol || 0) > 1e-9)}
                onClick={() => void deskClaim("creator")}
                className="btn-ghost rounded-full px-5 py-2 text-sm disabled:opacity-40"
              >
                {claimRun ? "Claiming…" : "Claim owner"}
              </button>
              <button
                type="button"
                disabled={run || splitRun || claimRun || !((selected.fees?.partnerUnclaimedSol || 0) > 1e-9)}
                onClick={() => void deskClaim("partner")}
                className="btn-ghost rounded-full px-5 py-2 text-sm disabled:opacity-40"
              >
                Claim treasury
              </button>
            </div>
            {ownerPk ? (
              <div className="mt-4">
                <SwapWidget
                  key={selected.mint}
                  owner={ownerPk}
                  defaultMint={selected.mint}
                  defaultSymbol={selected.symbol}
                  defaultName={selected.name}
                  defaultSide="sell"
                  widgetId={`spha-swap-${selected.mint}`}
                  tokens={launchedTokens}
                  note="Owner project wallet. Curve fees stay on-chain until you claim."
                  signTx={async (transaction) => {
                    const sig = await signAndSendProjectTx("owner", transaction);
                    loadPrep().catch(() => {});
                    return sig;
                  }}
                  onDone={() => loadPrep().catch(() => {})}
                />
              </div>
            ) : (
              <p className="mt-3 text-sm text-mute">Create the owner project wallet to swap this token.</p>
            )}
          </div>
        ) : null}

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
                  <td className="py-2">
                    {a.wallet === "curve" ? (
                      <span className="font-mono text-[11px] text-mute">bonding curve · tradeable</span>
                    ) : a.wallet ? (
                      <button
                        type="button"
                        title="Copy wallet"
                        onClick={() => copyText(a.wallet, "Wallet copied")}
                        className="break-all text-left font-mono text-[11px] text-ghost hover:text-acid"
                      >
                        {a.wallet}
                      </button>
                    ) : (
                      <span className="font-mono text-[11px] text-blood">missing</span>
                    )}
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
          disabled={run || splitRun || claimRun || Boolean(prep?.missing?.length) || (cdArmed && mode === "official")}
          onClick={() => void launch()}
          className="btn-acid mt-4 rounded-full px-6 py-2 text-sm disabled:opacity-40"
        >
          {run
            ? "Launching…"
            : cdArmed && mode === "official"
              ? "Official launch is armed on the countdown"
              : mode === "test"
                ? `Launch ${symbol || "TESTTOKEN"} on ${network}`
                : `Launch official $SPHA on ${network}`}
        </button>
        {prep?.launch?.mint || prep?.testLaunch?.mint || tests.length ? (
          <button
            type="button"
            disabled={run || splitRun || claimRun}
            onClick={() => void splitNow()}
            className="btn-ghost mt-2 rounded-full px-6 py-2 text-sm disabled:opacity-40"
          >
            {splitRun ? "Minting team…" : "Mint team allocations"}
          </button>
        ) : null}
        {log && <p className="mt-2 break-all font-mono text-[12px] text-acid">{log}</p>}
        {err && <p className="mt-2 text-sm text-blood">{err}</p>}
        {prep?.missing?.length ? (
          <p className="mt-2 text-sm text-mute">Need: {prep.missing.join(", ")}</p>
        ) : null}
      </div>
    </div>
  );
}
