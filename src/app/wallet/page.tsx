"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, Plus, Repeat } from "lucide-react";
import { CartoonPfp } from "@/components/CartoonPfp";
import { SolanaMark } from "@/components/SolanaMark";
import { TokenArt } from "@/components/TokenArt";
import { CopyButton } from "@/components/CopyButton";
import { copyText } from "@/lib/copyText";
import { WalletConnect } from "@/components/WalletConnect";
import { WalletSheet } from "@/components/wallet/sheet";
import { openWalletOnboard, openWalletSwitcher } from "@/components/wallet/WalletHost";
import { useOwner } from "@/lib/hooks";
import { isSolanaAddress } from "@/lib/wallet/addr";
import { SOL_MINT } from "@/lib/pair/mints";
import { qrSvg } from "@/lib/wallet/qr";
import { signPhantomAndSend } from "@/lib/wallet/trading";
import { isPhantomRedirect } from "@/lib/wallet/phantomConnect";
import { exportSecretB58, requestUnlock, unlockedMnemonic, vaultUnlocked } from "@/lib/wallet/vault";
import { useActiveWallet, useVaultWallets } from "@/lib/wallet/useVault";
import { phraseFile } from "@/lib/wallet/phrase";
import { seedSwapMint, solscanAccount, solscanToken, solscanTx } from "@/lib/wallet/paths";
import { maxPayString, spendableAmount } from "@/lib/swap/spendable";

type Holding = {
  mint: string;
  amount: number;
  decimals: number;
  name: string;
  symbol: string;
  image: string;
  usd: number | null;
  change24h: number | null;
  born: boolean;
  sol: boolean;
};

type Hist = { sig: string; at: number; sol: number; from: string };

function fmtAmt(n: number) {
  if (!(n > 0)) return "0";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(2)}K`;
  if (n >= 1) return n.toFixed(n >= 100 ? 2 : 4).replace(/0+$/, "").replace(/\.$/, "");
  return n.toFixed(6).replace(/0+$/, "").replace(/\.$/, "");
}

function fmtUsd(n: number | null) {
  if (n == null || !(n > 0)) return "—";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(2)}K`;
  if (n >= 1) return `$${n.toFixed(2)}`;
  return `$${n.toFixed(4)}`;
}

function tick(symbol?: string, mint?: string) {
  const s = (symbol || "").replace(/^\$+/, "").trim();
  if (s) return s;
  return mint && mint.length >= 4 ? mint.slice(0, 4).toUpperCase() : "TOKEN";
}

