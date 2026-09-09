"use client";

import { WalletConnect } from "@/components/WalletConnect";
import { FieldError, useConfirmErrors } from "@/components/form/confirm";
import { walletOk } from "@/lib/launch/validate";
import { useAdmin } from "../AdminProvider";
import { Field, shortPk } from "../ui";

export function WalletsSection() {
  const { data, busy, patch, adminPk, setAdminPk, treasuryPk, setTreasuryPk, owner } = useAdmin();
  const adminErr = useConfirmErrors<"adminPk">();
  const treasErr = useConfirmErrors<"treasuryPk">();
  if (!data) return null;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="panel rounded-2xl p-5">
        <div className="font-mono text-[10px] tracking-[0.3em] text-mute">ADMIN WALLET · FREE SEAT</div>
        <p className="mt-2 text-sm text-mute">
          Connect the Phantom you trade with. That address skips the {data.seatSol} / {data.seatSolLev} SOL seat. Keys stay in the
          wallet.
        </p>
        <div className="mt-3">
          <WalletConnect />
        </div>
        <Field
          field="adminPk"
          value={adminPk}
          error={adminErr.errors.adminPk}
          onChange={(v) => {
            setAdminPk(v.trim());
            adminErr.clear("adminPk");
          }}
          placeholder="Solana address"
          className="mt-3"
        />
        <FieldError error={adminErr.errors.adminPk} />
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              if (!adminPk) {
                adminErr.fail({ adminPk: "Paste a Solana address or connect Phantom." });
                return;
              }
              if (!walletOk(adminPk)) {
                adminErr.fail({ adminPk: "That is not a valid Solana address." });
                return;
              }
              adminErr.ok();
              patch({ adminWallet: adminPk });
            }}
            className="btn-acid rounded-full px-5 py-2 text-sm disabled:opacity-40"
          >
            Save admin wallet
          </button>
          {owner && (
            <button type="button" disabled={busy} onClick={() => patch({ adminWallet: owner })} className="btn-ghost rounded-full px-5 py-2 text-sm">
              Use connected
            </button>
          )}
        </div>
        <div className="mt-4 space-y-2">
          {(data.adminWallets || []).length === 0 && <p className="font-mono text-[11px] text-mute">None set.</p>}
          {(data.adminWallets || []).map((w) => (
            <div key={w} className="flex items-center justify-between gap-2 font-mono text-[11px]">
              <span className="text-ghost">{shortPk(w, 6)}</span>
              <button type="button" className="text-blood" onClick={() => patch({ removeAdminWallet: w })}>
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="panel rounded-2xl p-5">
        <div className="font-mono text-[10px] tracking-[0.3em] text-mute">TREASURY · PAYMENTS IN</div>
        <p className="mt-2 text-sm text-mute">
          {data.seatSol} SOL (spot) and {data.seatSolLev} SOL (2×/3×) seats plus 0.1% clip fees land here. Default is the founder
          treasury. Save another address to override it.
        </p>
        <Field
          field="treasuryPk"
          value={treasuryPk}
          error={treasErr.errors.treasuryPk}
          onChange={(v) => {
            setTreasuryPk(v.trim());
            treasErr.clear("treasuryPk");
          }}
          placeholder="Treasury Solana address"
          className="mt-3"
        />
        <FieldError error={treasErr.errors.treasuryPk} />
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              if (treasuryPk && !walletOk(treasuryPk)) {
                treasErr.fail({ treasuryPk: "That is not a valid Solana address." });
                return;
              }
              treasErr.ok();
              patch({ treasuryWallet: treasuryPk || null });
            }}
            className="btn-acid rounded-full px-5 py-2 text-sm disabled:opacity-40"
          >
            Save treasury
          </button>
          <button type="button" disabled={busy} onClick={() => patch({ treasuryWallet: null })} className="btn-ghost rounded-full px-5 py-2 text-sm">
            Clear to env
          </button>
        </div>
        <p className="mt-3 font-mono text-[11px] text-mute">
          {data.treasurySet ? `Active ${shortPk(data.treasury, 6)}` : "No treasury — seats stay paper."}
          {data.durable ? ` · saves on ${data.durableKind}` : " · ephemeral disk — add Upstash Redis on Vercel or saves reset"}
        </p>
      </div>
    </div>
  );
}
