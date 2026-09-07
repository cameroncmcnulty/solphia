"use client";

import { useEffect, useRef } from "react";
import { useOwner } from "@/lib/hooks";
import { loadOwner, tradingPubkey } from "@/lib/wallet/trading";
import { tryAutoRenew } from "@/lib/wallet/seatPay";

/**
 * While this site is open, collect the 0.1 SOL monthly seat from the on-device
 * trading wallet when a paid live seat is due. No Phantom popup.
 */
export function SeatRunner() {
  const connected = useOwner();
  const owner = connected || (typeof window !== "undefined" ? loadOwner() : null);
  const lock = useRef(false);

  useEffect(() => {
    if (!owner) return;
    let stop = false;
    async function pulse() {
      if (stop || lock.current) return;
      lock.current = true;
      try {
        try {
          await fetch("/api/auto", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ owner, tradingPubkey: tradingPubkey() }),
          });
        } catch {
          /* still try renew */
        }
        await tryAutoRenew(owner!);
      } catch {
        /* next pulse retries */
      } finally {
        lock.current = false;
      }
    }
    pulse();
    const id = setInterval(pulse, 60_000);
    return () => {
      stop = true;
      clearInterval(id);
    };
  }, [owner]);

  return null;
}