export default function WalletPage() {
  const owner = useOwner();
  const active = useActiveWallet();
  const wallets = useVaultWallets();
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [hist, setHist] = useState<Hist[]>([]);
  const [q, setQ] = useState("");
  const [hideDust, setHideDust] = useState(true);
  const [sheet, setSheet] = useState<"receive" | "send" | "token" | "export" | null>(null);
  const [token, setToken] = useState<Holding | null>(null);
  const [candles, setCandles] = useState<{ t: number; c: number }[]>([]);
  const [sendMint, setSendMint] = useState(SOL_MINT);
  const [sendTo, setSendTo] = useState("");
  const [sendAmt, setSendAmt] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [sig, setSig] = useState("");
  const [secret, setSecret] = useState("");
  const [phrase, setPhrase] = useState("");

  const load = useCallback(async () => {
    if (!owner) return;
    const [h, t] = await Promise.all([
      fetch(`/api/sol/holdings?pubkey=${encodeURIComponent(owner)}`, { cache: "no-store" }).then((r) => r.json()).catch(() => null),
      fetch(`/api/sol/history?pubkey=${encodeURIComponent(owner)}`, { cache: "no-store" }).then((r) => r.json()).catch(() => null),
    ]);
    if (Array.isArray(h?.holdings)) setHoldings(h.holdings as Holding[]);
    if (Array.isArray(t?.transfers)) setHist(t.transfers as Hist[]);
  }, [owner]);

  useEffect(() => {
    load().catch(() => {});
  }, [load]);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const vis = holdings.filter((h) => {
      if (hideDust && !h.sol && (h.usd == null ? h.amount < 0.000001 : h.usd < 0.01)) return false;
      if (!needle) return true;
      return (
        h.symbol.toLowerCase().includes(needle) ||
        h.name.toLowerCase().includes(needle) ||
        h.mint.toLowerCase().includes(needle)
      );
    });
    return vis.slice().sort((a, b) => {
      if (a.born !== b.born) return a.born ? -1 : 1;
      if (a.sol !== b.sol) return a.sol ? -1 : 1;
      return (b.usd || 0) - (a.usd || 0);
    });
  }, [holdings, hideDust, q]);

  const totalUsd = holdings.reduce((n, h) => n + (h.usd || 0), 0);
  const sendToken = holdings.find((h) => h.mint === sendMint) || holdings.find((h) => h.sol) || null;
  const book = wallets.filter((w) => w.pubkey !== owner);
  const nickname = active?.nickname || "Wallet";

  function openToken(row: Holding) {
    setToken(row);
    setSheet("token");
    setCandles([]);
    if (!row.sol) {
      void fetch(`/api/launch/chart?mint=${encodeURIComponent(row.mint)}&tf=15m`, { cache: "no-store" })
        .then((r) => r.json())
        .then((j) => {
          const cs = Array.isArray(j?.candles) ? (j.candles as { t?: number; c?: number }[]) : [];
          setCandles(cs.map((c) => ({ t: Number(c.t) || 0, c: Number(c.c) || 0 })).filter((c) => c.c > 0));
        })
        .catch(() => {});
    }
  }

  function goSwap(mint: string, side: "buy" | "sell") {
    seedSwapMint(mint, side);
    window.location.href = `/swap?mint=${encodeURIComponent(mint)}`;
  }

  async function send() {
    if (!owner) return;
    const to = sendTo.trim();
    const amount = Number(String(sendAmt).replace(",", "."));
    if (!isSolanaAddress(to)) {
      setErr("Paste a Solana address.");
      return;
    }
    if (!(amount > 0)) {
      setErr("Enter an amount.");
      return;
    }
    setBusy(true);
    setErr("");
    setSig("");
    try {
      const r = await fetch("/api/sol/transfer", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          owner,
          to,
          amount,
          mint: sendMint === SOL_MINT ? undefined : sendMint,
          priority,
        }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(typeof j.error === "string" ? j.error : "Could not build the transfer.");
      const landed = await signPhantomAndSend(j.transaction, undefined, { kind: "generic" }, { skipPreflight: false });
      setSig(landed);
      setSendAmt("");
      void load();
    } catch (e) {
      if (isPhantomRedirect(e)) {
        setErr("Approve in Phantom. You'll come back here.");
        return;
      }
      setErr(e instanceof Error ? e.message : "Send failed.");
    } finally {
      setBusy(false);
    }
  }

  async function revealExport() {
    setErr("");
    if (!vaultUnlocked()) {
      const ok = await requestUnlock();
      if (!ok) {
        setErr("Unlock to export this key.");
        return;
      }
    }
    setPhrase(unlockedMnemonic() || "");
    setSecret(exportSecretB58() || "");
    setSheet("export");
  }

  if (!owner) {
    return (
      <main className="pump-shell">
        <div className="pump-wrap py-16">
          <h1 className="pump-h1">Wallet</h1>
          <p className="pump-p mt-2">Create a Solphia wallet or import a recovery phrase. Phantom is only for sending funds in or out. Keys never sit on Solphia servers.</p>
          <div className="mt-6">
            <WalletConnect />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="pump-shell">
      <div className="pump-wrap pb-16">
        <div className="flex items-center gap-3">
          <CartoonPfp seed={owner} src={`/api/circle/avatar?pk=${encodeURIComponent(owner)}`} className="h-12 w-12" />
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-medium text-[#14f195]">Wallet</p>
            <h1 className="truncate text-[24px] font-semibold tracking-tight text-white">{nickname}</h1>
            <p className="font-mono text-[11px] text-mute">
              {owner.slice(0, 4)}…{owner.slice(-4)}
              {active?.kind === "phantom" ? " · external" : " · Solphia"}
            </p>
          </div>
          <button type="button" onClick={() => openWalletSwitcher()} className="rounded-full bg-white/10 px-3 py-2 text-[13px] text-white">
            Switch
          </button>
        </div>

        <p className="mt-5 text-[32px] font-semibold tracking-tight text-white">{fmtUsd(totalUsd || null)}</p>
        <p className="font-mono text-[12px] text-white/40">{fmtAmt(holdings.find((h) => h.sol)?.amount || 0)} SOL</p>

        <div className="mt-5 grid grid-cols-4 gap-2">
          {(
            [
              { label: "Receive", Icon: ArrowDownLeft, tone: "acid" as const, onClick: () => setSheet("receive") },
              { label: "Send", Icon: ArrowUpRight, tone: "ghost" as const, onClick: () => { setSendMint(SOL_MINT); setSheet("send"); } },
              { label: "Swap", Icon: Repeat, tone: "ghost" as const, onClick: () => { window.location.href = "/swap"; } },
              { label: "Add", Icon: Plus, tone: "ghost" as const, onClick: () => openWalletOnboard() },
            ]
          ).map((a) => (
            <button
              key={a.label}
              type="button"
              onClick={a.onClick}
              className="flex min-h-[76px] flex-col items-center justify-center gap-2 rounded-2xl bg-white/[0.06] px-1 py-3 text-[12px] font-medium text-white hover:bg-white/10 active:scale-[0.98]"
            >
              <span
                className={`grid h-11 w-11 place-items-center rounded-full ${
                  a.tone === "acid" ? "bg-acid text-void" : "bg-white/10 text-white"
                }`}
              >
                <a.Icon className="h-5 w-5" strokeWidth={2.25} />
              </span>
              {a.label}
            </button>
          ))}
        </div>

        <div className="mt-5 flex gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search tokens"
            className="min-h-[44px] min-w-0 flex-1 rounded-2xl border border-white/10 bg-white/[0.06] px-3 text-[14px] text-white outline-none"
          />
          <button
            type="button"
            onClick={() => setHideDust((v) => !v)}
            className={`rounded-2xl px-3 text-[12px] ${hideDust ? "bg-acid/20 text-acid" : "bg-white/10 text-white/60"}`}
          >
            Hide dust
          </button>
        </div>

        <div className="mt-3 space-y-1">
          {rows.map((row) => (
            <button
              key={row.mint}
              type="button"
              onClick={() => openToken(row)}
              className="flex w-full items-center gap-3 rounded-2xl px-2 py-2.5 text-left hover:bg-white/5"
            >
              {row.sol ? (
                <SolanaMark className="h-10 w-10" />
              ) : (
                <TokenArt src={row.image} mint={row.mint} label={row.symbol} eager className="h-10 w-10 rounded-full" />
              )}
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5 text-[15px] font-semibold text-white">
                  {tick(row.symbol, row.mint)}
                  {row.born ? <span className="rounded-full bg-acid/15 px-1.5 py-0.5 font-mono text-[9px] text-acid">SOLPHIA</span> : null}
                </span>
                <span className="block truncate text-[12px] text-white/40">{row.name || row.mint.slice(0, 8)}</span>
              </span>
              <span className="text-right">
                <span className="block text-[15px] text-white">{fmtAmt(row.amount)}</span>
                <span className="block font-mono text-[11px] text-white/40">
                  {fmtUsd(row.usd)}
                  {row.change24h != null ? ` · ${row.change24h >= 0 ? "+" : ""}${row.change24h.toFixed(1)}%` : ""}
                </span>
              </span>
            </button>
          ))}
          {rows.length === 0 ? <p className="px-2 py-6 text-center text-[14px] text-white/40">No tokens yet. Receive SOL from any wallet.</p> : null}
        </div>

        {active?.kind === "embedded" ? (
          <button type="button" onClick={() => void revealExport()} className="mt-4 w-full text-center text-[13px] text-white/45">
            Export this key
          </button>
        ) : (
          <p className="mt-4 text-center text-[13px] text-white/35">Phantom keys stay in Phantom. They cannot be exported here.</p>
        )}

        <section className="mt-8">
          <h2 className="text-[16px] font-semibold text-white">Recent</h2>
          <div className="mt-2 space-y-1">
            {hist.filter((t) => t.sig).slice(0, 12).map((t) => (
              <a
                key={t.sig}
                href={solscanTx(t.sig)}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between rounded-2xl px-2 py-2 text-[13px] text-white/70 hover:bg-white/5"
              >
                <span className="font-mono text-[11px]">{t.sig.slice(0, 8)}…</span>
                <span>{t.sol ? `${t.sol > 0 ? "+" : ""}${fmtAmt(Math.abs(t.sol))} SOL` : "tx"}</span>
              </a>
            ))}
            {hist.length === 0 ? <p className="px-2 py-3 text-[13px] text-white/35">No transfers yet.</p> : null}
          </div>
        </section>
      </div>

      {sheet === "receive" ? (
        <WalletSheet title="Receive" subtitle={nickname} onClose={() => setSheet(null)}>
          <div className="flex justify-center" dangerouslySetInnerHTML={{ __html: qrSvg(owner) }} />
          <p className="mt-3 break-all text-center font-mono text-[12px] text-white select-all">{owner}</p>
          <CopyButton
            text={owner}
            label="Copy address"
            copiedLabel="Copied"
            className="btn-acid mt-4 min-h-[48px] w-full rounded-full"
          />
          <p className="mt-3 text-center text-[13px] text-white/40">Send SOL in from Phantom or any wallet. This address is yours.</p>
          <a href={solscanAccount(owner)} target="_blank" rel="noreferrer" className="mt-3 block text-center text-[13px] text-white/45">
            View on Solscan
          </a>
        </WalletSheet>
      ) : null}

      {sheet === "send" ? (
        <WalletSheet title="Send" subtitle="One signature. You keep the key." onClose={() => setSheet(null)}>
          {err ? <p className="mb-3 font-mono text-[13px] text-blood">{err}</p> : null}
          {sig ? (
            <a href={solscanTx(sig)} target="_blank" rel="noreferrer" className="mb-3 block font-mono text-[12px] text-acid">
              Sent · {sig.slice(0, 8)}…
            </a>
          ) : null}
          <label className="block text-[12px] text-white/45">Token</label>
          <select
            value={sendMint}
            onChange={(e) => setSendMint(e.target.value)}
            className="mt-1 min-h-[44px] w-full rounded-2xl border border-white/10 bg-white/[0.06] px-3 text-[14px] text-white"
          >
            {holdings.map((h) => (
              <option key={h.mint} value={h.mint}>
                {tick(h.symbol, h.mint)} · {fmtAmt(h.amount)}
              </option>
            ))}
          </select>
          <label className="mt-3 block text-[12px] text-white/45">To</label>
          <input
            value={sendTo}
            onChange={(e) => setSendTo(e.target.value.trim())}
            placeholder="Paste a Solana address"
            className="mt-1 min-h-[44px] w-full rounded-2xl border border-white/10 bg-white/[0.06] px-3 font-mono text-[13px] text-white outline-none"
          />
          {book.length ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {book.map((w) => (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => setSendTo(w.pubkey)}
                  className="rounded-full bg-white/10 px-3 py-1 text-[12px] text-white"
                >
                  {w.nickname}
                </button>
              ))}
            </div>
          ) : null}
          <label className="mt-3 block text-[12px] text-white/45">Amount</label>
          <div className="mt-1 flex gap-2">
            <input
              inputMode="decimal"
              value={sendAmt}
              onChange={(e) => setSendAmt(e.target.value.replace(/[^\d.,]/g, ""))}
              className="min-h-[44px] min-w-0 flex-1 rounded-2xl border border-white/10 bg-white/[0.06] px-3 text-[16px] text-white outline-none"
            />
            <button
              type="button"
              className="rounded-2xl bg-white/10 px-3 text-[13px] text-white"
              onClick={() => {
                const have = sendToken?.amount || 0;
                setSendAmt(maxPayString(spendableAmount(have, sendMint), sendMint));
              }}
            >
              Max
            </button>
          </div>
          <div className="mt-3 flex gap-1.5">
            {(["low", "medium", "high"] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPriority(p)}
                className={`rounded-full px-3 py-1.5 text-[12px] ${priority === p ? "bg-acid text-void" : "bg-white/10 text-white/60"}`}
              >
                {p}
              </button>
            ))}
          </div>
          <p className="mt-2 text-[12px] text-white/40">Network fee is paid in SOL from this wallet. Priority is a tip, not a Solphia fee.</p>
          <button type="button" disabled={busy} onClick={() => void send()} className="btn-acid mt-4 min-h-[48px] w-full rounded-full disabled:opacity-40">
            {busy ? "Sending…" : "Review and send"}
          </button>
        </WalletSheet>
      ) : null}

      {sheet === "token" && token ? (
        <WalletSheet
          title={tick(token.symbol, token.mint)}
          subtitle={token.name || token.mint.slice(0, 8)}
          onClose={() => setSheet(null)}
        >
          <div className="flex items-center gap-3">
            {token.sol ? <SolanaMark className="h-12 w-12" /> : <TokenArt src={token.image} mint={token.mint} label={token.symbol} eager className="h-12 w-12 rounded-full" />}
            <div>
              <p className="text-[22px] font-semibold text-white">{fmtAmt(token.amount)}</p>
              <p className="font-mono text-[12px] text-white/40">{fmtUsd(token.usd)}</p>
            </div>
          </div>
          {candles.length > 1 ? (
            <svg viewBox="0 0 120 36" className="mt-4 h-16 w-full text-acid">
              <polyline
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                points={candles
                  .map((c, i) => {
                    const xs = candles.map((x) => x.c);
                    const min = Math.min(...xs);
                    const max = Math.max(...xs);
                    const x = (i / (candles.length - 1)) * 120;
                    const y = 34 - ((c.c - min) / Math.max(1e-9, max - min)) * 32;
                    return `${x},${y}`;
                  })
                  .join(" ")}
              />
            </svg>
          ) : null}
          <div className="mt-4 grid grid-cols-3 gap-2">
            <button type="button" className="rounded-2xl bg-acid py-3 text-[13px] font-semibold text-void" onClick={() => goSwap(token.mint, "buy")}>
              Buy
            </button>
            <button type="button" className="rounded-2xl bg-white/10 py-3 text-[13px] text-white" onClick={() => goSwap(token.mint, "sell")}>
              Sell
            </button>
            <button
              type="button"
              className="rounded-2xl bg-white/10 py-3 text-[13px] text-white"
              onClick={() => {
                setSendMint(token.mint);
                setSheet("send");
              }}
            >
              Send
            </button>
          </div>
          <button
            type="button"
            className="mt-3 w-full rounded-2xl bg-white/8 py-2.5 font-mono text-[12px] text-white/70"
            onClick={() => copyText(token.mint)}
          >
            Copy CA · {token.mint.slice(0, 4)}…{token.mint.slice(-4)}
          </button>
          <a href={solscanToken(token.mint)} target="_blank" rel="noreferrer" className="mt-2 block text-center text-[13px] text-white/45">
            Explorer
          </a>
        </WalletSheet>
      ) : null}

      {sheet === "export" ? (
        <WalletSheet title="Export key" subtitle="Anyone with this can empty the wallet. Solphia never has a copy." onClose={() => setSheet(null)}>
          {phrase ? (
            <>
              <p className="text-[12px] text-white/45">Recovery phrase</p>
              <p className="mt-1 break-words font-mono text-[14px] text-white">{phrase}</p>
              <div className="mt-2 flex gap-2">
                <CopyButton text={phrase} label="Copy phrase" copiedLabel="Copied" className="rounded-full bg-white/10 px-3 py-1.5 text-[13px] text-white" />
                <button
                  type="button"
                  className="rounded-full bg-white/10 px-3 py-1.5 text-[13px] text-white"
                  onClick={() => {
                    const blob = new Blob([phraseFile(phrase, owner)], { type: "text/plain" });
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
            </>
          ) : null}
          {secret ? (
            <>
              <p className="mt-4 text-[12px] text-white/45">Private key</p>
              <p className="mt-1 break-all font-mono text-[12px] text-white/80">{secret}</p>
              <CopyButton text={secret} label="Copy private key" copiedLabel="Copied" className="mt-2 rounded-full bg-white/10 px-3 py-1.5 text-[13px] text-white" />
            </>
          ) : (
            <p className="text-[13px] text-white/45">Unlock to export. Phantom wallets cannot be exported from Solphia.</p>
          )}
        </WalletSheet>
      ) : null}
    </main>
  );
}
