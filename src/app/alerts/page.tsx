"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      const r = await fetch("/api/alerts");
      const j = await r.json();
      setAlerts(j.alerts || []);
    };
    load();
    const id = setInterval(load, 12000);
    return () => clearInterval(id);
  }, []);

  return (
    <main className="px-5 pb-24 md:px-8">
      <p className="font-mono text-[11px] tracking-[0.28em] text-violet">ALERTS</p>
      <h1 className="mt-2 font-display text-4xl text-ghost">When she would have bought</h1>
      <p className="mt-3 max-w-2xl text-mute">
        These are the pings. 0.15 SOL if you only want the email. The copy bot plan already includes them.
      </p>
      <div className="mt-6 flex gap-3">
        <Link href="/pricing" className="btn-acid inline-flex min-h-[44px] items-center rounded-full px-5 py-2 font-mono text-[11px]">
          Get alerts
        </Link>
        <a href="/api/alerts/preview" className="btn-ghost inline-flex min-h-[44px] items-center rounded-full px-5 py-2 font-mono text-[11px]">
          Preview email
        </a>
      </div>
      <div className="mt-8 space-y-3">
        {alerts.map((a) => (
          <div key={a.id} className="panel rounded-2xl p-5">
            <div className="flex justify-between gap-4">
              <div className="font-display text-2xl text-ghost">{a.title}</div>
              <div className="font-mono text-acid">SAFETY {a.score ?? "—"}</div>
            </div>
            <p className="mt-2 text-mute">{a.body}</p>
          </div>
        ))}
        {!alerts.length && <div className="panel rounded-2xl p-8 font-mono text-mute">Waiting on the next pulse.</div>}
      </div>
    </main>
  );
}
