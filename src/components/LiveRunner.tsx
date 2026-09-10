"use client";

import { useEffect, useRef } from "react";
import { useMarket, useOwner } from "@/lib/hooks";
import { loadOwner, tradingPubkey } from "@/lib/wallet/trading";
import { executePendingIntent } from "@/lib/wallet/live";

/**
 * Always-on live executor. Phantom is only for connect + deposit.
 * Swaps are signed by the on-device trading wallet — no extra popup.
 */
export function LiveRunner() {
  const connected = useOwner();
  const owner = connected || (typeof window !== "undefined" ? loadOwner() : null);
  const { data } = useMarket(8000);
  const lock = useRef(false);
  const lastSig = useRef("");

  useEffect(() => {
    if (!owner) return;
    let stop = false;
    async function pulse() {
      if (stop || lock.current) return;
      try {
        const tpk = tradingPubkey();
        const a = await fetch(`/api/auto?owner=${owner}`).then((r) => r.json());
        if (a.auto?.mode !== "live" || a.paper?.killed) return;
        if (a.auto?.liveDelegate || a.liveDelegate) return;
        const intent = a.paper?.pendingIntent;
        if (!intent || intent.reason === lastSig.current) return;
        const solUsd = Number(data?.pair?.solUsd || data?.solUsd || 0);
        if (!(solUsd > 0)) return;
        lock.current = true;
        lastSig.current = intent.reason;
        await executePendingIntent({
          owner: owner!,
          intent,
          solUsd,
          spyxUsd: Number(data?.pair?.spyxUsd || data?.spyxUsd || 0),
          qqqxUsd: Number(data?.pair?.qqqxUsd || data?.qqqxUsd || 0),
          gldxUsd: Number(data?.pair?.gldxUsd || data?.gldxUsd || 0),
          holdings: a.paper?.pair,
          treasury: data?.treasury,
        });
        await fetch("/api/auto", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ owner, tradingPubkey: tpk }),
        });
      } catch {
        lastSig.current = "";
      } finally {
        lock.current = false;
      }
    }
    pulse();
    const id = setInterval(pulse, 8000);
    return () => {
      stop = true;
      clearInterval(id);
    };
  }, [owner, data?.pair?.solUsd, data?.solUsd, data?.treasury, data?.pair?.spyxUsd, data?.pair?.qqqxUsd, data?.pair?.gldxUsd, data?.spyxUsd, data?.qqqxUsd, data?.gldxUsd]);

  return null;
}
