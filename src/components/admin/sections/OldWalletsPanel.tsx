"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { copyText } from "@/lib/copyText";
import { Mini, Panel, solAmt } from "../ui";

type OldWalletRow = {
  pk: string;
  role: "hop" | "final";
  tokenId?: string;
  hopIndex: number;
  createdAt: number;
  live: boolean;
  source: "v1" | "v2";
};

type OldWallets = {
  count: number;
  reclaimable: number;
  incinerator: string;
  rows: Omit<OldWalletRow, "source">[];
};

type ReclaimResult = {
  ok: boolean;
  closed: number;
  movedSol: number;
  skippedLive: number;
  signatures?: string[];
  error?: string;
};

const INCINERATOR = "https://sol-incinerator.com/tools";

function shortPk(pk?: string) {
  if (!pk) return "—";
  return `${pk.slice(0, 4)}…${pk.slice(-4)}`;
}

export function OldWalletsPanel() {
  const [rows, setRows] = useState<OldWalletRow[]>([]);
  const [incinerator, setIncinerator] = useState(INCINERATOR);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [copied, setCopied] = useState("");
  const [reclaim, setReclaim] = useState<ReclaimResult | null>(null);

  const load = useCallback(async () => {
    const [v1, v2] = await Promise.all([
      fetch("/api/admin/tools/launcher", { cache: "no-store" }).then((r) => r.json()).catch(() => ({})),
      fetch("/api/admin/tools/launcher-v2", { cache: "no-store" }).then((r) => r.json()).catch(() => ({})),
    ]);
    const a = (v1?.oldWallets || { count: 0, reclaimable: 0, incinerator: INCINERATOR, rows: [] }) as OldWallets;
    const b = (v2?.oldWallets || { count: 0, reclaimable: 0, incinerator: INCINERATOR, rows: [] }) as OldWallets;
    setIncinerator(b.incinerator || a.incinerator || INCINERATOR);
    const merged: OldWalletRow[] = [
      ...(a.rows || []).map((w) => ({ ...w, source: "v1" as const })),
      ...(b.rows || []).map((w) => ({ ...w, source: "v2" as const })),
    ];
    const seen = new Set<string>();
    setRows(merged.filter((w) => (seen.has(w.pk) ? false : (seen.add(w.pk), true))));
  }, []);

  useEffect(() => {
    load().catch((e) => setErr(e instanceof Error ? e.message : "Could not load old wallets."));
  }, [load]);

  const reclaimable = useMemo(() => rows.filter((w) => !w.live).length, [rows]);

  function copy(label: string, value?: string) {
    if (!value) return;
    if (!copyText(value, `${label} copied`)) return;
    setCopied(label);
    setTimeout(() => setCopied(""), 1600);
  }

  async function reclaimAll() {
    setBusy(true);
    setErr("");
    try {
      const posts = await Promise.all([
        fetch("/api/admin/tools/launcher", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ action: "reclaimOldWallets" }),
        }).then((r) => r.json()),
        fetch("/api/admin/tools/launcher-v2", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ action: "reclaimOldWallets" }),
        }).then((r) => r.json()),
      ]);
      const failed = posts.find((j) => j?.error && !j?.reclaimResult?.ok);
      const closed = posts.reduce((n, j) => n + (Number(j?.reclaimResult?.closed) || 0), 0);
      const movedSol = posts.reduce((n, j) => n + (Number(j?.reclaimResult?.movedSol) || 0), 0);
      const skippedLive = posts.reduce((n, j) => n + (Number(j?.reclaimResult?.skippedLive) || 0), 0);
      const signatures = posts.flatMap((j) => j?.reclaimResult?.signatures || []);
      setReclaim({
        ok: !failed,
        closed,
        movedSol,
        skippedLive,
        signatures,
        error: failed?.message || failed?.reclaimResult?.error,
      });
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Reclaim failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel kicker="OLD WALLETS · SOL INCINERATOR">
      <p className="mt-3 max-w-3xl text-sm text-mute">
        Saved V1 launch wallets and V2 hop/final keys stay here forever. OPEN SOL INCINERATOR opens
        sol-incinerator.com/tools so you can connect a wallet and burn leftover mints for rent. RECLAIM RENT TO TREASURY
        does that here with the saved keys: burns leftover tokens, closes empty accounts, then sends the SOL to treasury.
        Live bags stay. Secrets never leave the server.
      </p>
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Mini k="Saved wallets" v={String(rows.length)} />
        <Mini k="Reclaimable" v={String(reclaimable)} />
        <Mini k="Live skipped" v={String(rows.length - reclaimable)} />
        <Mini k="This pass" v="20 / launcher" />
      </div>
      <div className="mt-3 overflow-auto">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead className="font-mono text-[10px] tracking-[0.2em] text-mute">
            <tr>
              <th className="px-2 py-1">Desk</th>
              <th className="px-2 py-1">Role</th>
              <th className="px-2 py-1">Wallet</th>
              <th className="px-2 py-1">Token</th>
              <th className="px-2 py-1">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((w) => (
              <tr key={`${w.source}-${w.pk}`} className="border-t border-line/60">
                <td className="px-2 py-1 font-mono text-[11px] text-ghost">{w.source.toUpperCase()}</td>
                <td className="px-2 py-1 font-mono text-[11px] text-ghost">{w.role}</td>
                <td className="px-2 py-1">
                  <button type="button" className="font-mono text-[11px] text-ghost" onClick={() => copy("wallet", w.pk)}>
                    {shortPk(w.pk)}
                  </button>
                </td>
                <td className="px-2 py-1 font-mono text-[11px] text-mute">{w.tokenId || "—"}</td>
                <td className="px-2 py-1 font-mono text-[11px] text-mute">{w.live ? "live bag" : "old"}</td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={5} className="px-2 py-3 text-mute">
                  No saved launch wallets yet. They appear here after the first V1 or V2 launch.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {copied ? <p className="mt-2 font-mono text-[11px] text-acid">{copied} copied</p> : null}
      {err ? <p className="mt-3 text-sm text-blood">{err}</p> : null}
      {reclaim && (
        <p className={`mt-3 text-sm ${reclaim.ok ? "text-acid" : "text-blood"}`}>
          {reclaim.ok
            ? `Reclaimed ${reclaim.closed} wallets · ${solAmt(reclaim.movedSol)} to treasury${reclaim.skippedLive ? ` · skipped ${reclaim.skippedLive} live` : ""}. Click again if wallets remain.`
            : reclaim.error || "Reclaim failed."}
        </p>
      )}
      <div className="mt-4 flex flex-wrap gap-3">
        <a
          href={incinerator}
          target="_blank"
          rel="noreferrer"
          className="btn-acid rounded-full px-8 py-3 text-sm tracking-[0.2em]"
        >
          OPEN SOL INCINERATOR
        </a>
        <button
          type="button"
          disabled={busy || !rows.length}
          onClick={() => copy("old wallets", rows.map((w) => w.pk).join("\n"))}
          className="btn-ghost rounded-full px-5 py-3 text-sm"
        >
          COPY ADDRESSES
        </button>
        <button
          type="button"
          disabled={busy || !reclaimable}
          onClick={() => {
            if (
              !window.confirm(
                "RECLAIM RENT TO TREASURY on old V1 and V2 wallets? This burns leftover tokens, closes empty accounts, and sends the SOL to treasury. Live bags stay. Secrets stay saved. Click again if wallets remain (20 per launcher per pass).",
              )
            ) {
              return;
            }
            void reclaimAll();
          }}
          className="btn-acid rounded-full px-8 py-3 text-sm tracking-[0.2em]"
        >
          RECLAIM RENT TO TREASURY
        </button>
      </div>
    </Panel>
  );
}
