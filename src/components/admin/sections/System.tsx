"use client";

import { useAdmin } from "../AdminProvider";
import { Row } from "../ui";

export function SystemSection() {
  const { data } = useAdmin();
  if (!data) return null;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="panel rounded-2xl p-5">
        <div className="font-mono text-[10px] tracking-[0.3em] text-mute">LOCKED DEFAULTS</div>
        <div className="mt-3 grid grid-cols-2 gap-2 font-mono text-[11px]">
          <Row k="Wait" v={`${data.locked.cooldownMin} min`} />
          <Row k="Clip" v={`${(data.locked.clipPct * 100).toFixed(0)}%`} />
          <Row k="Stop" v={`${(data.locked.stopPct * 100).toFixed(0)}%`} />
          <Row k="Home" v="USDC" />
          <Row k="Leverage" v="spot · opt SOL 2×/3×" />
          <Row k="Seat" v={`${data.seatSol} / ${data.seatSolLev} SOL`} />
          <Row k="Clip fee" v={`${data.protocolFeeBps} bps`} />
          <Row k="PnL" v="USDC" />
        </div>
      </div>
      <div className="panel rounded-2xl p-5">
        <div className="font-mono text-[10px] tracking-[0.3em] text-mute">AUDIT</div>
        <div className="mt-2 max-h-[28rem] space-y-2 overflow-auto">
          {data.audit.length === 0 && <p className="text-sm text-mute">No events yet.</p>}
          {data.audit.slice(0, 20).map((a) => (
            <div key={a.id} className="flex justify-between gap-3 font-mono text-[11px] text-mute">
              <span className="text-ghost">
                {a.action} · {a.detail}
              </span>
              <span>{new Date(a.at).toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
