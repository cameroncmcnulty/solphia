"use client";

import { useMemo, useState } from "react";
import { Keypair, PublicKey } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { batches, toRawAmount } from "@/lib/dev/airdrop";
import { linearSchedule, splitAmount } from "@/lib/dev/vesting";
import { transferIxs } from "@/lib/dev/spl";
import { connectedPubkey, signAndSend, solscan } from "@/lib/dev/wallet";
import { Field, Status, inputClass } from "./fields";

type Vault = { at: number; label: string; amount: string; secret: number[]; pubkey: string };

export function VestingDesk() {
  const [mint, setMint] = useState("");
  const [total, setTotal] = useState("10000000");
  const [decimals, setDecimals] = useState(6);
  const [months, setMonths] = useState(12);
  const [cliff, setCliff] = useState(3);
  const [beneficiary, setBeneficiary] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [ok, setOk] = useState(false);
  const [plan, setPlan] = useState<Vault[] | null>(null);

  const preview = useMemo(() => {
    const t = linearSchedule({ startAt: Date.now(), months, cliffMonths: cliff });
    return splitAmount(toRawAmount(Number(total) || 0, decimals), t);
  }, [total, decimals, months, cliff]);

  async function fund() {
    setBusy(true);
    setOk(false);
    setMsg("");
    try {
      const payer = await connectedPubkey();
      const t = linearSchedule({ startAt: Date.now(), months, cliffMonths: cliff });
      const parts = splitAmount(toRawAmount(Number(total), decimals), t);
      if (!parts.length) throw new Error("Empty schedule.");
      const vaults: Vault[] = parts.map((p) => {
        const kp = Keypair.generate();
        return {
          at: p.at,
          label: p.label,
          amount: p.amount.toString(),
          secret: Array.from(kp.secretKey),
          pubkey: kp.publicKey.toBase58(),
        };
      });
      const blob = {
        mint,
        beneficiary: beneficiary || payer,
        createdAt: Date.now(),
        vaults: vaults.map((v) => ({
          at: v.at,
          label: v.label,
          amount: v.amount,
          pubkey: v.pubkey,
          secret: v.secret,
        })),
      };
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([JSON.stringify(blob, null, 2)], { type: "application/json" }));
      a.download = `solphia-vest-${Date.now()}.json`;
      a.click();
      let sig = "";
      for (const group of batches(vaults, 4)) {
        const ixs = transferIxs({
          payer: new PublicKey(payer),
          mint: new PublicKey(mint),
          program: TOKEN_PROGRAM_ID,
          destinations: group.map((v) => ({ owner: new PublicKey(v.pubkey), amount: BigInt(v.amount) })),
        });
        sig = await signAndSend({ ixs });
      }
      setPlan(vaults);
      setOk(true);
      setMsg("Backup downloaded. Tranches funded. Keep the JSON — that is the only way to claim.");
      window.open(solscan(sig), "_blank");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "vest failed");
    } finally {
      setBusy(false);
    }
  }

  async function claim(file: File) {
    setBusy(true);
    setOk(false);
    setMsg("");
    try {
      const payer = await connectedPubkey();
      const json = JSON.parse(await file.text()) as {
        mint: string;
        beneficiary?: string;
        vaults: Vault[];
      };
      const dest = json.beneficiary || beneficiary || payer;
      const due = json.vaults.filter((v) => v.at <= Date.now());
      if (!due.length) throw new Error("No tranche is unlocked yet.");
      let last = "";
      for (const v of due) {
        const kp = Keypair.fromSecretKey(Uint8Array.from(v.secret));
        const ixs = transferIxs({
          payer: new PublicKey(payer),
          authority: kp.publicKey,
          mint: new PublicKey(json.mint),
          destinations: [{ owner: new PublicKey(dest), amount: BigInt(v.amount) }],
        });
        last = await signAndSend({ ixs, extraSigners: [kp] });
      }
      setOk(true);
      setMsg(`Claimed ${due.length} unlocked tranche(s).`);
      if (last) window.open(solscan(last), "_blank");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "claim failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="panel space-y-4 rounded-2xl p-4 sm:p-6">
      <p className="font-serif text-sm text-mute">
        Linear vest with an optional cliff. Each tranche is a real wallet she funds now. You download the keys. After
        the date, claim sends tokens to the beneficiary. If you lose the JSON, those tokens stay locked forever.
      </p>
      <Field label="Token mint">
        <input className={inputClass} value={mint} onChange={(e) => setMint(e.target.value.trim())} />
      </Field>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Total tokens">
          <input className={inputClass} value={total} onChange={(e) => setTotal(e.target.value)} />
        </Field>
        <Field label="Months">
          <input type="number" className={inputClass} value={months} onChange={(e) => setMonths(Number(e.target.value) || 1)} />
        </Field>
        <Field label="Cliff months">
          <input type="number" className={inputClass} value={cliff} onChange={(e) => setCliff(Number(e.target.value) || 0)} />
        </Field>
      </div>
      <Field label="Beneficiary (defaults to you)">
        <input className={inputClass} value={beneficiary} onChange={(e) => setBeneficiary(e.target.value.trim())} />
      </Field>
      <div className="rounded-2xl border border-line p-3 font-mono text-[11px] text-mute">
        {preview.map((p) => (
          <div key={p.at} className="flex justify-between gap-2 py-1">
            <span>{p.label}</span>
            <span>{new Date(p.at).toLocaleDateString()}</span>
          </div>
        ))}
      </div>
      <button disabled={busy || !mint} onClick={fund} className="btn-acid min-h-[48px] w-full rounded-full font-mono text-[11px] disabled:opacity-40">
        DOWNLOAD KEYS + FUND TRANCHES
      </button>
      <Field label="Claim from backup JSON">
        <input
          type="file"
          accept="application/json"
          className="w-full font-mono text-xs text-mute"
          onChange={(e) => e.target.files?.[0] && claim(e.target.files[0])}
        />
      </Field>
      {plan && <p className="font-mono text-[11px] text-cyan">{plan.length} vaults created</p>}
      <Status msg={msg} ok={ok} />
    </div>
  );
}
